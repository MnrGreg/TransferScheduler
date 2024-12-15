import Web3 from 'web3';
import * as fs from 'node:fs';
import { TransferSchedulerContractAddress } from '../client/constants'

async function main() {

    const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
    const accounts = await web3.eth.getAccounts();
    const address = accounts[3];
    console.log(`ETH balance for address index 0:`, await web3.eth.getBalance(address));

    const transferSchedulerABI = JSON.parse(fs.readFileSync('../client/transferSchedulerABI.json', 'utf8'));
    const transferSchedulerContract = new web3.eth.Contract(transferSchedulerABI, TransferSchedulerContractAddress);

    const subscription = await transferSchedulerContract.events.TransferScheduled({
        fromBlock: "latest"
    });

    subscription.on('data', async function (event) {
        const { owner, nonce, token, to, amount, notBeforeDate, notAfterDate, maxBaseFee, signature } = event.returnValues;

        const ScheduledTransfer = {
            owner: owner,
            nonce: nonce,
            token: token,
            to: to,
            amount: amount,
            spender: TransferSchedulerContractAddress,
            maxBaseFee: maxBaseFee,
            notBeforeDate: notBeforeDate,
            notAfterDate: notAfterDate
        }
        // TODO: Move to Temporal
        // TODO: call contract to check if [address][nonce].completed isn't already true (if replaying old events)
        // TODO: eth_call to check result prior to broadcast
        // TODO: check address balances before sending (avoid revert)
        // TODO: check signature/owner
        // TODO: check maxBaseFee
        let currentTime = Math.floor(new Date().getTime() / 1000);
        if (currentTime < Number(notAfterDate)) {
            while (currentTime < Number(notBeforeDate)) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentTime = Math.floor(new Date().getTime() / 1000);
                console.log("Queued Transfer too early. Current Time:", currentTime, "NotBeforeDate:", notBeforeDate, "Nonce:", nonce, "waiting 10seconds...");
            }

            console.log("Queued Transfer ready. Nonce:", nonce);
            const tx = await transferSchedulerContract.methods.executeScheduledTransfer(ScheduledTransfer, signature).send({
                from: address
            });

            console.log("Transfer tx executed:", tx.transactionHash);
        } else {
            console.log("Transfer expired. Nonce:", nonce, "Current Time:", currentTime, "notAfterDate:", notAfterDate);
        }
    });
}

main();
