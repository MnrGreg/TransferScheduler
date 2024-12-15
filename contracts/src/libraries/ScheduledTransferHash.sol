// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IScheduledTransfer} from "../interfaces/IScheduledTransfer.sol";

library ScheduledTransferHash {
    bytes32 public constant _SCHEDULED_TRANSFER_TYPEHASH = keccak256(
        "ScheduledTransfer(address owner,uint256 nonce,address token,address to,uint256 amount,address spender,uint256 maxBaseFee,uint256 notBeforeDate,uint256 notAfterDate)"
    );

    function hash(IScheduledTransfer.ScheduledTransferDetails memory scheduledTransferDetails)
        internal
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encode(
                _SCHEDULED_TRANSFER_TYPEHASH,
                scheduledTransferDetails.owner,
                scheduledTransferDetails.nonce,
                scheduledTransferDetails.token,
                scheduledTransferDetails.to,
                scheduledTransferDetails.amount,
                address(this),
                scheduledTransferDetails.maxBaseFee,
                scheduledTransferDetails.notBeforeDate,
                scheduledTransferDetails.notAfterDate
            )
        );
    }
}
