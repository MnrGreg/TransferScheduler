// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

// Enum for transfer status
enum Status {
    notCompleted, // This will be represented with 0
    completed, // This will be represented with 1
    cancelled // This will be represented with 2

}

// Struct to track the state of transfers
struct addressNonceRecord {
    uint40 blockNumber; // The block in which the transfer was queued
    Status status; // Indicates the status of the transfer
    bool exists; // Indicates if the transfer record exists
}

// Struct to represent a queued transfer record
struct QueuedTransferRecord {
    uint96 nonce; // Nonce of the transfer
    uint40 blockNumber; // Block number when the transfer was queued
}
