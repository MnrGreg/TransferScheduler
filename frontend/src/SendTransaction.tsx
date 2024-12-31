import React, { useState, useEffect } from 'react';
import {
    useWaitForTransactionReceipt,
    useAccount,
    useGasPrice,
} from 'wagmi';
import { types } from './ScheduledTransferTypedData';
import { signTypedData, writeContract, simulateContract, readContract } from '@wagmi/core';
import { config } from './wagmi';
import { TransferSchedulerContractAddress, transferSchedulerABI } from 'transfer-scheduler-sdk';
import { getTokenSymbol, getTokenDecimals } from './App';
import { formatGwei, formatEther, parseGwei } from 'viem'
import { TokenAllowances } from './TokenAllowances';

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
    const [amountInput, setAmountInput] = useState<string>(''); // Temporary state for input
    const [amount, setAmount] = useState<bigint | null>(null); // State for BigInt amount
    const { data: gasPrice } = useGasPrice();
    const [ethPrice, setEthPrice] = useState<number | null>(null);

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
                abi: transferSchedulerABI,
                address: TransferSchedulerContractAddress,
                functionName: 'getRelayGasToken',
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
                abi: transferSchedulerABI,
                address: TransferSchedulerContractAddress,
                functionName: 'getRelayGasCommissionPercentage',
            });
            setRelayGasCommissionPercentage(Number(percentage));
        } catch (err) {
            console.error('Error fetching relay gas commission percentage:', err);
        }
    };

    React.useEffect(() => {
        fetchRelayGasCommissionPercentage();
    }, []);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountInput(e.target.value); // Update the input value
    };

    const handleAmountBlur = async () => {
        const value = amountInput;
        // Validate and convert to BigInt
        if (value !== '' && token !== null) {
            const parsedValue = parseFloat(value);
            if (!isNaN(parsedValue)) {
                const decimals = await getTokenDecimals(token);
                setAmount(BigInt((parsedValue * Math.pow(10, decimals)).toString())); // Convert to BigInt with decimals
            } else {
                setAmount(null); // Reset if invalid
            }
        } else {
            setAmount(null); // Reset if empty
        }
    };

    const relayCommissionTotal = relayGasCommissionPercentage !== null && gasPrice !== undefined
        ? BigInt(380000) * (BigInt(100) + BigInt(relayGasCommissionPercentage)) * gasPrice / BigInt(100)
        : BigInt(0);

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tokenAddress = e.target.value as `0x${string}`;
        setToken(tokenAddress);
    };

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const token = formData.get('token') as `0x${string}`;
        const to = formData.get('to') as `0x${string}`;
        const amountStr = formData.get('amount') as string;
        const notBeforeDateInput = (event.currentTarget as HTMLFormElement).querySelector('input[name="notBefore"]') as HTMLInputElement;
        const notAfterDateInput = (event.currentTarget as HTMLFormElement).querySelector('input[name="notAfter"]') as HTMLInputElement;
        const notBeforeDate = Number(notBeforeDateInput.dataset.timestamp || '0');
        const notAfterDate = Number(notAfterDateInput.dataset.timestamp || '0');

        setError(null);

        // Get token decimals
        let tokenDecimals;
        try {
            tokenDecimals = await getTokenDecimals(token);
        } catch (error) {
            console.error('Error reading token decimals:', error);
            setError(new Error('Failed to read token decimals'));
            return;
        }

        // Parse amount using token decimals
        const amount = BigInt(Math.floor(Number(amountStr) * Math.pow(10, tokenDecimals)));

        if (!address) {
            setError(new Error('Address is required'));
            return;
        }

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
                abi: transferSchedulerABI,
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

    // TODO: Use relayGasTokenName address and chain ID to lookup price 
    useEffect(() => {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
        const options = { method: 'GET', headers: { accept: 'application/json' } };

        fetch(url, options)
            .then(res => res.json())
            .then(json => {
                const ethPrice = json.ethereum.usd;
                setEthPrice(ethPrice);
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <form onSubmit={submit} style={{ padding: '0px', maxWidth: '600px', margin: '0 auto', border: 'none' }}>
            <div style={{ marginBottom: '8px' }}>
                <label htmlFor="token" style={{ display: 'block', marginBottom: '8px' }}>Token:</label>
                <input
                    id="token"
                    name="token"
                    value={token || ''}
                    placeholder="Enter 0x token address"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    required
                    onChange={handleTokenChange}
                />
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label htmlFor="to" style={{ display: 'block', marginBottom: '8px' }}>To:</label>
                <input
                    id="to"
                    name="to"
                    placeholder="Enter 0x recipient address"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    required
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ width: '50%' }}>
                    <label htmlFor="amount" style={{ display: 'block', marginBottom: '8px' }}>Amount:</label>
                    <input
                        id="amount"
                        name="amount"
                        type="number"
                        value={amountInput}
                        placeholder="Enter amount"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        required
                        onChange={handleAmountChange}
                        onBlur={handleAmountBlur}
                    />
                </div>
                <div style={{ width: '50%' }}>
                    <label htmlFor="maxBaseFee" style={{ display: 'block', marginBottom: '8px' }}>Max Base Fee:</label>
                    <input
                        id="maxBaseFee"
                        name="maxBaseFee"
                        type="number"
                        value={maxBaseFee}
                        placeholder="Enter max base fee in gwei"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        required
                        onChange={(e) => setMaxBaseFee(e.target.value)}
                    />
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ width: '50%' }}>
                    <label htmlFor="notBefore" style={{ display: 'block', marginBottom: '8px' }}>Not Before:</label>
                    <input
                        id="notBefore"
                        name="notBefore"
                        type="datetime-local"
                        onChange={(e) => {
                            const date = new Date(e.target.value);
                            const timestamp = Math.floor(date.getTime() / 1000);
                            e.target.dataset.timestamp = timestamp.toString();
                        }}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        required
                    />
                </div>
                <div style={{ width: '50%' }}>
                    <label htmlFor="notAfter" style={{ display: 'block', marginBottom: '8px' }}>Not After:</label>
                    <input
                        id="notAfter"
                        name="notAfter"
                        type="datetime-local"
                        onChange={(e) => {
                            const date = new Date(e.target.value);
                            const timestamp = Math.floor(date.getTime() / 1000);
                            e.target.dataset.timestamp = timestamp.toString();
                        }}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                        required
                    />
                </div>
            </div>
            <button type="submit" style={{ width: '100%', fontSize: '0.875rem', padding: '12px', backgroundColor: '#007bff', color: '#fff', border: 'none' }} disabled={isPending}>
                {isPending ? 'Confirming...' : 'Sign and queue transfer onchain'}
            </button>
            <div style={{ marginBottom: '8px' }}>
                <span style={{ fontStyle: 'italic' }} title={`relay compensation = block.basefee * gas (380k) * relay commission (${relayGasCommissionPercentage}%)`}>* Relay compensation: {formatEther(relayCommissionTotal)} {relayGasTokenName} (${ethPrice && relayCommissionTotal ? (Number(formatEther(relayCommissionTotal)) * ethPrice).toFixed(2) : '0'} USD)</span>
            </div>
            {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error.message}</div>}
            {hash && <div>Transaction hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
            <TokenAllowances
                transferToken={token}
                transferAmount={amount}
                gasToken={relayGasToken}
                gasAmount={relayCommissionTotal}
            />
        </form >
    );
}