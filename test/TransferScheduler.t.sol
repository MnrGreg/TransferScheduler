// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, StdStyle} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {ISignatureTransfer} from "permit2/src/interfaces/ISignatureTransfer.sol";
//import {InvalidNonce, SignatureExpired} from "permit2/src/PermitErrors.sol";
import {SignatureTransfer} from "permit2/src/SignatureTransfer.sol";
import {TokenProvider} from "./utils/TokenProvider.sol";

import {TransferScheduler} from "contracts/src/TransferScheduler.sol";

contract TransferSchedulerTest is Test, TokenProvider {
    //event UnorderedNonceInvalidation(address indexed owner, uint256 word, uint256 mask);
    //event Transfer(address indexed from, address indexed token, address indexed to, uint256 amount);
    event TransferScheduled(
        address indexed owner,
        uint256 nonce,
        address token,
        address to,
        uint256 amount,
        uint256 earliest,
        uint256 deadline,
        uint256 maxBaseFee,
        bytes signature
    );

    SignatureTransfer signatureTransfer;

    TransferScheduler transferScheduler;

    bytes32 DOMAIN_SEPARATOR;

    uint256 ownerPrivateKey = 0x12341234;
    address owner = vm.addr(ownerPrivateKey);
    uint256 recipientAddressKey = 0x4546376;
    address recipientAddress = vm.addr(recipientAddressKey);
    uint256 fillerPrivateKey = 0x98769876;
    address fillerAddress = vm.addr(fillerPrivateKey);
    uint256 amount = 5 ** 18;

    //uint256 earliest = 1704088622; // 01/01/2024
    uint256 earliest = 0;
    uint256 deadline = 1767247022; // 01/01/2026
    uint256 maxBaseFee = 2000000; // 0.2 wei
    uint256 nonce = 23143254;
    bytes signature;

    function setUp() public {
        signatureTransfer = new SignatureTransfer();
        transferScheduler = new TransferScheduler(signatureTransfer);
        DOMAIN_SEPARATOR = signatureTransfer.DOMAIN_SEPARATOR();

        // set basefee
        vm.fee(800000);

        initializeERC20Tokens();
        setERC20TestTokens(owner);
        setERC20TestTokenApprovals(vm, owner, address(signatureTransfer));

        // * definee the permitted token spender details
        ISignatureTransfer.TokenPermissions[] memory permitted = new ISignatureTransfer.TokenPermissions[](2);

        permitted[0] = ISignatureTransfer.TokenPermissions({token: address(token0), amount: amount});
        permitted[1] = ISignatureTransfer.TokenPermissions({token: address(token1), amount: maxBaseFee * 100000 * 2});

        ISignatureTransfer.PermitBatchTransferFrom memory permit =
            ISignatureTransfer.PermitBatchTransferFrom({permitted: permitted, nonce: nonce, deadline: deadline});

        // Sign EIP712 off-chain message with private key
        signature = getPermitBatchTransferSignature(permit, ownerPrivateKey, DOMAIN_SEPARATOR);

        assertEq(signature.length, 65);
    }

    function testQueueTransferEmitsTransferScheduled() public {
        //vm.recordLogs();

        transferScheduler.queueTransfer(
            owner, nonce, address(token0), recipientAddress, amount, earliest, deadline, maxBaseFee, signature
        );
        //Vm.Log[] memory entries = vm.getRecordedLogs();
        //assertEq(entries.length, 1);
    }

    function testGetTransfersByAddress() public {
        // ToDo: add batch transfers

        transferScheduler.queueTransfer(
            owner, nonce, address(token0), recipientAddress, amount, earliest, deadline, maxBaseFee, signature
        );

        uint256[] memory nonces = transferScheduler.getTransfers(owner, false);
        assertEq(nonce, nonces[0]);
    }

    function testExecuteTransfer() public {
        uint256 startBalanceFrom0 = token0.balanceOf(owner);
        uint256 startBalanceFrom1 = token1.balanceOf(owner);
        uint256 startBalanceTo0 = token0.balanceOf(recipientAddress);
        uint256 startBalanceTo1 = token1.balanceOf(fillerAddress);

        vm.startPrank(fillerAddress);
        transferScheduler.executeTransfer(
            owner, nonce, address(token0), recipientAddress, amount, earliest, deadline, maxBaseFee, signature
        );
        vm.stopPrank();

        assertEq(token0.balanceOf(owner), startBalanceFrom0 - amount);
        assertEq(token1.balanceOf(owner), startBalanceFrom1 - block.basefee * 100000 * 2);
        assertEq(token0.balanceOf(recipientAddress), startBalanceTo0 + amount);
        assertEq(token1.balanceOf(fillerAddress), startBalanceTo1 + block.basefee * 100000 * 2);
    }

    function getPermitBatchTransferSignature(
        ISignatureTransfer.PermitBatchTransferFrom memory permit,
        uint256 privateKey,
        bytes32 domainSeparator
    ) internal view returns (bytes memory sig) {
        bytes32 _TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");

        bytes32 _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
            "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
        );

        bytes32[] memory tokenPermissions = new bytes32[](permit.permitted.length);
        for (uint256 i = 0; i < permit.permitted.length; ++i) {
            tokenPermissions[i] = keccak256(abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted[i]));
        }
        bytes32 msgHash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                keccak256(
                    abi.encode(
                        _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
                        keccak256(abi.encodePacked(tokenPermissions)),
                        address(transferScheduler),
                        permit.nonce,
                        permit.deadline
                    )
                )
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, msgHash);
        return bytes.concat(r, s, bytes1(v));
    }

    // function testPermitBatchTransferMultiAddr() public {
    //     uint256 nonce = 0;
    //     // signed spender is address(this)
    //     address[] memory tokens = AddressBuilder.fill(1, address(token0)).push(address(token1));
    //     ISignatureTransfer.PermitBatchTransferFrom memory permit = defaultERC20PermitMultiple(tokens, nonce);
    //     bytes memory sig = getPermitBatchTransferSignature(permit, ownerPrivateKey, DOMAIN_SEPARATOR);

    //     uint256 startBalanceFrom0 = token0.balanceOf(from);
    //     uint256 startBalanceFrom1 = token1.balanceOf(from);
    //     uint256 startBalanceTo0 = token0.balanceOf(address(this));
    //     uint256 startBalanceTo1 = token1.balanceOf(address2);

    //     address[] memory to = AddressBuilder.fill(1, address(this)).push(address2);
    //     ISignatureTransfer.SignatureTransferDetails[] memory toAmountPairs =
    //         StructBuilder.fillSigTransferDetails(amount, to);
    //     permit2.permitTransferFrom(permit, toAmountPairs, from, sig);

    //     assertEq(token0.balanceOf(from), startBalanceFrom0 - amount);
    //     assertEq(token0.balanceOf(address(this)), startBalanceTo0 + amount);

    //     assertEq(token1.balanceOf(from), startBalanceFrom1 - amount);
    //     assertEq(token1.balanceOf(address2), startBalanceTo1 + amount);
    // }

    // function testGasMultiplePermitBatchTransferFrom() public {
    //     uint256 nonce = 0;
    //     address[] memory tokens = AddressBuilder.fill(1, address(token0)).push(address(token1)).push(address(token1));
    //     ISignatureTransfer.PermitBatchTransferFrom memory permit = defaultERC20PermitMultiple(tokens, nonce);
    //     bytes memory sig = getPermitBatchTransferSignature(permit, ownerPrivateKey, DOMAIN_SEPARATOR);

    //     address[] memory to = AddressBuilder.fill(2, address(address2)).push(address(this));
    //     ISignatureTransfer.SignatureTransferDetails[] memory toAmountPairs =
    //         StructBuilder.fillSigTransferDetails(amount, to);

    //     uint256 startBalanceFrom0 = token0.balanceOf(from);
    //     uint256 startBalanceFrom1 = token1.balanceOf(from);
    //     uint256 startBalanceTo0 = token0.balanceOf(address(address2));
    //     uint256 startBalanceTo1 = token1.balanceOf(address(address2));
    //     uint256 startBalanceToThis1 = token1.balanceOf(address(this));

    //     snapStart("permitBatchTransferFromMultipleTokens");
    //     permit2.permitTransferFrom(permit, toAmountPairs, from, sig);
    //     snapEnd();

    //     assertEq(token0.balanceOf(from), startBalanceFrom0 - amount);
    //     assertEq(token0.balanceOf(address2), startBalanceTo0 + amount);
    //     assertEq(token1.balanceOf(from), startBalanceFrom1 - 2 * amount);
    //     assertEq(token1.balanceOf(address2), startBalanceTo1 + amount);
    //     assertEq(token1.balanceOf(address(this)), startBalanceToThis1 + amount);
    // }

    // ToDo: add vm.fee baseFee test
}
