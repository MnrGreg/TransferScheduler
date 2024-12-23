export const abi = [
    {
        "type": "function",
        "name": "UPGRADE_INTERFACE_VERSION",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "addressNonceIndices",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eip712Domain",
        "inputs": [],
        "outputs": [
            {
                "name": "fields",
                "type": "bytes1",
                "internalType": "bytes1"
            },
            {
                "name": "name",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "version",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "chainId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "verifyingContract",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "salt",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "extensions",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "executeScheduledTransfer",
        "inputs": [
            {
                "name": "scheduledTransferDetails",
                "type": "tuple",
                "internalType": "struct IScheduledTransfer.ScheduledTransferDetails",
                "components": [
                    {
                        "name": "owner",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "nonce",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "token",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "to",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "amount",
                        "type": "uint128",
                        "internalType": "uint128"
                    },
                    {
                        "name": "spender",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "notBeforeDate",
                        "type": "uint40",
                        "internalType": "uint40"
                    },
                    {
                        "name": "notAfterDate",
                        "type": "uint40",
                        "internalType": "uint40"
                    },
                    {
                        "name": "maxBaseFee",
                        "type": "uint40",
                        "internalType": "uint40"
                    }
                ]
            },
            {
                "name": "signature",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getGasCommissionPercentage",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getGasToken",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getScheduledTransfers",
        "inputs": [
            {
                "name": "_wallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_completed",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "internalType": "struct TransferSchedulerV1.QueuedTransferRecord[]",
                "components": [
                    {
                        "name": "nonce",
                        "type": "uint96",
                        "internalType": "uint96"
                    },
                    {
                        "name": "blockNumber",
                        "type": "uint40",
                        "internalType": "uint40"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_relayGasToken",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_relayGasCommissionPercentage",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "nonceBitmap",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proxiableUUID",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "queueScheduledTransfer",
        "inputs": [
            {
                "name": "_wallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_nonce",
                "type": "uint96",
                "internalType": "uint96"
            },
            {
                "name": "_token",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_to",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_amount",
                "type": "uint128",
                "internalType": "uint128"
            },
            {
                "name": "_notBeforeDate",
                "type": "uint40",
                "internalType": "uint40"
            },
            {
                "name": "_notAfterDate",
                "type": "uint40",
                "internalType": "uint40"
            },
            {
                "name": "_maxBaseFee",
                "type": "uint40",
                "internalType": "uint40"
            },
            {
                "name": "_signature",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transfers",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint96",
                "internalType": "uint96"
            }
        ],
        "outputs": [
            {
                "name": "blockNumber",
                "type": "uint40",
                "internalType": "uint40"
            },
            {
                "name": "completed",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "exists",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "upgradeToAndCall",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "event",
        "name": "EIP712DomainChanged",
        "inputs": [],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Initialized",
        "inputs": [
            {
                "name": "version",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "TransferExecuted",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "nonce",
                "type": "uint96",
                "indexed": false,
                "internalType": "uint96"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "TransferScheduled",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "nonce",
                "type": "uint96",
                "indexed": false,
                "internalType": "uint96"
            },
            {
                "name": "token",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "to",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "amount",
                "type": "uint128",
                "indexed": false,
                "internalType": "uint128"
            },
            {
                "name": "notBeforeDate",
                "type": "uint40",
                "indexed": false,
                "internalType": "uint40"
            },
            {
                "name": "notAfterDate",
                "type": "uint40",
                "indexed": false,
                "internalType": "uint40"
            },
            {
                "name": "maxBaseFee",
                "type": "uint40",
                "indexed": false,
                "internalType": "uint40"
            },
            {
                "name": "signature",
                "type": "bytes",
                "indexed": false,
                "internalType": "bytes"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "UnorderedNonceInvalidation",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "word",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "mask",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Upgraded",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AddressEmptyCode",
        "inputs": [
            {
                "name": "target",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967InvalidImplementation",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967NonPayable",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InsufficientGasTokenAllowance",
        "inputs": [
            {
                "name": "spenderGasTokenAllowance",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InsufficientTokenAllowance",
        "inputs": [
            {
                "name": "spenderTokenAllowance",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidAmount",
        "inputs": [
            {
                "name": "maxAmount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidContractSignature",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidNonce",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidSignature",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidSignatureLength",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidSigner",
        "inputs": []
    },
    {
        "type": "error",
        "name": "LengthMismatch",
        "inputs": []
    },
    {
        "type": "error",
        "name": "MaxBaseFeeExceeded",
        "inputs": [
            {
                "name": "baseFee",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxBaseFee",
                "type": "uint40",
                "internalType": "uint40"
            }
        ]
    },
    {
        "type": "error",
        "name": "NotInitializing",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "TransferTooEarly",
        "inputs": [
            {
                "name": "notBeforeDate",
                "type": "uint40",
                "internalType": "uint40"
            }
        ]
    },
    {
        "type": "error",
        "name": "TransferTooLate",
        "inputs": [
            {
                "name": "notAfterDate",
                "type": "uint40",
                "internalType": "uint40"
            }
        ]
    },
    {
        "type": "error",
        "name": "UUPSUnauthorizedCallContext",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UUPSUnsupportedProxiableUUID",
        "inputs": [
            {
                "name": "slot",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    }
] as const