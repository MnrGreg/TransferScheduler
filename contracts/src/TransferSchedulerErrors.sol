// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @notice Shared errors between signature based transfers and allowance based transfers.

import {Status} from "./types/TransferSchedulerTypes.sol";

/// @notice Thrown when validating an inputted signature that is stale
/// @param notAfterDate The timestamp at which a signature is no longer valid
error TransferTooLate(uint40 notAfterDate);

/// @notice Thrown when validating that the inputted nonce has not been used
error InvalidNonce();

error TransferTooEarly(uint40 notBeforeDate);

error MaxBaseFeeExceeded(uint256 baseFee, uint40 maxBaseFee);

error InsufficientTokenAllowance(uint256 spenderTokenAllowance);

error InsufficientGasTokenAllowance(uint256 spenderGasTokenAllowance);

error Unauthorized(address caller);

error InvalidNonceStatus(Status status);
