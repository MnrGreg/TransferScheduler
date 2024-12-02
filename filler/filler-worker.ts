import Web3 from 'web3';
import * as fs from 'node:fs';

async function main() {

    const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
    const accounts = await web3.eth.getAccounts();
    const address = accounts[3];
    console.log(`ETH balance for address index 0:`, await web3.eth.getBalance(address));

    const transferSchedulerAddress = "0xF6168876932289D073567f347121A267095f3DD6";
    const transferSchedulerABI = JSON.parse(fs.readFileSync('../client/transferSchedulerABI.json', 'utf8'));
    const transferSchedulerContract = new web3.eth.Contract(transferSchedulerABI, transferSchedulerAddress);

    const subscription = await transferSchedulerContract.events.TransferScheduled({
        fromBlock: "latest"
    });

    subscription.on('data', async function (event) {
        const { owner, nonce, token, to, amount, earliest, deadline, maxBaseFee, signature } = event.returnValues;

        // TODO: Move to Temporal
        // TODO: call contract to check if [address][nonce].completed isn't already true

        if (deadline as number < Date.now()) {
            while (earliest as number > Date.now()) {
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            const tx = await transferSchedulerContract.methods.executeTransfer(owner, nonce, token, to, amount, earliest, deadline, maxBaseFee, signature).send({
                from: address
            });
            console.log("Transfer with permit tx sent:", tx.transactionHash);
        }
    });
}

main();
