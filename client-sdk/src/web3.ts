import { Web3, Eip712TypedData } from "web3";
import { TransferSchedulerContractAddress, transferSchedulerABI } from './constants';
import { ScheduledTransfer, TransferScheduledEventLog, QueuedTransferRecords, AddressNonceRecord, Status } from './types';

// Function to create typed data for Scheduled Transfer
export function createTypedData(
    chainId: number,
    scheduledTransfer: ScheduledTransfer
): Eip712TypedData {
    return {
        primaryType: 'ScheduledTransfer',
        domain: {
            name: 'TransferScheduler',
            version: '1',
            chainId: chainId,
            verifyingContract: TransferSchedulerContractAddress
        },
        types: {
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" }
            ],
            ScheduledTransfer: [
                { name: 'owner', type: 'address' },
                { name: 'nonce', type: 'uint96' },
                { name: 'token', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint128' },
                { name: 'spender', type: 'address' },
                { name: 'notBeforeDate', type: 'uint40' },
                { name: 'notAfterDate', type: 'uint40' },
                { name: 'maxBaseFee', type: 'uint40' },
            ]
        },
        message: scheduledTransfer
    };
}


export async function getGasTokenAddress(web3: Web3) {
    const scheduledTransferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);
    const gasTokenAddress: string = await scheduledTransferContract.methods.getRelayGasToken().call();
    return gasTokenAddress;
}

export async function getRelayCharge(web3: Web3, maxBaseFee: number) {
    const scheduledTransferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);
    const relayGasCommissionPercentage: bigint = await scheduledTransferContract.methods.getRelayGasCommissionPercentage().call();
    const relayGasUsage: bigint = await scheduledTransferContract.methods.relayGasUsage().call();
    const relayCharge = (maxBaseFee * Number(relayGasUsage) * (100 + Number(relayGasCommissionPercentage)) / 100);
    return relayCharge;
}

export async function fetchQueuedTransfers(web3: Web3, address: `0x${string}`, status: Status) {
    const scheduledTransferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);

    const transferScheduledEventLogs: TransferScheduledEventLog[] = [];
    try {
        const queuedTransferRecords: QueuedTransferRecords = await scheduledTransferContract.methods.getScheduledTransfers(address, status).call();

        for (let i = 0; i < queuedTransferRecords.length; i++) {
            const transfer = queuedTransferRecords[i];
            //const nonce = transfer.nonce.toString();
            const blockNumber = transfer.blockNumber.toString();
            const events = await scheduledTransferContract.getPastEvents('TransferScheduled', {
                filter: { owner: address },
                fromBlock: BigInt(blockNumber),
                toBlock: BigInt(blockNumber)
            });

            for (let event of events) {
                if (typeof event === 'object' && 'returnValues' in event) {
                    transferScheduledEventLogs.push(event.returnValues as TransferScheduledEventLog);
                }
            }
        }

    } catch (err: any) {
        console.error(err);
    }
    return transferScheduledEventLogs;
}

export async function queueScheduledTransfer(web3: Web3, scheduledTransfer: ScheduledTransfer, signature: string, from: string) {
    const scheduledTransferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);
    return await scheduledTransferContract.methods.queueScheduledTransfer(scheduledTransfer.owner,
        scheduledTransfer.nonce,
        scheduledTransfer.token,
        scheduledTransfer.to,
        scheduledTransfer.amount,
        scheduledTransfer.notBeforeDate,
        scheduledTransfer.notAfterDate,
        scheduledTransfer.maxBaseFee,
        signature).send({ from: from });
}

export async function getTransfers(web3: Web3, address: `0x${string}`, nonce: number) {
    const scheduledTransferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);
    const addressNonceRecord: AddressNonceRecord = await scheduledTransferContract.methods.transfers(address, nonce).call();
    return addressNonceRecord;
}