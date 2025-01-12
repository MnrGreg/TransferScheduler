// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV1.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract DeployScript is Script {
    function run() external returns (address, address) {
        vm.startBroadcast();

        // Deploy the upgradeable contract
        // Arbitrum WETH: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1    gasUsage: 800000
        // Base WETH: 0x4200000000000000000000000000000000000006    gasUsage: 380000
        // Ethereum Sepolia: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14    gasUsage: 380000
        // Polygon WPOL: 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 gasUsage: 380000
        address proxy = Upgrades.deployUUPSProxy(
            "TransferSchedulerV1.sol",
            abi.encodeCall(
                TransferSchedulerV1.initialize, (address(0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14), 50, 380000)
            )
        );

        // Get the implementation address
        address implementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (implementationAddress, proxy);
    }
}
