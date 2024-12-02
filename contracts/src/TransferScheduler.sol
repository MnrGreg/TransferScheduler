// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

//import {ISignatureTransfer} from "permit2/src/interfaces/ISignatureTransfer.sol";
import {IPermit2, ISignatureTransfer} from "permit2/src/interfaces/IPermit2.sol";
import {SignatureTransfer} from "permit2/src/SignatureTransfer.sol";
import {Permit2} from "permit2/src/Permit2.sol";
import {PermitHash} from "permit2/src/libraries/PermitHash.sol";
import {SignatureVerification} from "permit2/src/libraries/SignatureVerification.sol";

contract TransferScheduler {
    SignatureTransfer public immutable PERMIT2;

    constructor(SignatureTransfer _permit) {
        PERMIT2 = _permit;
    }

    // * dApps can query the queue for a particular wallet address and show future transfers
    // * Fillers can query onchain
    mapping(address => mapping(uint256 => bool)) public transfers;
    mapping(address => uint256[]) public addressNonceIndices;

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
            token: 0x8ce361602B935680E8DeC218b820ff5056BeB7af,
            //token: 0x5991A2dF15A8F6A256D3Ec51E99254Cd3fb576A9, // MOCKERC20 Token1
            amount: maxBaseFee * 100000 * 2
        });

        ISignatureTransfer.SignatureTransferDetails[] memory transferDetails =
            new ISignatureTransfer.SignatureTransferDetails[](2);
        transferDetails[0] = ISignatureTransfer.SignatureTransferDetails({to: to, requestedAmount: amount});
        // Refund filler for transaction (100k gas usage) and add commission in gas
        transferDetails[1] =
            ISignatureTransfer.SignatureTransferDetails({to: msg.sender, requestedAmount: block.basefee * 100000 * 2});

        // console.log("start verifiy");
        // bytes32 hashed = PermitHash.hash(_permit);
        // SignatureVerification.verify(signature, hashed, owner);
        // console.log("end verifiy");

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
}
