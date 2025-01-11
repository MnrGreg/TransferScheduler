import React, { useState, useEffect } from 'react';
import {
    useWaitForTransactionReceipt,
    useAccount,
} from 'wagmi';
import { types } from './ScheduledTransferTypedData';
import { signTypedData, writeContract, simulateContract, readContract, getFeeHistory, getEnsAddress, getEnsName } from '@wagmi/core';
import { config, mainnetConfig } from './wagmi';
import { TransferSchedulerContractAddress, transferSchedulerABI } from '@mnrgreg/transfer-scheduler-sdk';
import { getTokenSymbol, getTokenDecimals } from './App';
import { formatGwei, formatEther, parseGwei } from 'viem'
import { TokenAllowances } from './TokenAllowances';

interface Token {
    contractAddress: string;
    // Add other properties if needed
}

export function QueueTransferTransaction() {
    const { address, chainId } = useAccount();
    const [hash, setHash] = useState<`0x${string}` | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [maxBaseFee, setMaxBaseFee] = useState<string>('');
    const [relayGasToken, setRelayGasToken] = React.useState<`0x${string}` | null>(null);
    const [relayGasTokenName, setRelayGasTokenName] = React.useState<string>('');
    const [relayGasCommissionPercentage, setRelayGasCommissionPercentage] = useState<number | null>(null);
    const [relayGasUsage, setRelayGasUsage] = useState<number | null>(null);
    const [tokens, setTokens] = useState<{ name: string; address: string }[]>([]);
    const [selectedToken, setSelectedToken] = useState('');
    const [amountInput, setAmountInput] = useState<string>(''); // Temporary state for input
    const [amount, setAmount] = useState<bigint | null>(null); // State for BigInt amount
    const [ethPrice, setEthPrice] = useState<number | null>(null);
    const [to, setTo] = React.useState<string>('');
    const [resolvedName, setResolvedName] = React.useState<string | null>(null);
    const [resolvedAddress, setResolvedAddress] = React.useState<string | null>(null);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    const fetchMaxBaseFee = async () => {
        try {
            const feeHistory = await getFeeHistory(config, {
                blockCount: 1024,
                rewardPercentiles: [90]
            })
            const sortedBaseFees = feeHistory.baseFeePerGas.map(BigInt).sort((a, b) => Number(a) - Number(b));
            const index90thPercentile = Math.floor(sortedBaseFees.length * 0.9) - 1; // 0-based index
            setMaxBaseFee(formatGwei(sortedBaseFees[index90thPercentile]));
        } catch (err) {
            console.error('Error fetching max base fee history:', err);
        }
    };

    React.useEffect(() => {
        fetchMaxBaseFee();
    }, []);

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

    const fetchRelayGasUsage = async () => {
        try {
            const usage = await readContract(config, {
                abi: transferSchedulerABI,
                address: TransferSchedulerContractAddress,
                functionName: 'getRelayGasUsage',
            });
            setRelayGasUsage(usage);

        } catch (err) {
            console.error('Error fetching relay gas usage:', err);
        }
    };

    React.useEffect(() => {
        fetchRelayGasUsage();
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

    const fetchTokens = async () => {
        // TODO check if Alchemy has a lookup endpoint
        let hostname = '';
        if (chainId === 8453) {
            hostname = 'base-mainnet.g.alchemy.com';
        } else if (chainId === 42161) {
            hostname = 'arb-mainnet.g.alchemy.com';
        } else if (chainId === 137) {
            hostname = 'polygon-mainnet.g.alchemy.com';
        } else if (chainId === 11155111) {
            hostname = 'eth-sepolia.g.alchemy.com';
        }

        const url = `https://${hostname}/v2/FRtsWQk6EQltAZCVFgjCV3ZGgniMT5L9`;
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        const body = JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "alchemy_getTokenBalances",
            params: [address, "erc20"]
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: body
            });
            const data = await response.json();

            const tokenList = await Promise.all(data.result.tokenBalances.map(async (token: Token) => ({
                name: await getTokenSymbol(token.contractAddress as `0x${string}`),
                address: token.contractAddress
            })));
            setTokens(tokenList);
        } catch (error) {
            console.error('Error fetching tokens:', error);
        }
    };

    React.useEffect(() => {
        fetchTokens();
    }, [address]);

    const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedToken(event.target.value);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmountInput(e.target.value); // Update the input value
    };

    const handleAmountBlur = async () => {
        const value = amountInput;
        // Validate and convert to BigInt
        if (value !== '' && selectedToken !== '') {
            const parsedValue = parseFloat(value);
            if (!isNaN(parsedValue)) {
                const decimals = await getTokenDecimals(selectedToken as `0x${string}`);
                setAmount(BigInt((parsedValue * Math.pow(10, decimals)).toString())); // Convert to BigInt with decimals
            } else {
                setAmount(null); // Reset if invalid
            }
        } else {
            setAmount(null); // Reset if empty
        }
    };

    const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        //setTo(value);

        // Check if the input is an ENS name or an address
        if (value.includes('.eth')) {
            // Input is likely an ENS name
            const ensAddress = await getEnsAddress(mainnetConfig, { name: value });
            if (!ensAddress) {
                setResolvedName(null);
                setResolvedAddress(null);
                return;
            }
            setResolvedAddress(ensAddress);
            setResolvedName(value);
            setTo(ensAddress);
        } else {
            // Input is likely an address
            const ensName = await getEnsName(mainnetConfig, { address: value as `0x${string}` });
            if (!ensName) {
                setResolvedName(null);
                setResolvedAddress(null);
                return;
            }
            setResolvedName(ensName);
            setResolvedAddress(value);
            setTo(value);
        }
    };

    const relayCommissionTotal = relayGasCommissionPercentage !== null && maxBaseFee !== undefined && relayGasUsage !== null
        ? BigInt(relayGasUsage) * (BigInt(100) + BigInt(relayGasCommissionPercentage)) * BigInt(parseGwei(maxBaseFee)) / BigInt(100)
        : BigInt(0);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const notBeforeDateInput = (event.currentTarget as HTMLFormElement).querySelector('input[name="notBefore"]') as HTMLInputElement;
        const notAfterDateInput = (event.currentTarget as HTMLFormElement).querySelector('input[name="notAfter"]') as HTMLInputElement;
        const notBeforeDate = Number(notBeforeDateInput.dataset.timestamp || '0');
        const notAfterDate = Number(notAfterDateInput.dataset.timestamp || '0');

        setError(null);

        // Get token decimals
        let tokenDecimals;
        try {
            tokenDecimals = await getTokenDecimals(selectedToken as `0x${string}`);
        } catch (error) {
            console.error('Error reading token decimals:', error);
            setError(new Error('Failed to read token decimals'));
            return;
        }

        // Parse amount using token decimals
        const amount = BigInt(Math.floor(Number(amountInput) * Math.pow(10, tokenDecimals)));

        if (!address) {
            setError(new Error('Address is required'));
            return;
        }

        if (!notBeforeDate || !notAfterDate || !amount || !chainId || !selectedToken || !to) {
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
            address: selectedToken as `0x${string}`,
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
                    name: 'TransferScheduler',
                    version: '1',
                    chainId: BigInt(chainId),
                    verifyingContract: TransferSchedulerContractAddress,
                },
                types,
                primaryType: 'ScheduledTransfer',
                message: {
                    owner: address,
                    nonce: nonce,
                    token: selectedToken as `0x${string}`,
                    to: to as `0x${string}`,
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
                    selectedToken as `0x${string}`,
                    to as `0x${string}`,
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
                <select
                    id="token"
                    name="token"
                    value={selectedToken}
                    onChange={handleTokenChange}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    required
                >
                    <option value="">Select a token</option>
                    {tokens.map(token => (
                        <option key={token.address} value={token.address}>{token.name} - {token.address}</option>
                    ))}
                </select>
            </div>
            <div style={{ marginBottom: '8px' }}>
                <label htmlFor="to" style={{ display: 'block', marginBottom: '8px' }}>To:</label>
                <input
                    id="to"
                    name="to"
                    placeholder="Enter recipient's ENS or 0x address"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    required
                    value={resolvedName ? `${resolvedName} - ${resolvedAddress}` : to}
                    onChange={(event) => {
                        const value = event.target.value;
                        setTo(value); // Update the 'to' state with user input
                        handleInputChange(event); // Call your existing input change handler
                    }}
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
                    <label htmlFor="maxBaseFee" style={{ display: 'block', marginBottom: '8px' }}>
                        Max Base Fee:
                        <span style={{ marginLeft: '5px', cursor: 'pointer' }} title="Set the Max Base Fee for your transaction. It won't execute if the network's future block.basefee exceeds this limit. The current p90 Base Fee is shown below and can change significantly, so consider adding extra headroom to ensure execution.">&#9432;</span>
                    </label>
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
                            const timestamp = Math.floor((date.getTime() + 31536000000) / 1000);   // Current date + 1 year
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
                <span style={{ fontStyle: 'italic' }} title={`relay compensation = block.basefee (${maxBaseFee}) * gas (${relayGasUsage}) * relay commission (${relayGasCommissionPercentage}%)`}>* Relay compensation: {formatEther(relayCommissionTotal)} {relayGasTokenName} ({ethPrice && relayCommissionTotal ? (Number(formatEther(relayCommissionTotal)) * ethPrice).toFixed(2) : '0'} USD)</span>
            </div>
            {error && <div style={{ color: 'red', marginBottom: '8px' }}>{error.message}</div>}
            {hash && <div>Transaction hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
            <TokenAllowances
                transferToken={selectedToken as `0x${string}`}
                transferAmount={amount}
                gasToken={relayGasToken}
                gasAmount={relayCommissionTotal}
            />
        </form >
    );
}