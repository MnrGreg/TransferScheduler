// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

// Importing necessary interfaces and libraries
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
import {ArbSys} from "@arbitrum/precompiles/ArbSys.sol";

// Main contract definition
contract TransferSchedulerV6 is IScheduledTransfer, EIP712Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    using SignatureVerification for bytes; // Allows bytes to use signature verification functions
    using SafeTransferLib for ERC20; // Allows ERC20 tokens to use safe transfer functions
    using ScheduledTransferHash for ScheduledTransferDetails; // Allows ScheduledTransferDetails to use hashing functions

    // State variables
    address relayGasToken; // Address of the token used for gas payments
    uint8 relayGasCommissionPercentage; // Percentage of gas commission charged
    uint32 relayGasUsage; // Amount of gas used for relay operations

    // Arbitrum system const to retrieve Arbitrum L2 block number from precompile
    ArbSys constant ARB_SYS = ArbSys(address(100));

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevents the contract from being initialized in the constructor
    }

    // Initialize function to set up the contract state
    function initialize(address _relayGasToken, uint8 _relayGasCommissionPercentage, uint32 _relayGasUsage)
        public
        reinitializer(3)
    {
        relayGasToken = _relayGasToken; // Set the gas token address
        relayGasCommissionPercentage = _relayGasCommissionPercentage; // Set the gas commission percentage
        relayGasUsage = _relayGasUsage; // Set the gas usage amount
    }

    // Function to authorize upgrades, only callable by the owner
    function _authorizeUpgrade(address _newImplementation) internal override onlyOwner {}

    // Struct to track the state of transfers
    struct addressNonceRecord {
        uint40 blockNumber; // The block in which the transfer was queued
        // TODO: consider changing completed type to status field that can include cancelled
        bool completed; // Indicates if the transfer was completed
        bool exists; // Indicates if the transfer record exists
    }

    // Mappings to store transfer records
    mapping(address => mapping(uint96 => addressNonceRecord)) public transfers; // Maps wallet addresses to their transfer records
    mapping(address => uint96[]) private addressNonceIndices; // Maps wallet addresses to their nonces
    mapping(address => mapping(uint256 => uint256)) private nonceBitmap; // Bitmap for nonce tracking

    // Event emitted when a transfer is scheduled
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

    // Event emitted after a successful transfer execution
    event TransferExecuted(address indexed owner, uint96 nonce);

    // Function to queue a scheduled transfer
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
        // If the transfer does not exist, add its nonce to the indices
        if (!transfers[_wallet][_nonce].exists) {
            addressNonceIndices[_wallet].push(_nonce);
        }
        // Create a new transfer record
        transfers[_wallet][_nonce] = addressNonceRecord(uint40(ARB_SYS.arbBlockNumber()), false, true);

        // Emit the TransferScheduled event
        emit TransferScheduled(
            _wallet, _nonce, _token, _to, _amount, _notBeforeDate, _notAfterDate, _maxBaseFee, _signature
        );
    }

    // Struct to represent a queued transfer record
    struct QueuedTransferRecord {
        uint96 nonce; // Nonce of the transfer
        uint40 blockNumber; // Block number when the transfer was queued
    }

    // Function to get scheduled transfers for a wallet
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

        return records; // Return the array of queued transfers
    }

    // Function to get the relay gas usage
    function getRelayGasUsage() public view returns (uint32) {
        return relayGasUsage; // Return the gas usage
    }

    // Function to get the relay gas commission percentage
    function getRelayGasCommissionPercentage() public view returns (uint8) {
        return relayGasCommissionPercentage; // Return the commission percentage
    }

    // Function to get the relay gas token address
    function getRelayGasToken() public view returns (address) {
        return relayGasToken; // Return the gas token address
    }

    ///// @inheritdoc IScheduledTransfer
    // Function to execute a scheduled transfer
    function executeScheduledTransfer(
        ScheduledTransferDetails memory scheduledTransferDetails,
        bytes calldata signature
    ) external {
        _executeScheduledTransfer(scheduledTransferDetails, signature);
    }

    // Internal function to handle the execution of a scheduled transfer
    function _executeScheduledTransfer(
        ScheduledTransferDetails memory scheduledTransferDetails,
        bytes calldata signature
    ) private {
        // Check if the transfer is too early
        if (block.timestamp < scheduledTransferDetails.notBeforeDate) {
            revert TransferTooEarly(scheduledTransferDetails.notBeforeDate);
        }

        // Check if the transfer is too late
        if (block.timestamp > scheduledTransferDetails.notAfterDate) {
            revert TransferTooLate(scheduledTransferDetails.notAfterDate);
        }

        // Check if the base fee exceeds the maximum allowed
        if (block.basefee > scheduledTransferDetails.maxBaseFee) {
            revert MaxBaseFeeExceeded(block.basefee, scheduledTransferDetails.maxBaseFee);
        }

        // Check the allowance of the token for the transfer
        uint256 spenderTokenAllowance =
            ERC20(scheduledTransferDetails.token).allowance(scheduledTransferDetails.owner, address(this));
        if (scheduledTransferDetails.amount > spenderTokenAllowance) {
            revert InsufficientTokenAllowance(spenderTokenAllowance);
        }

        // Check the allowance of the gas token for the relay
        uint256 spenderGasTokenAllowance = ERC20(relayGasToken).allowance(scheduledTransferDetails.owner, address(this));
        if (((block.basefee * relayGasUsage * (100 + relayGasCommissionPercentage)) / 100) > spenderGasTokenAllowance) {
            revert InsufficientGasTokenAllowance(spenderGasTokenAllowance);
        }

        // Use the nonce for this transfer
        _useUnorderedNonce(scheduledTransferDetails.owner, scheduledTransferDetails.nonce);

        // Hash the scheduled transfer details for signature verification
        bytes32 hashed = _hashTypedDataV4(scheduledTransferDetails.hash());

        // Verify the signature
        SignatureVerification.verify(signature, hashed, scheduledTransferDetails.owner);

        // If there is an amount to transfer, execute the transfer
        if (scheduledTransferDetails.amount != 0) {
            ERC20(scheduledTransferDetails.token).safeTransferFrom(
                scheduledTransferDetails.owner, scheduledTransferDetails.to, scheduledTransferDetails.amount
            );
            // Refund the relay for the transaction
            ERC20(relayGasToken).safeTransferFrom(
                scheduledTransferDetails.owner,
                msg.sender,
                ((block.basefee * relayGasUsage * (100 + relayGasCommissionPercentage)) / 100)
            );
        }

        // Update the transfer status to completed and emit an event
        if (transfers[scheduledTransferDetails.owner][scheduledTransferDetails.nonce].exists == true) {
            transfers[scheduledTransferDetails.owner][scheduledTransferDetails.nonce].completed = true;
            emit TransferExecuted(scheduledTransferDetails.owner, scheduledTransferDetails.nonce);
        }
    }

    // Function to check if a nonce is taken and set the bit in the bitmap
    function _useUnorderedNonce(address from, uint256 nonce) internal {
        (uint256 wordPos, uint256 bitPos) = bitmapPositions(nonce);
        uint256 bit = 1 << bitPos;
        uint256 flipped = nonceBitmap[from][wordPos] ^= bit;

        // Revert if the nonce is invalid
        if (flipped & bit == 0) revert InvalidNonce();
    }

    // Function to return the index of the bitmap and the bit position within the bitmap
    function bitmapPositions(uint256 nonce) private pure returns (uint256 wordPos, uint256 bitPos) {
        wordPos = uint248(nonce >> 8); // Get the word position
        bitPos = uint8(nonce); // Get the bit position
    }
}
