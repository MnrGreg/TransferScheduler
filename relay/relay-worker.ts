import Web3 from 'web3';
import * as fs from 'node:fs';
import { TransferSchedulerContractAddress } from '../client-sdk/constants'

async function main() {

    const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
    web3.eth.handleRevert = true;
    const accounts = await web3.eth.getAccounts();
    const address = accounts[3];
    console.log(`ETH balance for address index 0:`, await web3.eth.getBalance(address));

    const transferSchedulerABI = JSON.parse(fs.readFileSync('../client-sdk/transferSchedulerABI.json', 'utf8'));
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
            notBeforeDate: notBeforeDate,
            notAfterDate: notAfterDate,
            maxBaseFee: maxBaseFee,
        }
        // TODO: Move to Temporal
        // TODO: call contract to check if [address][nonce].completed isn't already true (if replaying old events)

        let currentTime = Math.floor(new Date().getTime() / 1000);
        if (currentTime < Number(notAfterDate)) {
            while (currentTime < Number(notBeforeDate)) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                currentTime = Math.floor(new Date().getTime() / 1000);
                console.log("Queued Transfer too early. Current Time:", currentTime, "NotBeforeDate:", notBeforeDate, "Nonce:", nonce, "waiting 10seconds...");
            }

            console.log("Queued Transfer ready. Nonce:", nonce);

            let isCallSuccessful = false;
            while (!isCallSuccessful) {
                try {
                    // Simulate contract execution with eth_call first
                    await transferSchedulerContract.methods.executeScheduledTransfer(ScheduledTransfer, signature).call({
                        from: address,
                        // maxPriorityFeePerGas: web3.utils.toHex(web3.utils.toWei('0.1', 'gwei')),
                        // maxFeePerGas: web3.utils.toHex(web3.utils.toWei('0.9', 'gwei')),
                    });
                    console.log('Contract simulation successful for Nonce:', nonce);
                    isCallSuccessful = true;
                } catch (error) {
                    console.log('Contract simulation failed:', error);
                    console.log('Waiting 1 minute before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 60000)); // Sleep for 1 minute
                }
            }

            //TODO: Fine tune max gas fee
            const tx = await transferSchedulerContract.methods.executeScheduledTransfer(ScheduledTransfer, signature).send({
                from: address,
            });
            console.log("Transfer executed for Nonce:", nonce, "TxHash:", tx.transactionHash);

        } else {
            console.log("Queued Transfer too late. Current Time:", currentTime, "NotAfterDate:", notAfterDate, "Nonce:", nonce);
        }
    });
}

main();
