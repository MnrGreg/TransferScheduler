import React from 'react';
import { useAccount } from 'wagmi';
import { readContract, simulateContract, writeContract } from '@wagmi/core';
import { config } from './wagmi';
import { TransferSchedulerContractAddress } from './constants';

interface TokenAllowanceRowProps {
    token: `0x${string}` | null;
    amount: bigint | null;
    label: string;
}

const TokenAllowanceRow = ({ token, amount, label }: TokenAllowanceRowProps) => {
    const { address: userAddress } = useAccount();
    const [allowance, setAllowance] = React.useState<bigint | null>(null);
    const [isPending, setIsPending] = React.useState(false);
    const [newAllowance, setNewAllowance] = React.useState('');
    const [decimals, setDecimals] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (!userAddress || !token) return;

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

    const handleApprove = async () => {
        if (!token || !newAllowance || decimals === null) return;

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
            console.log('Transaction Hash:', txHash);
        } catch (error) {
            console.error('Approval error:', error);
        } finally {
            setIsPending(false);
        }
    };

    const color = !allowance || !amount ? 'inherit'
        : allowance < amount ? 'red'
            : 'green';

    return (
        <tr style={{ border: '1px solid #ccc' }}>
            <td style={{ border: '1px solid #ccc', padding: '4px' }}>{label}</td>
            <td style={{ border: '1px solid #ccc', padding: '4px', color }}>
                {allowance === null ? '...' : formatAmount(allowance)}
            </td>
            <td style={{ border: '1px solid #ccc' }}>
                <input
                    type="text"
                    value={newAllowance}
                    onChange={(e) => setNewAllowance(e.target.value)}
                    placeholder="0.00"
                    style={{
                        width: '100px',
                        border: 'none',
                        padding: '4px',
                        fontSize: '14px',
                        backgroundColor: 'transparent'
                    }}
                />
            </td>
            <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isPending || !token || !newAllowance || decimals === null}
                    style={{
                        padding: '4px 4px',
                        fontSize: '14px'
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
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <h3>TransferScheduler Allowances</h3>
            <table style={{
                width: '500px',
                borderCollapse: 'collapse',
                border: '1px solid #ccc',
                fontSize: '14px',
                marginTop: '8px'
            }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>token</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>current allowance</th>
                        <th style={{ border: '1px solid #ccc', textAlign: 'left', padding: '4px' }}>increase allowance</th>
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
