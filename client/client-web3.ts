
import { Web3, Eip712TypedData, Eip712TypeDetails } from "web3"
import * as fs from 'node:fs';
import crypto from 'crypto';
import { TransferSchedulerContractAddress, fillerGasToken } from './constants'

async function main() {

  const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

  const chainId = await web3.eth.getChainId();
  console.log(`ChainID:`, chainId);

  const accounts = await web3.eth.getAccounts();
  console.log(`Wallet addresses:`, accounts);
  const owner = accounts[0];
  console.log(`ETH balance for accounts[0]:`, await web3.eth.getBalance(owner));

  // source ABI json content from file
  const transferSchedulerABI = JSON.parse(fs.readFileSync('transferSchedulerABI.json', 'utf8'));
  const transferContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);

  const token = "0x700b6A60ce7EaaEA56F065753d8dcB9653dbAD35"
  const token_ABI = [{ "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" }, { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" }, { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "nonces", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "permit", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }, { "name": "value", "type": "uint256", "internalType": "uint256" }, { "name": "deadline", "type": "uint256", "internalType": "uint256" }, { "name": "v", "type": "uint8", "internalType": "uint8" }, { "name": "r", "type": "bytes32", "internalType": "bytes32" }, { "name": "s", "type": "bytes32", "internalType": "bytes32" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }];
  const tokenContract = new web3.eth.Contract(token_ABI, token);
  let balance = await tokenContract.methods.balanceOf(owner).call();
  console.log(`Balance of tokenContract: ${balance}`);

  const fillerGasTokenABI = [{ "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" }, { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" }, { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "nonces", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "permit", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }, { "name": "value", "type": "uint256", "internalType": "uint256" }, { "name": "notAfterDate", "type": "uint256", "internalType": "uint256" }, { "name": "v", "type": "uint8", "internalType": "uint8" }, { "name": "r", "type": "bytes32", "internalType": "bytes32" }, { "name": "s", "type": "bytes32", "internalType": "bytes32" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }]
  const fillerGasTokenContract = new web3.eth.Contract(fillerGasTokenABI, fillerGasToken);
  balance = await fillerGasTokenContract.methods.balanceOf(owner).call();
  console.log(`Balance of fillerGasToken: ${balance}`);


  const amount = 5 * 10 ** 18;
  //const notBeforeDate = 1735711022  // 01/01/2025
  const notBeforeDate = 1704088622;    // 01/01/2024
  const notAfterDate = 1767247022;    // 01/01/2026
  const maxBaseFee = 150000;    // 0.2 wei
  const nonceBytes = crypto.randomBytes(6);
  //const nonce = BigInt('0x' + nonceBytes.toString('hex'));
  const nonce = 45873456724;

  //const fillerGasToken = // TODO: lookup from contract
  const fillerGasCommissionPercentage = 100;  // TODO: lookup from contract
  const relayCharge = maxBaseFee * 100000 * (1 + fillerGasCommissionPercentage / 100);

  let txid = await tokenContract.methods.approve(TransferSchedulerContractAddress, amount).send({
    from: owner
  });
  txid = await fillerGasTokenContract.methods.approve(TransferSchedulerContractAddress, relayCharge).send({
    from: owner
  });
  console.log(`Broadcasted approve transactions: ${txid.transactionHash}`);

  const ScheduledTransfer = {
    owner: owner,
    nonce: nonce,
    token: token,
    to: accounts[2],
    amount: amount,
    spender: TransferSchedulerContractAddress,
    maxBaseFee: maxBaseFee,
    notBeforeDate: notBeforeDate,
    notAfterDate: notAfterDate
  }

  const typedData: Eip712TypedData = {
    primaryType: 'ScheduledTransfer',
    domain: {
      name: 'TransferScheduler',
      version: '1',
      chainId: Number(chainId),
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
        { name: 'nonce', type: 'uint256' },
        { name: 'token', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'spender', type: 'address' },
        { name: 'maxBaseFee', type: 'uint256' },
        { name: 'notBeforeDate', type: 'uint256' },
        { name: 'notAfterDate', type: 'uint256' },
      ]
    },
    message: ScheduledTransfer
  };

  let signature = await web3.eth.signTypedData(owner, typedData);
  console.log('Signature:', signature);

  try {
    txid = await transferContract.methods.executeTransfer(ScheduledTransfer, signature).send({
      from: accounts[3]
    });
  } catch (error) {
    console.log(error);
  }
  console.log(`Broadcasted executeTransfer transaction: ${txid.transactionHash}`);

}

main();