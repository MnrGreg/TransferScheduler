// https://github.com/alexbabits/permit2-example/blob/master/src/Permit2App.js
import { ethers, constants, Signer } from "ethers";
import {
  PERMIT2_ADDRESS,
  PermitBatchTransferFrom,
  //Witness,
  SignatureTransfer,
  MaxUint256,
  MaxSigDeadline
} from "@uniswap/permit2-sdk";
import * as fs from 'node:fs';
import { Uint256 } from "web3-types";
import crypto from 'crypto';

async function main() {

  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
  const accountSigner = provider.getSigner(0);
  const relaySigner = provider.getSigner(1);
  const toSigner = provider.getSigner(2);
  const owner = await accountSigner.getAddress()
  const to = toSigner.getAddress()
  const relay = relaySigner.getAddress()

  const token = "0xA15BB66138824a1c7167f5E85b957d04Dd34E468";
  const tokenApprovalABI = [
    { "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" },
    { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" },
    { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
    { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" },
    { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
    { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" },
    { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" },
    { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" },
    { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" },
    { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" },
    { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" },
    { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" },
    { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
    { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }
  ]
  const tokenContract = new ethers.Contract(token, tokenApprovalABI, accountSigner);

  const wethAddress = "0x8ce361602B935680E8DeC218b820ff5056BeB7af";
  const wethABI = [{ "type": "constructor", "inputs": [{ "name": "name", "type": "string", "internalType": "string" }, { "name": "symbol", "type": "string", "internalType": "string" }, { "name": "decimals", "type": "uint8", "internalType": "uint8" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }], "stateMutability": "view" }, { "type": "function", "name": "allowance", "inputs": [{ "name": "", "type": "address", "internalType": "address" }, { "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "approve", "inputs": [{ "name": "spender", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "balanceOf", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "decimals", "inputs": [], "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }], "stateMutability": "view" }, { "type": "function", "name": "mint", "inputs": [{ "name": "_to", "type": "address", "internalType": "address" }, { "name": "_amount", "type": "uint256", "internalType": "uint256" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "nonces", "inputs": [{ "name": "", "type": "address", "internalType": "address" }], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "permit", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }, { "name": "spender", "type": "address", "internalType": "address" }, { "name": "value", "type": "uint256", "internalType": "uint256" }, { "name": "deadline", "type": "uint256", "internalType": "uint256" }, { "name": "v", "type": "uint8", "internalType": "uint8" }, { "name": "r", "type": "bytes32", "internalType": "bytes32" }, { "name": "s", "type": "bytes32", "internalType": "bytes32" }], "outputs": [], "stateMutability": "nonpayable" }, { "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string", "internalType": "string" }], "stateMutability": "view" }, { "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }], "stateMutability": "view" }, { "type": "function", "name": "transfer", "inputs": [{ "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "function", "name": "transferFrom", "inputs": [{ "name": "from", "type": "address", "internalType": "address" }, { "name": "to", "type": "address", "internalType": "address" }, { "name": "amount", "type": "uint256", "internalType": "uint256" }], "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }], "stateMutability": "nonpayable" }, { "type": "event", "name": "Approval", "inputs": [{ "name": "owner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "spender", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }, { "type": "event", "name": "Transfer", "inputs": [{ "name": "from", "type": "address", "indexed": true, "internalType": "address" }, { "name": "to", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false }]
  const wethContract = new ethers.Contract(wethAddress, wethABI, accountSigner);


  // source ABI json content from file
  const transferSchedulerABI = JSON.parse(fs.readFileSync('transferSchedulerABI.json', 'utf8'));
  const transferSchedulerAddress = "0x6e989C01a3e3A94C973A62280a72EC335598490e";
  let transferSchedulerContract = new ethers.Contract(transferSchedulerAddress, transferSchedulerABI, relaySigner);

  const amount = ethers.utils.parseUnits("10", 18);

  const network = await provider.getNetwork();
  const chainId = network.chainId;
  console.log("ChainID:", chainId);

  console.log(`Wallet addresses:`, owner);
  //console.log(`Wallet ETH balace:`, await provider.getBalance(account));
  // const tokenBalance = 
  console.log(`Wallet ERC20 balance: ${await tokenContract.balanceOf(owner)}`);

  // async function approveContract(tokenContract) {
  //   const txid = await tokenContract.approve(PERMIT2_ADDRESS, MaxUint256);
  //   console.log(`Broadcasted approve transaction: ${txid.hash}`);
  // }

  // const permit2Allowance = await tokenContract.allowance(account, PERMIT2_ADDRESS)
  // console.log(`Permit2 ERC20 allowance: ${permit2Allowance}`);

  //const earliest = 1735711022  // 01/01/2025
  const earliest = 1704088622;    // 01/01/2024
  const deadline = 1767247022;    // 01/01/2026
  const maxBaseFee = 150000;    // 0.2 wei
  const nonceBytes = crypto.randomBytes(6);
  const nonce = BigInt('0x' + nonceBytes.toString('hex'));

  // console.log(hexNonce.toString());

  // const nonce = Math.floor(Math.random() * 1e15);

  const permit: PermitBatchTransferFrom = {
    permitted: [
      {
        token: token,
        amount: amount
      },
      {
        token: wethAddress,
        amount: maxBaseFee * 100000 * 2  // Gas Used * BaseFee * 2 (relay service fee)
      }
    ],
    spender: transferSchedulerAddress,  //SPcontract
    nonce: nonce,
    deadline: deadline
  };

  // const witness: Witness = {
  //   witnessTypeName: 'Witness',
  //   witnessType: { Witness: [{ name: 'user', type: 'address' }] },
  //   witness: { user: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  // }

  // Generate the permit return data & sign it
  const { domain, types, values } = SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, chainId);
  const signature = await accountSigner._signTypedData(domain, types, values);
  console.log("Signature:", signature);

  // ommit "owner" from queue and determine via signature
  // transferSchedulerContract = new ethers.Contract(transferSchedulerAddress, transferSchedulerABI, accountSigner);
  // const tx2 = await transferSchedulerContract.queueTransfer(owner, nonce, token, to, amount, earliest, deadline, maxBaseFee, signature);

  // console.log("Transfer queue tx sent:", tx2.hash);
  // await tx2.wait();

  // const nonces: Array<Uint256> = await transferSchedulerContract.getTransfers(owner, false);
  // for (let i = 0; i < nonces.length; i++) {
  //   console.log("Nonce:", nonces[i]);
  // }


  const tx = await transferSchedulerContract.executeTransfer(owner, nonce, token, to, amount, earliest, deadline, maxBaseFee, signature);
  console.log("Transfer with permit tx sent:", tx.hash);
  await tx.wait();

  // console.log(`Wallet ERC20 balance: ${await tokenContract.balanceOf(owner)}`);
  // console.log(`Recipeint ERC20 balance: ${await tokenContract.balanceOf(to)}`);
  // //console.log(`Relay ERC20 balance: ${await tokenContract.balanceOf(relay)}`);

  // console.log(`Wallet WETH balance: ${await wethContract.balanceOf(owner)}`);
  // console.log(`Relay WETH balance: ${await wethContract.balanceOf(relay)}`);

}

main();

// Wallet ERC20 balance: 750
// Recipeint ERC20 balance: 150
// Relay ERC20 balance: 50

// Wallet ERC20 balance: 685
// client-ethers.ts:113
// Recipeint ERC20 balance: 210
// client-ethers.ts:114
// Relay ERC20 balance: 55
// client-ethers.ts:115
// Wallet WETH balance: 54262644
// client-ethers.ts:117
// Relay WETH balance: 45737356