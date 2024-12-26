// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/TransferSchedulerV1.sol";
import "../src/TransferSchedulerV2.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract UpgradeScript is Script {
    function run() external returns (address, address) {
        vm.startBroadcast();

        address proxy = address(0xbB0b174A5459af5787a54C91EeB957cb9b14bc56);

        //opts.unsafeSkipAllChecks = true;
        Upgrades.upgradeProxy(
            proxy,
            "TransferSchedulerV2.sol:TransferSchedulerV2",
            abi.encodeCall(TransferSchedulerV2.initialize, (address(0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14), 100))
        );

        // Get the new implementation address
        address newImplementationAddress = Upgrades.getImplementationAddress(proxy);

        vm.stopBroadcast();

        return (newImplementationAddress, proxy);
    }
}
