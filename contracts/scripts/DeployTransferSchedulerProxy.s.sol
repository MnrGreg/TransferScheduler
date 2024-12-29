// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV3.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract DeployScript is Script {
    function run() external returns (address, address) {
        vm.startBroadcast();

        // Deploy the upgradeable contract
        address proxy = Upgrades.deployUUPSProxy(
            "TransferSchedulerV3.sol",
            abi.encodeCall(
                TransferSchedulerV3.initialize, (address(0x4200000000000000000000000000000000000006), 50, 380000)
            )
        );

        // Get the implementation address
        address implementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (implementationAddress, proxy);
    }
}
