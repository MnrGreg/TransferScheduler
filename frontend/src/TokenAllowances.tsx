import React from 'react';
import { useAccount } from 'wagmi';
import { readContract, simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { config } from './wagmi';
import { TransferSchedulerContractAddress } from '@mnrgreg/transfer-scheduler-sdk';
import { getTokenSymbol } from './App';

interface TokenAllowanceRowProps {
    token: `0x${string}` | null;
    amount: bigint | null;
    label: string;
}

const TokenAllowanceRow = ({ token, amount, label }: TokenAllowanceRowProps) => {
    const { address: userAddress } = useAccount();
    const [allowance, setAllowance] = React.useState<bigint | null>(null);
    const [balance, setBalance] = React.useState<bigint | null>(null);
    const [symbol, setSymbol] = React.useState<string | null>(null);
    const [isPending, setIsPending] = React.useState(false);
    const [newAllowance, setNewAllowance] = React.useState('');
    const [decimals, setDecimals] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!userAddress || !token) return;

        // Fetch token symbol
        getTokenSymbol(token)
            .then(setSymbol)
            .catch(console.error);

        // Read token decimals
        readContract(config, {
            abi: [{
                name: 'decimals',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ type: 'uint8' }],
            }],
            address: token,
            functionName: 'decimals',
        })
            .then(setDecimals)
            .catch(console.error);

        // Fetch token balance
        readContract(config, {
            abi: [{
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'account', type: 'address' }],
                outputs: [{ type: 'uint256' }],
            }],
            address: token,
            functionName: 'balanceOf',
            args: [userAddress],
        })
            .then(setBalance)
            .catch(console.error);

        // Read token allowance
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
            args: [userAddress, TransferSchedulerContractAddress],
        })
            .then(setAllowance)
            .catch(console.error);
    }, [userAddress, token]);

    const formatAmount = (amount: bigint) => {
        if (decimals === null) return '...';
        return (Number(amount) / Math.pow(10, decimals)).toString();
    };

    const parseAmount = (amount: string): bigint => {
        if (decimals === null) throw new Error('Token decimals not loaded');
        return BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)));
    };

    // Execute token approval
    const handleApprove = async () => {
        if (!token || !newAllowance || !userAddress || decimals === null) return;

        const parsedAmount = parseAmount(newAllowance);
        setIsPending(true);
        try {
            const { request } = await simulateContract(config, {
                abi: [{
                    name: 'approve',
                    type: 'function',
                    stateMutability: 'nonpayable',
                    inputs: [
                        { name: 'spender', type: 'address' },
                        { name: 'amount', type: 'uint256' },
                    ],
                    outputs: [{ type: 'bool' }],
                }],
                address: token,
                functionName: 'approve',
                args: [TransferSchedulerContractAddress, parsedAmount],
            });
            const txHash = await writeContract(config, request);
            console.log('Approval Transaction Hash:', txHash);

            // Wait for the transaction receipt
            const transactionReceipt = await waitForTransactionReceipt(config, {
                hash: txHash,
            });
            if (transactionReceipt.status === "success") {
                // Transaction was successful
                const updatedAllowance = await readContract(config, {
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
                    args: [userAddress, TransferSchedulerContractAddress],
                });
                setAllowance(updatedAllowance);
            } else {
                console.error('Transaction failed:', txHash);
            }
        } catch (error) {
            console.error('Approval error:', error);
        } finally {
            setIsPending(false);
        }
    };

    const color = !amount ? 'inherit'
        : !allowance || allowance < amount ? 'red'
            : 'green';

    return (
        <tr style={{ border: '1px solid #ccc' }}>
            <td style={{ border: '1px solid #ccc', padding: '4px' }} title={label}>{symbol === null ? '...' : symbol}</td>
            <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                {balance === null ? '...' : formatAmount(balance)}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px', color: color }}>
                {allowance === null ? '...' : formatAmount(allowance)}
            </td>
            <td style={{ border: '1px solid #ccc', padding: '0px' }}>
                <input
                    type="text"
                    value={newAllowance}
                    onChange={(e) => setNewAllowance(e.target.value)}
                    placeholder="0.00"
                    style={{
                        border: '1px solid #ccc',
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: '0.6rem',
                        padding: '3px',
                        cursor: 'text'
                    }}
                />
            </td>
            <td style={{ border: '1px solid #ccc', padding: '0px', textAlign: 'center' }}>
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isPending || !token || !newAllowance || decimals === null}
                    style={{
                        padding: '0px',
                        width: '100%',
                        fontSize: '0.6rem'
                    }}
                >
                    {isPending ? 'Approving...' : 'Approve'}
                </button>
            </td>
        </tr>
    );
};

export function TokenAllowances({
    transferToken,
    transferAmount,
    gasToken,
    gasAmount
}: {
    transferToken: `0x${string}` | null;
    transferAmount: bigint | null;
    gasToken: `0x${string}` | null;
    gasAmount: bigint | null;
}) {
    return (
        <div style={{ marginTop: '16px', padding: '0px', marginBottom: '16px', margin: '0 auto', border: 'none', textAlign: 'left', maxWidth: '600px' }}>
            <h3 style={{ fontSize: '0.875rem' }}>TransferScheduler Allowances</h3>
            <table style={{
                borderCollapse: 'collapse',
                border: 'none',
                fontSize: '0.6rem',
                width: '100%'
            }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>token symbol</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>balance</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>current<br /> allowance</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>increase<br /> allowance</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>action</th>
                    </tr>
                </thead>
                <tbody>
                    <TokenAllowanceRow
                        token={transferToken}
                        amount={transferAmount}
                        label="Transfer Token"
                    />
                    <TokenAllowanceRow
                        token={gasToken}
                        amount={gasAmount}
                        label="Relay Gas Token"
                    />
                </tbody>
            </table>
        </div>
    );
}
