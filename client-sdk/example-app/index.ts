import { getRelayCharge, queueScheduledTransfer, getGasTokenAddress, fetchQueuedTransfers, createTypedData, TransferSchedulerContractAddress, TransferScheduledEventLog, ScheduledTransfer, Status } from 'transfer-scheduler-sdk';

import { Web3, Web3Context } from "web3"
import crypto from 'crypto';

const web3Context = new Web3Context('http://127.0.0.1:8545');
const web3 = new Web3(web3Context);

async function main() {

    const chainId = await web3.eth.getChainId();
    console.log(`ChainID:`, chainId);

    const accounts = await web3.eth.getAccounts();
    console.log(`Wallet addresses:`, accounts);
    const owner = accounts[0];
    console.log(`ETH balance for accounts[0]:`, await web3.eth.getBalance(owner));


    const token = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    const token_ABI = [{ "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" }, { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" }, { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "nonces", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "permit", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }, { "name": "value", "type": "uint256", "internalType": "uint256" }, { "name": "deadline", "type": "uint256", "internalType": "uint256" }, { "name": "v", "type": "uint8", "internalType": "uint8" }, { "name": "r", "type": "bytes32", "internalType": "bytes32" }, { "name": "s", "type": "bytes32", "internalType": "bytes32" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }];
    const tokenContract = new web3.eth.Contract(token_ABI, token);
    let balance = await tokenContract.methods.balanceOf(owner).call();
    console.log(`Balance of transfer token: ${balance}`);

    const gasTokenAddress = await getGasTokenAddress(web3);
    console.log(`Gas token address: ${gasTokenAddress}`);
    const gasTokenABI = [{ "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" }, { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" }, { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "nonces", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "permit", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }, { "name": "value", "type": "uint256", "internalType": "uint256" }, { "name": "notAfterDate", "type": "uint256", "internalType": "uint256" }, { "name": "v", "type": "uint8", "internalType": "uint8" }, { "name": "r", "type": "bytes32", "internalType": "bytes32" }, { "name": "s", "type": "bytes32", "internalType": "bytes32" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }];
    const gasTokenContract = new web3.eth.Contract(gasTokenABI, gasTokenAddress);
    balance = await gasTokenContract.methods.balanceOf(owner).call();
    console.log(`Balance of gasToken: ${balance}`);

    const amount = 5 ** 6;
    const notBeforeDate = Math.floor(new Date().getTime() / 1000) + 30; //current time + 30 seconds
    const notAfterDate = Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 7; //current time + 1 week
    const maxBaseFee = 10000000;
    const nonceBytes = crypto.randomBytes(6);
    const nonce = BigInt('0x' + nonceBytes.toString('hex'));

    const relayCharge = await getRelayCharge(web3, maxBaseFee);

    let txid = await tokenContract.methods.approve(TransferSchedulerContractAddress, amount * 100).send({
        from: owner
    });
    txid = await gasTokenContract.methods.approve(TransferSchedulerContractAddress, relayCharge * 100).send({
        from: owner
    });

    const scheduledTransfer: ScheduledTransfer = {
        owner: owner as `0x${string}`,
        nonce: Number(nonce),
        token: token,
        to: accounts[2] as `0x${string}`,
        amount: amount,
        spender: TransferSchedulerContractAddress,
        notBeforeDate: notBeforeDate,
        notAfterDate: notAfterDate,
        maxBaseFee: maxBaseFee,
    }

    const typedData = createTypedData(Number(chainId), scheduledTransfer);

    let signature = await web3.eth.signTypedData(owner, typedData);
    console.log('Signature:', signature);

    //Queue scheduled transfer
    try {
        let txid = await queueScheduledTransfer(
            web3,
            scheduledTransfer,
            signature,
            accounts[3],
        );
        console.log(`Broadcasted queueScheduledTransfer with Nonce: ${scheduledTransfer.nonce} -> ${txid.transactionHash}`);
    } catch (error) {
        throw (error);
    }

    const uncompletedTransfers: TransferScheduledEventLog[] = await fetchQueuedTransfers(web3, owner as `0x${string}`, Status.notCompleted);
    console.log('Uncompleted Transfers:');
    uncompletedTransfers.forEach((uncompletedTransfer) => {
        console.log(`Nonce: ${uncompletedTransfer.nonce} Token: ${uncompletedTransfer.token} -> ${uncompletedTransfer.to} (${uncompletedTransfer.amount})`);
    });

    const completedTransfers: TransferScheduledEventLog[] = await fetchQueuedTransfers(web3, owner as `0x${string}`, Status.completed);
    console.log('Completed Transfers:');
    completedTransfers.forEach((completedTransfer) => {
        console.log(`Nonce: ${completedTransfer.nonce} Token: ${completedTransfer.token} -> ${completedTransfer.to} (${completedTransfer.amount})`);
    });
}


main();