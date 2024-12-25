// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IScheduledTransfer} from "./interfaces/IScheduledTransfer.sol";

import {ScheduledTransferHash} from "./libraries/ScheduledTransferHash.sol";
import {SignatureVerification} from "permit2/src/libraries/SignatureVerification.sol";
import {
    TransferTooLate,
    TransferTooEarly,
    InsufficientTokenAllowance,
    InsufficientGasTokenAllowance,
    MaxBaseFeeExceeded,
    InvalidNonce
} from "./TransferErrors.sol";

import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/src/utils/SafeTransferLib.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TransferSchedulerV1 is IScheduledTransfer, EIP712Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    using SignatureVerification for bytes;
    using SafeTransferLib for ERC20;
    using ScheduledTransferHash for ScheduledTransferDetails;

    address relayGasToken;
    uint8 relayGasCommissionPercentage;

    // The initialize function will be used to set up the initial state of the contract.
    function initialize(address _relayGasToken, uint8 _relayGasCommissionPercentage) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __EIP712_init("TransferSchedulerV1", "1");
        relayGasToken = _relayGasToken;
        relayGasCommissionPercentage = _relayGasCommissionPercentage;
    }

    function _authorizeUpgrade(address _newImplementation) internal override onlyOwner {}

    // * dApps can query the queue for a particular wallet address and show future transfers
    // * relays can query onchain
    struct addressNonceRecord {
        uint40 blockNumber;
        bool completed; //TODO: consider changing to include cancelled
        bool exists;
    }

    mapping(address => mapping(uint96 => addressNonceRecord)) public transfers;
    mapping(address => uint96[]) public addressNonceIndices;
    mapping(address => mapping(uint256 => uint256)) public nonceBitmap;

    // emit event for relays to discovery and schedule
    // ToDo: should nonces be indexed?
    event TransferScheduled(
        address indexed owner,
        uint96 nonce,
        address token,
        address to,
        uint128 amount,
        uint40 notBeforeDate,
        uint40 notAfterDate,
        uint40 maxBaseFee,
        bytes signature
    );

    // emit event for after succesful execution
    // ToDo: should nonces be indexed?
    event TransferExecuted(address indexed owner, uint96 nonce);

    // * Ability to track the state of the transfer through EVM storage [Optional]
    // ToDo: allow ownerto overwrite with same nonce to replace or nullify
    function queueScheduledTransfer(
        address _wallet,
        uint96 _nonce,
        address _token,
        address _to,
        uint128 _amount,
        uint40 _notBeforeDate,
        uint40 _notAfterDate,
        uint40 _maxBaseFee,
        bytes calldata _signature
    ) public {
        if (!transfers[_wallet][_nonce].exists) {
            addressNonceIndices[_wallet].push(_nonce);
        }
        transfers[_wallet][_nonce] = addressNonceRecord(uint40(block.number), false, true);

        emit TransferScheduled(
            _wallet, _nonce, _token, _to, _amount, _notBeforeDate, _notAfterDate, _maxBaseFee, _signature
        );
    }

    struct QueuedTransferRecord {
        uint96 nonce;
        uint40 blockNumber;
    }

    // function to get the transfers of a particular wallet address
    function getScheduledTransfers(address _wallet, bool _completed)
        public
        view
        returns (QueuedTransferRecord[] memory)
    {
        // Count matching transfers
        uint256 count = 0;
        for (uint256 i = 0; i < addressNonceIndices[_wallet].length; i++) {
            if (transfers[_wallet][addressNonceIndices[_wallet][i]].completed == _completed) {
                count++;
            }
        }

        // Initialize array with the correct size
        QueuedTransferRecord[] memory records = new QueuedTransferRecord[](count);

        // Fill array with matching transfers
        uint256 index = 0;
        for (uint256 i = 0; i < addressNonceIndices[_wallet].length; i++) {
            uint96 nonce = addressNonceIndices[_wallet][i];
            if (transfers[_wallet][nonce].completed == _completed) {
                records[index] =
                    QueuedTransferRecord({nonce: nonce, blockNumber: transfers[_wallet][nonce].blockNumber});
                index++;
            }
        }

        return records;
    }

    function getGasCommissionPercentage() public view returns (uint8) {
        return relayGasCommissionPercentage;
    }

    function getGasToken() public view returns (address) {
        return relayGasToken;
    }

    ///// @inheritdoc IScheduledTransfer
    function executeScheduledTransfer(
        ScheduledTransferDetails memory scheduledTransferDetails,
        bytes calldata signature
    ) external {
        _executeScheduledTransfer(scheduledTransferDetails, signature);
    }

    function _executeScheduledTransfer(
        ScheduledTransferDetails memory scheduledTransferDetails,
        bytes calldata signature
    ) private {
        if (block.timestamp < scheduledTransferDetails.notBeforeDate) {
            revert TransferTooEarly(scheduledTransferDetails.notBeforeDate);
        }

        if (block.timestamp > scheduledTransferDetails.notAfterDate) {
            revert TransferTooLate(scheduledTransferDetails.notAfterDate);
        }

        if (block.basefee > scheduledTransferDetails.maxBaseFee) {
            revert MaxBaseFeeExceeded(block.basefee, scheduledTransferDetails.maxBaseFee);
        }

        uint256 spenderTokenAllowance =
            ERC20(scheduledTransferDetails.token).allowance(scheduledTransferDetails.owner, address(this));
        if (scheduledTransferDetails.amount > spenderTokenAllowance) {
            revert InsufficientTokenAllowance(spenderTokenAllowance);
        }

        uint256 spenderGasTokenAllowance = ERC20(relayGasToken).allowance(scheduledTransferDetails.owner, address(this));
        if (block.basefee * 140000 * (1 + relayGasCommissionPercentage / 100) > spenderGasTokenAllowance) {
            revert InsufficientGasTokenAllowance(spenderGasTokenAllowance);
        }

        _useUnorderedNonce(scheduledTransferDetails.owner, scheduledTransferDetails.nonce);

        bytes32 hashed = _hashTypedDataV4(scheduledTransferDetails.hash());

        SignatureVerification.verify(signature, hashed, scheduledTransferDetails.owner);

        if (scheduledTransferDetails.amount != 0) {
            ERC20(scheduledTransferDetails.token).safeTransferFrom(
                scheduledTransferDetails.owner, scheduledTransferDetails.to, scheduledTransferDetails.amount
            );
            // Refund relay for transaction (140k gas usage) and add commission in gas
            ERC20(relayGasToken).safeTransferFrom(
                scheduledTransferDetails.owner,
                msg.sender,
                block.basefee * 140000 * (1 + relayGasCommissionPercentage / 100)
            );
        }

        // If ScheduledTransefer was queued on-chain, update on-chain state to .completed=true and emit event
        if (transfers[scheduledTransferDetails.owner][scheduledTransferDetails.nonce].exists == true) {
            transfers[scheduledTransferDetails.owner][scheduledTransferDetails.nonce].completed = true;
            emit TransferExecuted(scheduledTransferDetails.owner, scheduledTransferDetails.nonce);
        }
    }

    /// @notice Checks whether a nonce is taken and sets the bit at the bit position in the bitmap at the word position
    /// @param from The address to use the nonce at
    /// @param nonce The nonce to spend
    function _useUnorderedNonce(address from, uint256 nonce) internal {
        (uint256 wordPos, uint256 bitPos) = bitmapPositions(nonce);
        uint256 bit = 1 << bitPos;
        uint256 flipped = nonceBitmap[from][wordPos] ^= bit;

        if (flipped & bit == 0) revert InvalidNonce();
    }

    /// @notice Returns the index of the bitmap and the bit position within the bitmap. Used for unordered nonces
    /// @param nonce The nonce to get the associated word and bit positions
    /// @return wordPos The word position or index into the nonceBitmap
    /// @return bitPos The bit position
    /// @dev The first 248 bits of the nonce value is the index of the desired bitmap
    /// @dev The last 8 bits of the nonce value is the position of the bit in the bitmap
    function bitmapPositions(uint256 nonce) private pure returns (uint256 wordPos, uint256 bitPos) {
        wordPos = uint248(nonce >> 8);
        bitPos = uint8(nonce);
    }
}
