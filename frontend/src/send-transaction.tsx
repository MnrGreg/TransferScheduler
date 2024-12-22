import React, { useState } from 'react';
import {
    useWaitForTransactionReceipt,
    useAccount,
    useGasPrice,
} from 'wagmi';
import { types } from './ScheduledTransferTypedData';
import { signTypedData, writeContract, simulateContract, readContract } from '@wagmi/core';
import { config } from './wagmi';
import { abi } from './abi';
import { TransferSchedulerContractAddress } from './constants'
import { getTokenSymbol } from './App';
import { formatGwei, formatEther, parseGwei, parseEther } from 'viem'

export function QueueTransferTransaction() {
    const { address, chainId } = useAccount();
    const [hash, setHash] = useState<`0x${string}` | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [maxBaseFee, setMaxBaseFee] = useState<string>('');
    const [relayGasToken, setRelayGasToken] = React.useState<`0x${string}` | null>(null);
    const [relayGasTokenName, setRelayGasTokenName] = React.useState<string>('');
    const [relayGasCommissionPercentage, setRelayGasCommissionPercentage] = useState<number | null>(null);
    const [token, setToken] = React.useState<`0x${string}` | null>(null);

    const { data: gasPrice } = useGasPrice();

    React.useEffect(() => {
        if (gasPrice) {
            setMaxBaseFee(formatGwei(gasPrice));
        }
    }, [gasPrice]);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const fetchRelayGasToken = async () => {
        try {
            const token = await readContract(config, {
                abi,
                address: TransferSchedulerContractAddress,
                functionName: 'getGasToken',
            }) as `0x${string}`;
            setRelayGasToken(token);

            if (token) {
                const tokenName = await getTokenSymbol(token);
                setRelayGasTokenName(tokenName);
            }
        } catch (err) {
            console.error('Error fetching relay gas token:', err);
        }
    };

    React.useEffect(() => {
        fetchRelayGasToken();
    }, []);

    const fetchRelayGasCommissionPercentage = async () => {
        try {
            const percentage = await readContract(config, {
                abi,
                address: TransferSchedulerContractAddress,
                functionName: 'getGasCommissionPercentage',
            });
            setRelayGasCommissionPercentage(Number(percentage));
        } catch (err) {
            console.error('Error fetching relay gas commission percentage:', err);
        }
    };

    React.useEffect(() => {
        fetchRelayGasCommissionPercentage();
    }, []);


    const relayCommissionTotal = relayGasCommissionPercentage !== null && gasPrice !== undefined
        ? BigInt(75000) * BigInt(relayGasCommissionPercentage) * gasPrice / BigInt(100)
        : BigInt(0);


    const GetScheduledTransferContractAllowance = ({ token, amount }: { token: `0x${string}` | null, amount: bigint | null }) => {
        const { address } = useAccount();
        const [allowance, setAllowance] = React.useState<bigint | null>(null);

        React.useEffect(() => {
            if (!address || !token) return;

            readContract(config, {
                abi: [{
                    name: 'allowance',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [
                        { name: 'owner', type: 'address' },
                        { name: 'spender', type: 'address' },
                    ],
                    outputs: [{ type: 'uint256' }],
                }],
                address: token,
                functionName: 'allowance',
                args: [address, TransferSchedulerContractAddress],
            })
                .then(setAllowance)
                .catch(console.error);
        }, [address, token]);

        const color = !allowance || !amount ? 'inherit'
            : allowance < amount ? 'red'
                : 'green';

        return <div style={{ color }}>{allowance ? formatEther(allowance) : 'Loading...'}</div>;
    };

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tokenAddress = e.target.value as `0x${string}`;
        setToken(tokenAddress);
    };

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const token = formData.get('token') as `0x${string}`;
        const to = formData.get('to') as `0x${string}`;
        const amount = parseEther(formData.get('amount') as string);
        const notBeforeDateInput = (e.target as HTMLFormElement).querySelector('input[name="notBeforeDate"]') as HTMLInputElement;
        const notAfterDateInput = (e.target as HTMLFormElement).querySelector('input[name="notAfterDate"]') as HTMLInputElement;
        const notBeforeDate = Number(notBeforeDateInput.dataset.timestamp || '0');
        const notAfterDate = Number(notAfterDateInput.dataset.timestamp || '0');

        if (!address) {
            setError(new Error('Address is required'));
            return;
        }
        setError(null);

        if (!notBeforeDate || !notAfterDate || !amount || !chainId || !token || !to) {
            setError(new Error('All fields are required'));
            return;
        }

        // Use secure random number for nonce
        const array = new Uint8Array(8);
        window.crypto.getRandomValues(array);
        const nonceHex = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
        const nonce = BigInt('0x' + nonceHex);

        // Check contract allowance for token
        const tokenAllowance = await readContract(config, {
            abi: [{
                name: 'allowance',
                type: 'function',
                stateMutability: 'view',
                inputs: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' },
                ],
                outputs: [{ type: 'uint256' }],
            }],
            address: token,
            functionName: 'allowance',
            args: [address, TransferSchedulerContractAddress],
        });

        if (tokenAllowance < amount) {
            setError(new Error(`Insufficient token allowance for spender: ${TransferSchedulerContractAddress}`));
            return;
        }
        // TODO: link to token allowance increase button
        try {
            const signature = await signTypedData(config, {
                domain: {
                    name: 'TransferSchedulerV1',
                    version: '1',
                    chainId: BigInt(chainId),
                    verifyingContract: TransferSchedulerContractAddress,
                },
                types,
                primaryType: 'ScheduledTransfer',
                message: {
                    owner: address,
                    nonce: nonce,
                    token: token,
                    to: to,
                    amount: amount,
                    spender: TransferSchedulerContractAddress,
                    notBeforeDate: notBeforeDate,
                    notAfterDate: notAfterDate,
                    maxBaseFee: Number(parseGwei(maxBaseFee)),
                },
            });
            setIsPending(true);

            const { request } = await simulateContract(config, {
                abi,
                address: TransferSchedulerContractAddress,
                functionName: 'queueScheduledTransfer',
                args: [
                    address,
                    nonce,
                    token,
                    to,
                    amount,
                    notBeforeDate,
                    notAfterDate,
                    Number(parseGwei(maxBaseFee)),
                    signature,
                ],
                type: 'eip1559',
            });

            const txHash = await writeContract(config, request);
            console.log('Transaction Hash:', txHash);
            setHash(txHash);
        } catch (err: any) {
            console.error(err);
            setError(err);
        } finally {
            setIsPending(false);
        }
    }

    //            
    return (
        <form onSubmit={submit}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc', fontSize: '14px' }}>
                <tbody>
                    <tr>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>token</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>amount</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>allowance</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>to</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>max Base Fee (gwei)</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>not Before Date</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>not After Date</th>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                type="text"
                                name="token"
                                placeholder="0x..."
                                style={{ width: '330px', padding: '8px', fontSize: '14px', border: 'none' }}
                                onChange={handleTokenChange}
                                required
                            />
                        </td>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                name="amount"
                                type="number"
                                placeholder="0.00"
                                style={{ width: '100px', border: 'none', padding: '8px', fontSize: '14px' }}
                                required
                            />
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                            <GetScheduledTransferContractAllowance token={token} amount={parseEther('0')} />
                        </td>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                name="to"
                                placeholder="(address)"
                                style={{ width: '330px', border: 'none', padding: '8px', fontSize: '14px' }}
                                required
                            />
                        </td>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                name="maxBaseFee"
                                type="number"
                                placeholder="gwei"
                                style={{ width: '100px', border: 'none', padding: '8px', fontSize: '14px' }}
                                required
                                onChange={(e) => setMaxBaseFee(e.target.value)}
                                value={maxBaseFee}
                            />
                        </td>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                name="notBeforeDate"
                                type="datetime-local"
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    const timestamp = Math.floor(date.getTime() / 1000);
                                    e.target.dataset.timestamp = timestamp.toString();
                                }}
                                style={{ border: 'none', padding: '4px', fontSize: '12px' }}
                                required
                            />
                        </td>
                        <td style={{ border: '1px solid #ccc' }}>
                            <input
                                name="notAfterDate"
                                type="datetime-local"
                                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                onChange={(e) => {
                                    const date = new Date(e.target.value);
                                    const timestamp = Math.floor(date.getTime() / 1000);
                                    e.target.dataset.timestamp = timestamp.toString();
                                }}
                                style={{ border: 'none', padding: '4px', fontSize: '12px' }}
                                required
                            />
                        </td>
                    </tr>
                    <tr>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                            <span title={relayGasToken || ''} style={{ fontSize: '14px' }}>
                                {relayGasTokenName || 'Not set'}
                            </span>
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>&lt; {formatEther(relayCommissionTotal)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                            <GetScheduledTransferContractAllowance token={relayGasToken} amount={relayCommissionTotal} />
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>relay fee = block.basefee * gas (75k) * relay commission ({relayGasCommissionPercentage}%)</td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                            {maxBaseFee ? `${maxBaseFee}` : '-'}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>-</td>
                        <td style={{ border: '1px solid #ccc', padding: '8px' }}>-</td>
                    </tr>
                </tbody>
            </table>

            <div style={{ marginTop: '16px' }}>
                <button disabled={isPending} type="submit">
                    {isPending ? 'Confirming...' : 'Queue transfer on-chain'}
                </button>
            </div>

            {hash && <div>Transaction hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
            {error && <div>Error: {error.message}</div>}
        </form>

    );
}