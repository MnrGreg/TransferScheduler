// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV1.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract DeployScript is Script {
    function run() external returns (address, address) {
        vm.startBroadcast();

        // Deploy the upgradeable contract
        address proxy = Upgrades.deployUUPSProxy(
            "TransferSchedulerV1.sol",
            abi.encodeCall(TransferSchedulerV1.initialize, (address(0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14), 100))
        );

        // Get the implementation address
        address implementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (implementationAddress, proxy);
    }
}
