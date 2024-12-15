// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV1.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract DeployScript is Script {
    function run() external returns (address, address) {
        //we need to declare the sender's private key here to sign the deploy transaction
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the upgradeable contract
        address proxy = Upgrades.deployUUPSProxy(
            "TransferSchedulerV1.sol", abi.encodeCall(TransferScheduler.initialize, (msg.sender))
        );

        // Get the implementation address
        address implementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (implementationAddress, proxy);
    }
}
