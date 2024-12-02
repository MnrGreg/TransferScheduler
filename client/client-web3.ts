
//import  from "web3";
import { Web3, Eip712TypedData, Eip712TypeDetails } from "web3"
import {
  PERMIT2_ADDRESS,
  PermitTransferFrom,
  //Witness,
  SignatureTransfer,
  MaxUint256,
  MaxSigDeadline
} from "@uniswap/permit2-sdk";

async function main() {

  const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));

  const chainId = await web3.eth.getChainId();
  console.log(`ChainID:`, chainId);

  const accounts = await web3.eth.getAccounts();
  console.log(`Wallet addresses:`, accounts);

  console.log(`Initial ETH balance for address_index 0:`, await web3.eth.getBalance(accounts[0]));

  const TransferSchedulerAddress = "0x663F3ad617193148711d28f5334eE4Ed07016602"
  const MockERC20 = "0xA15BB66138824a1c7167f5E85b957d04Dd34E468"
  const MockERC20_ABI = [
    {"type": "constructor", "inputs": [{"name": "name", "type": "string", "internalType": "string"}, {"name": "symbol", "type": "string", "internalType": "string"}, {"name": "decimals", "type": "uint8", "internalType": "uint8"}], "stateMutability": "nonpayable"},
    {"type": "function", "name": "DOMAIN_SEPARATOR", "inputs": [], "outputs": [{"name": "", "type": "bytes32", "internalType": "bytes32"}], "stateMutability": "view"},
    {"type": "function", "name": "allowance", "inputs": [{"name": "", "type": "address", "internalType": "address"}, {"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "approve", "inputs": [{"name": "spender", "type": "address", "internalType": "address"}, {"name": "amount", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "nonpayable"},
    {"type": "function", "name": "balanceOf", "inputs": [{"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "decimals", "inputs": [], "outputs": [{"name": "", "type": "uint8", "internalType": "uint8"}], "stateMutability": "view"},
    {"type": "function", "name": "mint", "inputs": [{"name": "_to", "type": "address", "internalType": "address"}, {"name": "_amount", "type": "uint256", "internalType": "uint256"}], "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "name", "inputs": [], "outputs": [{"name": "", "type": "string", "internalType": "string"}], "stateMutability": "view"},
    {"type": "function", "name": "nonces", "inputs": [{"name": "", "type": "address", "internalType": "address"}], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "permit", "inputs": [{"name": "owner", "type": "address", "internalType": "address"}, {"name": "spender", "type": "address", "internalType": "address"}, {"name": "value", "type": "uint256", "internalType": "uint256"}, {"name": "deadline", "type": "uint256", "internalType": "uint256"}, {"name": "v", "type": "uint8", "internalType": "uint8"}, {"name": "r", "type": "bytes32", "internalType": "bytes32"}, {"name": "s", "type": "bytes32", "internalType": "bytes32"}], "outputs": [], "stateMutability": "nonpayable"},
    {"type": "function", "name": "symbol", "inputs": [], "outputs": [{"name": "", "type": "string", "internalType": "string"}], "stateMutability": "view"},
    {"type": "function", "name": "totalSupply", "inputs": [], "outputs": [{"name": "", "type": "uint256", "internalType": "uint256"}], "stateMutability": "view"},
    {"type": "function", "name": "transfer", "inputs": [{"name": "to", "type": "address", "internalType": "address"}, {"name": "amount", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "nonpayable"},
    {"type": "function", "name": "transferFrom", "inputs": [{"name": "from", "type": "address", "internalType": "address"}, {"name": "to", "type": "address", "internalType": "address"}, {"name": "amount", "type": "uint256", "internalType": "uint256"}], "outputs": [{"name": "", "type": "bool", "internalType": "bool"}], "stateMutability": "nonpayable"},
    {"type": "event", "name": "Approval", "inputs": [{"name": "owner", "type": "address", "indexed": true, "internalType": "address"}, {"name": "spender", "type": "address", "indexed": true, "internalType": "address"}, {"name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false},
    {"type": "event", "name": "Transfer", "inputs": [{"name": "from", "type": "address", "indexed": true, "internalType": "address"}, {"name": "to", "type": "address", "indexed": true, "internalType": "address"}, {"name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256"}], "anonymous": false}
  ]

  const owner = accounts[0];
  const erc20 = new web3.eth.Contract(MockERC20_ABI, MockERC20);
  const erc0balance = await erc20.methods.balanceOf(owner).call();

  console.log(`Balance of ERC20: ${erc0balance}`);
  const txid = await erc20.methods.approve(PERMIT2_ADDRESS, 100000000).send({
    from: owner
  });
  console.log(`Broadcasted approve transaction: ${txid.transactionHash}`);

  const permit: PermitTransferFrom = {
    permitted: {
        token: MockERC20,
        amount: 50
    },
    spender: TransferSchedulerAddress,  //SPcontract
    nonce: 1,
    deadline: 10000000
  };

  const transferDetails: SignatureTransfer = {
    to: accounts[1],
    amount: 50
  }

  // const witness: Witness = {
  //   witnessTypeName: 'Witness',
  //   witnessType: { Witness: [{ name: 'user', type: 'address' }] },
  //   witness: { user: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },    // anvil address 1
  // }

  const typedData: Eip712TypedData = {
    primaryType: 'PermitTransferFrom',
    domain: {
      name: 'Permit2',
      chainId: 31337,
      verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "verifyingContract", type: "address" }
      ],
      PermitTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ],
      TokenPermissions: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    },
    message: {
      permitted: { token: '0xA15BB66138824a1c7167f5E85b957d04Dd34E468', amount: 50 },
      spender: '0x663F3ad617193148711d28f5334eE4Ed07016602',
      nonce: 1,
      deadline: 10000000
    }
  };



  //const { domain, types, values } = SignatureTransfer.getPermitData(permit, PERMIT2_ADDRESS, Number(chainId));
  // const mydomain = domain as Record<string, string | number>;
  // let mytypes = types as Record<string, Eip712TypeDetails[]>;

  // mytypes['EIP712Domain'] = [
  //   { name: 'name', type: 'string' },
  //   { name: 'version', type: 'string' },
  //   { name: 'verifyingContract', type: "address" }
  // ]

  // const mytypes: Record<string, Array<Eip712TypeDetails>> = types as Record<string, Array<{ name: string; type: string }>>;

  // for (const key in types) {
  //   mytypes[key] = mytypes[key] as Array<{ name: string; type: string }>;
  //   let entry: Eip712TypeDetails[] = [];
  // }


  //const data = SignatureTransfer.hash(permit, PERMIT2_ADDRESS, Number(chainId)); //, witness);

  let signature = await web3.eth.signTypedData(accounts[0], typedData);

  const TransferSchedulerABI = [{"type":"constructor","inputs":[{"name":"_permit","type":"address","internalType":"contract ISignatureTransfer"}],"stateMutability":"nonpayable"},{"type":"function","name":"PERMIT2","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract ISignatureTransfer"}],"stateMutability":"view"},{"type":"function","name":"scheduleTransfer","inputs":[{"name":"permit","type":"tuple","internalType":"struct ISignatureTransfer.PermitTransferFrom","components":[{"name":"permitted","type":"tuple","internalType":"struct ISignatureTransfer.TokenPermissions","components":[{"name":"token","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"}]},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"deadline","type":"uint256","internalType":"uint256"}]},{"name":"transferDetails","type":"tuple","internalType":"struct ISignatureTransfer.SignatureTransferDetails","components":[{"name":"to","type":"address","internalType":"address"},{"name":"requestedAmount","type":"uint256","internalType":"uint256"}]},{"name":"owner","type":"address","internalType":"address"},{"name":"signature","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"}]
  
  const transferContract = new web3.eth.Contract(TransferSchedulerABI, TransferSchedulerAddress);

  const txid2 = await transferContract.methods.scheduleTransfer(permit, transferDetails, owner, signature).send({
    from: accounts[2]
  });
  console.log(`Broadcasted approve transaction: ${txid2.transactionHash}`);


}

main();