"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueScheduledTransfer = exports.fetchQueuedTransfers = exports.getRelayCharge = exports.getGasTokenAddress = exports.createTypedData = void 0;
const constants_1 = require("./constants");
// Function to create typed data for Scheduled Transfer
function createTypedData(chainId, scheduledTransfer) {
    return {
        primaryType: 'ScheduledTransfer',
        domain: {
            name: 'TransferSchedulerV1',
            version: '1',
            chainId: chainId,
            verifyingContract: constants_1.TransferSchedulerContractAddress
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
exports.createTypedData = createTypedData;
async function getGasTokenAddress(web3) {
    const scheduledTransferContract = new web3.eth.Contract(constants_1.transferSchedulerABI, constants_1.TransferSchedulerContractAddress);
    const gasTokenAddress = await scheduledTransferContract.methods.getGasToken().call();
    return gasTokenAddress;
}
exports.getGasTokenAddress = getGasTokenAddress;
async function getRelayCharge(web3, maxBaseFee) {
    const scheduledTransferContract = new web3.eth.Contract(constants_1.transferSchedulerABI, constants_1.TransferSchedulerContractAddress);
    const gasCommissionPercentage = await scheduledTransferContract.methods.getGasCommissionPercentage().call();
    const relayCharge = maxBaseFee * 140000 * (1 + Number(gasCommissionPercentage) / 100);
    return relayCharge;
}
exports.getRelayCharge = getRelayCharge;
async function fetchQueuedTransfers(web3, address, status) {
    const scheduledTransferContract = new web3.eth.Contract(constants_1.transferSchedulerABI, constants_1.TransferSchedulerContractAddress);
    const transferScheduledEventLogs = [];
    try {
        const queuedTransferRecords = await scheduledTransferContract.methods.getScheduledTransfers(address, status).call();
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
                    transferScheduledEventLogs.push(event.returnValues);
                }
            }
        }
    }
    catch (err) {
        console.error(err);
    }
    return transferScheduledEventLogs;
}
exports.fetchQueuedTransfers = fetchQueuedTransfers;
async function queueScheduledTransfer(web3, scheduledTransfer, signature, from) {
    const scheduledTransferContract = new web3.eth.Contract(constants_1.transferSchedulerABI, constants_1.TransferSchedulerContractAddress);
    return await scheduledTransferContract.methods.queueScheduledTransfer(scheduledTransfer.owner, scheduledTransfer.nonce, scheduledTransfer.token, scheduledTransfer.to, scheduledTransfer.amount, scheduledTransfer.notBeforeDate, scheduledTransfer.notAfterDate, scheduledTransfer.maxBaseFee, signature).send({ from: from });
}
exports.queueScheduledTransfer = queueScheduledTransfer;
//# sourceMappingURL=web3.js.map