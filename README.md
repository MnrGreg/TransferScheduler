# TransferScheduler Contract

## Overview
The TransferScheduler is a public-good smart contract to facilitate scheduled ERC20 token transfers on Ethereum blockchains. It allows users to queue transfers that will be executed at a specified future time, ensuring that transactions occur automatically without the need for manual intervention. This offers:

- **Better Capital Efficiency**: Users retain control of their ERC20 tokens until the scheduled transaction date, allowing them to accrue interest and rewards or utilize funds for other purposes in the interim.
- **Onchain Transparency**: Senders and Recipients can view upcoming transfers directly on the blockchain, enhancing financial transparency.
- **Convenience**: This allows users to plan and automate payments, improving convenience. Ideal for routine payments, such as remittances, DAO disbursements, and small business payroll.

## Features
- **Non-Monotonic Nonces**: Allows for non-sequential scheduling of transactions at arbitrary points in time, independent of previous transactions.
- **Transfer Restrictions**: `notBeforeDate` and `notAfterDate` dates ensure that transfers are only executed within the valid time frame. `block.timestamp` is used for comparison.
- **Relayer Gas Compensation**: The contract [compensates](./contracts/src/TransferSchedulerV4.sol#L214-L219) relayers for their ETH gas spend in WETH. An additional gas percentage commission is added to compensate relayers for their `MaxPriorityFeePerGas` tip, compute costs, and opportunity costs.
  - The gas compensation is calculated as `block.basefee * 140000 (gas usage) * (100 + relayGasCommissionPercentage) / 100`.
  - `relayGasCommissionPercentage` is initialized at contract deployment for each chain (50% on Base Mainnet).
  - The WETH payment to the relayer is included automatically as part of the contract transfer.
  - If insufficient WETH is available, the relayer will not broadcast the transaction.
- **Gas Price Threshold**: Transfers will not execute if the network gas price `block.basefee` is higher than the user specified threshold `maxBaseFee`.
- **Offchain queuing**: ScheduledTransfer signed messages can be provided directly to recipients or third party relays for offchain queuing, thereby avoid onchain queueing gas cost (70k gas).

## Frontend video on Base Mainnet
[![TransferScheduler frontend on Base Mainnet](https://img.youtube.com/vi/K4cCaMCihhc/0.jpg)](https://youtu.be/K4cCaMCihhc)

## Components
### Smart Contract
The core functionality is implemented in the TransferScheduler smart contract, which includes methods for:
- Queuing signed scheduled transfers (address, nonce, nonce status) - 70k gas
- [Verifies](./contracts/src/TransferSchedulerV4.sol#L179) the user [EIP712 ScheduledTransfer typed message signature](./client-sdk/src/web3.ts#L9-L10)
- Executing scheduled transfers - 130k gas with EOA | 380k gas with Smart Account
- [Retrieving](./contracts/src/TransferSchedulerV4.sol#L153) the [relay gas token](./contracts/src/TransferSchedulerV4.sol#L29)
- [Retrieving](./contracts/src/TransferSchedulerV4.sol#L143) the [relay gas usage](./contracts/src/TransferSchedulerV4.sol#L29)
- [Retrieving](./contracts/src/TransferSchedulerV4.sol#L148) the [relay gas commission percentage](./contracts/src/TransferSchedulerV4.sol#L29)

### Frontend
The frontend provides an example user interface for:
- Creating, signing and queuing scheduled transfers
- Increasing allowance for the transfer token and relay gas token
- Watching for TransferScheduled events
- Listing historical completed or future uncompleted transfers

An demo example is published at [https://mnrgreg.github.io/TransferScheduler/](https://mnrgreg.github.io/TransferScheduler/) which uses the [Base Mainnet](https://basescan.org/address/0x9A49A57903B1D001353e521f9236F19EC54d3143#readContract) and [Arbitrum Mainnet](https://arbiscan.io/address/0xb04d39444c401e33C4B8b107E49AC53DdE17ddAc#readContract) with `WETH` as the relay gas token.

### Client SDK
The client SDK provides a JavaScript library for interacting with the TransferScheduler contract. It includes functions for:
- Queuing a signed scheduled transfer.
- Watching for TransferScheduled events.
- Types for creating and signing scheduled transfers.

### Relay Worker
A basic reference implementation that is responsible for:
- Listening for events.
- Persisting event entries to a local queue.
- Evaluating all transfer restrictions before executing.
- Executing the transfer with a pre-signed signature.


## Types
```typescript
// EIP712 Typed Message for Scheduled Transfers
primaryType: 'ScheduledTransfer',
domain: {
    name: 'TransferSchedulerV1',
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
}
```

<!-- 
## Usage
### Running the Relay Worker
To start the relay worker, run:
```bash
cd relay
RPC_URL=ws://localhost:8545 PRIVATE_KEY=<your-private-key> ts-node relay-worker.ts
```

### Deploying the Contract
To deploy the TransferScheduler contract, use the following command:
```bash
forge script contracts/scripts/DeployTransferSchedulerProxy.s.sol --broadcast --rpc-url <your-rpc-url>
``` -->

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
