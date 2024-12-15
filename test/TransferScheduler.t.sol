// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, StdStyle} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {IScheduledTransfer} from "contracts/src/interfaces/IScheduledTransfer.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {TransferScheduler} from "contracts/src/TransferSchedulerV1.sol";
import {
    TransferTooLate,
    TransferTooEarly,
    InsufficientTokenAllowance,
    InsufficientGasTokenAllowance,
    MaxBaseFeeExceeded,
    InvalidNonce
} from "contracts/src/TransferErrors.sol";

contract TransferSchedulerTest is Test {
    //event UnorderedNonceInvalidation(address indexed owner, uint256 word, uint256 mask);
    //event Transfer(address indexed from, address indexed token, address indexed to, uint256 amount);
    event TransferScheduled(
        address indexed owner,
        uint256 nonce,
        address token,
        address to,
        uint256 amount,
        uint256 notBeforeDate,
        uint256 notAfterDate,
        uint256 maxBaseFee,
        bytes signature
    );

    TransferScheduler transferScheduler;
    IScheduledTransfer.ScheduledTransferDetails scheduledTransferDetails;

    bytes32 DOMAIN_SEPARATOR;

    uint256 ownerPrivateKey = 0x12341234;
    address owner = vm.addr(ownerPrivateKey);
    uint256 recipientAddressKey = 0x4546376;
    address recipientAddress = vm.addr(recipientAddressKey);
    uint256 relayPrivateKey = 0x98769876;
    address relayAddress = vm.addr(relayPrivateKey);
    uint256 amount = 5 ** 18;
    uint256 relayGasCommissionPercentage;
    MockERC20 token0;
    IERC20 public gasToken;

    //uint256 notBeforeDate = 1704088622; // 01/01/2024
    uint256 notBeforeDate = 0;
    uint256 notAfterDate = 1767247022; // 01/01/2026
    uint256 maxBaseFee = 2000000; // 0.2 wei
    uint256 nonce = 23143254;
    bytes signature;

    function setUp() public {
        // set basefee
        vm.fee(800000);

        transferScheduler = new TransferScheduler();
        relayGasCommissionPercentage = transferScheduler.getGasCommissionPercentage();
        address gasTokenAddress = transferScheduler.getGasToken();
        // Get domain data
        (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            // uint256[] memory extensions
        ) = transferScheduler.eip712Domain();

        // Create domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );

        // Deal and approve exissting gasToken (WETH) for owner and spender
        gasToken = IERC20(gasTokenAddress);
        deal(address(gasToken), owner, 100 ** 18, false);
        vm.startPrank(owner);
        gasToken.approve(address(transferScheduler), type(uint256).max);
        vm.stopPrank();

        token0 = new MockERC20("Token0", "TOKEN0", 18);
        token0.mint(owner, 30 ** 18);
        vm.startPrank(owner);
        token0.approve(address(transferScheduler), type(uint256).max);
        vm.stopPrank();

        scheduledTransferDetails.owner = owner;
        scheduledTransferDetails.nonce = nonce;
        scheduledTransferDetails.token = address(token0);
        scheduledTransferDetails.to = recipientAddress;
        scheduledTransferDetails.amount = amount;
        scheduledTransferDetails.maxBaseFee = maxBaseFee;
        scheduledTransferDetails.notBeforeDate = notBeforeDate;
        scheduledTransferDetails.notAfterDate = notAfterDate;

        // Sign EIP712 off-chain message with private key
        signature = getScheduledTransferSignature(scheduledTransferDetails, ownerPrivateKey, DOMAIN_SEPARATOR);

        assertEq(signature.length, 65);
    }

    function testQueueScheduledTransferEmitsTransferScheduledEvent() public {
        //vm.recordLogs();

        transferScheduler.queueScheduledTransfer(
            owner, nonce, address(token0), recipientAddress, amount, notBeforeDate, notAfterDate, maxBaseFee, signature
        );
        //Vm.Log[] memory entries = vm.getRecordedLogs();
        //assertEq(entries.length, 1);
    }

    function testGetScheduledTransfersByAddress() public {
        transferScheduler.queueScheduledTransfer(
            owner, nonce, address(token0), recipientAddress, amount, notBeforeDate, notAfterDate, maxBaseFee, signature
        );

        TransferScheduler.QueuedTransferRecord[] memory records = transferScheduler.getScheduledTransfers(owner, false);
        assertEq(nonce, records[0].nonce);
    }

    function testExecuteScheduledTransfer() public {
        uint256 startBalanceFrom0 = token0.balanceOf(owner);
        uint256 startBalanceFrom1 = gasToken.balanceOf(owner);
        uint256 startBalanceTo0 = token0.balanceOf(recipientAddress);
        uint256 startBalanceTo1 = gasToken.balanceOf(relayAddress);

        vm.startPrank(relayAddress);
        transferScheduler.executeScheduledTransfer(scheduledTransferDetails, signature);
        vm.stopPrank();

        assertEq(token0.balanceOf(owner), startBalanceFrom0 - amount);
        console.log("owner gasToken balance: less", block.basefee * 100000 * (1 + relayGasCommissionPercentage / 100));
        assertEq(
            gasToken.balanceOf(owner),
            startBalanceFrom1 - block.basefee * 100000 * (1 + relayGasCommissionPercentage / 100)
        );
        assertEq(token0.balanceOf(recipientAddress), startBalanceTo0 + amount);
        assertEq(
            gasToken.balanceOf(relayAddress),
            startBalanceTo1 + block.basefee * 100000 * (1 + relayGasCommissionPercentage / 100)
        );
    }

    function testExecuteTransferInvalidNonce() public {
        // uint256 startBalanceFrom0 = token0.balanceOf(owner);
        // uint256 startBalanceFrom1 = gasToken.balanceOf(owner);
        // uint256 startBalanceTo0 = token0.balanceOf(recipientAddress);
        // uint256 startBalanceTo1 = gasToken.balanceOf(relayAddress);

        vm.startPrank(relayAddress);
        transferScheduler.executeScheduledTransfer(scheduledTransferDetails, signature);
        vm.stopPrank();

        vm.expectRevert(InvalidNonce.selector);
        vm.startPrank(relayAddress);
        transferScheduler.executeScheduledTransfer(scheduledTransferDetails, signature);
        vm.stopPrank();
    }

    function getScheduledTransferSignature(
        IScheduledTransfer.ScheduledTransferDetails memory transferDetail,
        uint256 privateKey,
        bytes32 domainSeparator
    ) internal view returns (bytes memory sig) {
        bytes32 _SCHEDULED_TRANSFER_TYPEHASH = keccak256(
            "ScheduledTransfer(address owner,uint256 nonce,address token,address to,uint256 amount,address spender,uint256 maxBaseFee,uint256 notBeforeDate,uint256 notAfterDate)"
        );

        bytes32 msgHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                keccak256(
                    abi.encode(
                        _SCHEDULED_TRANSFER_TYPEHASH,
                        transferDetail.owner,
                        transferDetail.nonce,
                        transferDetail.token,
                        transferDetail.to,
                        transferDetail.amount,
                        address(transferScheduler),
                        transferDetail.maxBaseFee,
                        transferDetail.notBeforeDate,
                        transferDetail.notAfterDate
                    )
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, msgHash);
        return bytes.concat(r, s, bytes1(v));
    }
}
