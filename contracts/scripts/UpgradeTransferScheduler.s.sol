// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV1.sol";
import "../src/TransferSchedulerV2.sol";
import {Upgrades, Options} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract UpgradeScript is Script {
    function run() external returns (address, address) {
        vm.startBroadcast();

        address proxy = address(0xBa551D945d9d4f14F7F6abc9abd26BD2684fA940);

        Options memory opts;
        opts.referenceContract = "TransferSchedulerV1.sol:TransferSchedulerV1";

        Upgrades.upgradeProxy(
            proxy,
            "TransferSchedulerV2.sol:TransferSchedulerV2",
            abi.encodeCall(
                TransferSchedulerV2.initialize,
                (address(0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14), 50, 380000) // Specify the WETH address for chain
            ),
            opts
        );

        // Get the new implementation address
        address newImplementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (newImplementationAddress, proxy);
    }
}
