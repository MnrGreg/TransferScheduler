// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ISignatureTransfer} from "permit2/src/interfaces/ISignatureTransfer.sol";
//import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";
import {SignatureTransfer} from "permit2/src/SignatureTransfer.sol";
//import {Permit2} from "permit2/src/Permit2.sol";
//import {PermitHash} from "permit2/src/libraries/PermitHash.sol";
import {SignatureVerification} from "permit2/src/libraries/SignatureVerification.sol";

contract TransferScheduler {
    SignatureTransfer public immutable PERMIT2;

    constructor(SignatureTransfer _permit) {
        PERMIT2 = _permit;
    }

    // Permit2 public immutable PERMIT2;

    // constructor(Permit2 _permit) {
    //     PERMIT2 = _permit;
    // }

    // * dApps can query the queue for a particular wallet address and show future transfers
    // * Fillers can query onchain
    mapping(address => mapping(uint256 => bool)) public transfers;
    mapping(address => uint256[]) public addressNonceIndices;

    //address fillerGasToken = 0x8ce361602B935680E8DeC218b820ff5056BeB7af; // WETH
    address fillerGasToken = 0x5991A2dF15A8F6A256D3Ec51E99254Cd3fb576A9; // MOCKERC20 Token1
    uint256 fillerGasCommissionPercentage = 100;

    // emit event for fillers to discovery and schedule
    // ToDo: should nonces be indexed?
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

    // emit event for after succesful execution
    // ToDo: should nonces be indexed?
    event TransferExecuted(address indexed owner, uint256 nonce);

    // * Ability to track the state of the transfer through EVM storage [Optional]
    // ToDo: allow ownerto overwrite with same nonce to replace or nullify
    function queueTransfer(
        address _wallet,
        uint256 _nonce,
        address _token,
        address _to,
        uint256 _amount,
        uint256 _earliest,
        uint256 _deadline,
        uint256 _maxBaseFee,
        bytes calldata _signature
    ) public {
        // ToDo: check omit address _wallet from function and determine from signature

        transfers[_wallet][_nonce] = false;
        addressNonceIndices[_wallet].push(_nonce);

        emit TransferScheduled(_wallet, _nonce, _token, _to, _amount, _earliest, _deadline, _maxBaseFee, _signature);
    }

    // function to get the transfers of a particular wallet address
    function getTransfers(address _wallet, bool _completed) public view returns (uint256[] memory) {
        uint256[] memory nonceList;

        // get all nonces for the wallet
        uint256 count = 0;
        for (uint256 i = 0; i < addressNonceIndices[_wallet].length; i++) {
            if (transfers[_wallet][addressNonceIndices[_wallet][i]] == _completed) {
                count++;
            }
        }

        nonceList = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < addressNonceIndices[_wallet].length; i++) {
            if (transfers[_wallet][addressNonceIndices[_wallet][i]] == _completed) {
                nonceList[index] = addressNonceIndices[_wallet][i];
                index++;
            }
        }
        return nonceList;
    }

    function getGasCommissionPercentage() public view returns (uint256) {
        return fillerGasCommissionPercentage;
    }

    function getGasToken() public view returns (address) {
        return fillerGasToken;
    }

    function executeTransfer(
        address owner,
        uint256 nonce,
        address token,
        address to,
        uint256 amount,
        uint256 earliest,
        uint256 deadline,
        uint256 maxBaseFee,
        bytes calldata signature
    ) public {
        // ToDo: check difference between public and external
        // Evaluate witness earliest
        // Evaluate recipient address
        // ToDo: can fillters check available funds first?
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");
        require(earliest < block.timestamp, "PERMIT_TRANSFER_TOO_EARLY");
        require(maxBaseFee > block.basefee, "PERMIT_MAX_BASEFEE_EXCEEDED"); // ToDo: add to witness

        ISignatureTransfer.TokenPermissions[] memory permitted = new ISignatureTransfer.TokenPermissions[](2);
        permitted[0] = ISignatureTransfer.TokenPermissions({token: token, amount: amount});
        permitted[1] = ISignatureTransfer.TokenPermissions({
            token: fillerGasToken,
            amount: maxBaseFee * 100000 * (1 + fillerGasCommissionPercentage / 100)
        });

        ISignatureTransfer.SignatureTransferDetails[] memory transferDetails =
            new ISignatureTransfer.SignatureTransferDetails[](2);
        transferDetails[0] = ISignatureTransfer.SignatureTransferDetails({to: to, requestedAmount: amount});
        // Refund filler for transaction (100k gas usage) and add commission in gas
        transferDetails[1] = ISignatureTransfer.SignatureTransferDetails({
            to: msg.sender,
            requestedAmount: block.basefee * 100000 * (1 + fillerGasCommissionPercentage / 100)
        });

        // bytes32 hashed =
        //     hash(ISignatureTransfer.PermitBatchTransferFrom({permitted: permitted, nonce: nonce, deadline: deadline}));
        // SignatureVerification.verify(signature, hashed, owner);

        PERMIT2.permitTransferFrom(
            ISignatureTransfer.PermitBatchTransferFrom({permitted: permitted, nonce: nonce, deadline: deadline}),
            transferDetails,
            owner,
            // bytes32 witness,
            // string calldata witnessTypeString,
            signature
        );

        // If transfersByUser[owner] exists then set .completed status to true
        if (transfers[owner][nonce] == false) {
            transfers[owner][nonce] = true;
            emit TransferExecuted(owner, nonce); // ToDo: consider removing in place of fillers checking state - lots of historical transfers may add overhead
        }
    }

    // function hash(ISignatureTransfer.PermitBatchTransferFrom memory permit) internal view returns (bytes32) {
    //     uint256 numPermitted = permit.permitted.length;
    //     bytes32 _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH = keccak256(
    //         "PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)"
    //     );
    //     bytes32[] memory tokenPermissionHashes = new bytes32[](numPermitted);

    //     for (uint256 i = 0; i < numPermitted; ++i) {
    //         tokenPermissionHashes[i] = _hashTokenPermissions(permit.permitted[i]);
    //     }

    //     return keccak256(
    //         abi.encode(
    //             _PERMIT_BATCH_TRANSFER_FROM_TYPEHASH,
    //             keccak256(abi.encodePacked(tokenPermissionHashes)),
    //             address(this),
    //             permit.nonce,
    //             permit.deadline
    //         )
    //     );
    // }

    // function _hashTokenPermissions(ISignatureTransfer.TokenPermissions memory permitted)
    //     private
    //     pure
    //     returns (bytes32)
    // {
    //     bytes32 _TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)");

    //     return keccak256(abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permitted));
    // }
}
