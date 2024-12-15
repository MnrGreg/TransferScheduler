// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

//import {IEIP712} from "./IEIP712.sol";

/// @title ScheduledTransfer
/// @notice Handles ERC20 token transfers through signature based actions
interface IScheduledTransfer {
    /// @notice Thrown when the requested amount for a transfer is larger than the permissioned amount
    /// @param maxAmount The maximum amount a spender can request to transfer
    error InvalidAmount(uint256 maxAmount);

    /// @notice Thrown when the number of tokens permissioned to a spender does not match the number of tokens being transferred
    /// @dev If the spender does not need to transfer the number of tokens permitted, the spender can request amount 0 to be transferred
    error LengthMismatch();

    /// @notice Emits an event when the owner successfully invalidates an unordered nonce.
    event UnorderedNonceInvalidation(address indexed owner, uint256 word, uint256 mask);

    /// @notice Specifies the recipient address and amount for batched transfers.
    struct ScheduledTransferDetails {
        address owner;
        // a unique value for every token owner's signature to prevent signature replays
        uint256 nonce;
        address token;
        // recipient address
        address to;
        // the exact amount that must be spent
        uint256 amount;
        address spender;
        uint256 maxBaseFee;
        // notAfterDate on the permit signature
        uint256 notBeforeDate;
        // notAfterDate on the permit signature
        uint256 notAfterDate;
    }

    /// @notice A map from token owner address and a caller specified word index to a bitmap. Used to set bits in the bitmap to prevent against signature replay protection
    /// @dev Uses unordered nonces so that permit messages do not need to be spent in a certain order
    /// @dev The mapping is indexed first by the token owner, then by an index specified in the nonce
    /// @dev It returns a uint256 bitmap
    /// @dev The index, or wordPosition is capped at type(uint248).max
    //function nonceBitmap(address, uint256) external view returns (uint256);

    /// @notice Transfers tokens using a signed permit message
    /// @param scheduledTransferDetails The token transfer data signed over by the owner
    /// @param signature The signature to verify
    // function executeTransferFrom(ScheduledTransferDetails memory scheduledTransferDetails, bytes calldata signature)
    //     external;

    /// @notice Invalidates the bits specified in mask for the bitmap at the word position
    /// @dev The wordPos is maxed at type(uint248).max
    /// @param wordPos A number to index the nonceBitmap at
    /// @param mask A bitmap masked against msg.sender's current bitmap at the word position
    //function invalidateUnorderedNonces(uint256 wordPos, uint256 mask) external;
}
