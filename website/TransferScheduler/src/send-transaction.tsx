import React, { useState } from 'react';
import {
    useWaitForTransactionReceipt,
    useAccount,
} from 'wagmi';
import { types } from './ScheduledTransferTypedData';
import { signTypedData, writeContract, simulateContract, readContract } from '@wagmi/core';
import { config } from './wagmi';
import { abi } from './abi';
import { TransferSchedulerContractAddress } from './constants'

export function QueueTransferTransaction() {
    const { address, chainId } = useAccount();
    const [hash, setHash] = useState<`0x${string}` | undefined>();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const token = formData.get('token') as string;
        const to = formData.get('to') as string;
        const amount = BigInt(formData.get('amount') as string);
        const notBeforeDateInput = (e.target as HTMLFormElement).querySelector('input[name="notBeforeDate"]') as HTMLInputElement;
        const notAfterDateInput = (e.target as HTMLFormElement).querySelector('input[name="notAfterDate"]') as HTMLInputElement;
        const notBeforeDate = BigInt(notBeforeDateInput.dataset.timestamp || '0');
        const notAfterDate = BigInt(notAfterDateInput.dataset.timestamp || '0');
        const maxBaseFee = BigInt(formData.get('maxBaseFee') as string);

        if (!address) {
            setError(new Error('Address is required'));
            return;
        }
        setError(null);

        if (!notBeforeDate || !notAfterDate || !amount || !maxBaseFee || !chainId || !token || !to) {
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
            setError(new Error('Insufficient token allowance'));
            return;
        }
        // TODO: link to token allowance increase button
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
                    token: token,
                    to: to,
                    amount: amount,
                    spender: TransferSchedulerContractAddress,
                    maxBaseFee: maxBaseFee,
                    notBeforeDate: notBeforeDate,
                    notAfterDate: notAfterDate
                },
            });
            console.log('Signature:', signature);

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
            <label> Token: </label><input name="token" placeholder="(address)" style={{ width: '340px' }} required />
            <label> To: </label><input name="to" placeholder="(address)" style={{ width: '340px' }} required />
            <label> Amount: </label><input name="amount" type="number" placeholder="(18th decimal)" style={{ width: '100px' }} required />
            <label> MaxBaseFee: </label><input name="maxBaseFee" type="number" placeholder="(wei)" style={{ width: '100px' }} required />
            <div>
                <label> notBeforeDate: </label>
                <input
                    name="notBeforeDate"
                    type="datetime-local"
                    //TODO: get local timezone
                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(e) => {
                        const date = new Date(e.target.value);
                        const timestamp = Math.floor(date.getTime() / 1000);
                        e.target.dataset.timestamp = timestamp.toString();
                    }}
                    required
                />
                <label> notAfterDate: </label>
                <input
                    name="notAfterDate"
                    type="datetime-local"
                    //TODO: Make sure notAfterDate is after notBeforeDate
                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    onChange={(e) => {
                        const date = new Date(e.target.value);
                        const timestamp = Math.floor(date.getTime() / 1000);
                        e.target.dataset.timestamp = timestamp.toString();
                    }}
                    required
                />
            </div>
            <div><button disabled={isPending} type="submit">
                {isPending ? 'Confirming...' : ' Queue transfer on-chain'}
            </button></div>

            {hash && <div>Transaction hash: {hash}</div>}
            {isConfirming && <div>Waiting for confirmation...</div>}
            {isConfirmed && <div>Transaction confirmed.</div>}
            {error && <div>Error: {error.message}</div>}
        </form>
    );
}