import React, { useState } from 'react';
import {
    useWaitForTransactionReceipt,
    useAccount,
} from 'wagmi';
import { types } from './Permit2TypedData';
import { signTypedData, writeContract, simulateContract } from '@wagmi/core';
import { config } from './wagmi';
import { abi } from './abi';
import { TransferSchedulerContract, nativeTokenContract, permit2Contract } from './constants'

export function SendTransaction() {
    const { address, chainId } = useAccount();
    const [hash, setHash] = useState<`0x${string}` | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!address) {
            setError(new Error('Address is required'));
            return;
        }
        setError(null);

        const formData = new FormData(e.currentTarget);
        const token = formData.get('token') as `0x${string}`;
        const to = formData.get('to') as `0x${string}`;
        const earliestStr = formData.get('earliest') as string;
        const deadlineStr = formData.get('deadline') as string;
        const amountStr = formData.get('amount') as string;
        const maxBaseFeeStr = formData.get('maxBaseFee') as string;

        if (!earliestStr || !deadlineStr || !amountStr || !maxBaseFeeStr) {
            setError(new Error('All fields are required'));
            return;
        }

        const earliest = BigInt(earliestStr);
        const deadline = BigInt(deadlineStr);
        const amount = BigInt(amountStr) * BigInt(10 ** 18);
        const maxBaseFee = Number(maxBaseFeeStr);

        // TODO: Lookup relay fee (gas fee x1) from onchain contract
        const relayCharge = BigInt(maxBaseFee * 100000 * 2);

        // Use secure random number for nonce
        const array = new Uint8Array(8);
        window.crypto.getRandomValues(array);
        const nonceHex = Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
        const nonce = BigInt('0x' + nonceHex);
        //const nonce = BigInt(3233546564)

        try {
            const signature = await signTypedData(config, {
                domain: {
                    name: 'Permit2',
                    chainId: chainId,
                    verifyingContract: permit2Contract,
                },
                types,
                primaryType: 'PermitBatchTransferFrom',
                message: {
                    permitted: [
                        {
                            token: token,
                            amount: amount,
                        },
                        {
                            token: nativeTokenContract,
                            amount: relayCharge,
                        },
                    ],
                    spender: TransferSchedulerContract,
                    nonce: nonce,
                    deadline: deadline,
                },
            });
            console.log('Signature:', signature);

            setIsPending(true);

            const { request } = await simulateContract(config, {
                abi,
                address: TransferSchedulerContract,
                functionName: 'queueTransfer',
                args: [
                    address,
                    nonce,
                    token,
                    to,
                    amount,
                    earliest,
                    deadline,
                    BigInt(maxBaseFee),
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

    return (
        <form onSubmit={submit}>
            <input
                name="token"
                placeholder="Token Address (e.g., 0xA15BB66138824a1c7167f5E85b957d04Dd34E468)"
                required
            />
            <input name="to" placeholder="Recipient Address (e.g., 0xA0Cf…251e)" required />
            <input name="amount" type="number" placeholder="Amount" required />
            <input name="earliest" type="number" placeholder="Earliest Time (timestamp)" required />
            <input name="deadline" type="number" placeholder="Deadline (timestamp)" required />
            <input name="maxBaseFee" type="number" placeholder="Max Base Fee" required />
            <button disabled={isPending} type="submit">
                {isPending ? 'Confirming...' : 'Queue'}
            </button>
            <div>Filler fee: block.basefee * gas * 2</div>
            {hash && <div>Transaction Hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
            {error && <div>Error: {error.message}</div>}
        </form>
    );
}