export const abi = [
    {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
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
                "type": "uint256",
                "internalType": "uint256"
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
                        "type": "uint256",
                        "internalType": "uint256"
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
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "spender",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "maxBaseFee",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "notBeforeDate",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "notAfterDate",
                        "type": "uint256",
                        "internalType": "uint256"
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
                "type": "uint256",
                "internalType": "uint256"
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
                "internalType": "struct TransferScheduler.QueuedTransferRecord[]",
                "components": [
                    {
                        "name": "nonce",
                        "type": "uint256",
                        "internalType": "uint256"
                    },
                    {
                        "name": "blockNumber",
                        "type": "uint256",
                        "internalType": "uint256"
                    }
                ]
            }
        ],
        "stateMutability": "view"
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
        "name": "queueScheduledTransfer",
        "inputs": [
            {
                "name": "_wallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_nonce",
                "type": "uint256",
                "internalType": "uint256"
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
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_notBeforeDate",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_notAfterDate",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_maxBaseFee",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "transfers",
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
                "name": "blockNumber",
                "type": "uint256",
                "internalType": "uint256"
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
        "type": "event",
        "name": "EIP712DomainChanged",
        "inputs": [],
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
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
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
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
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
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "notBeforeDate",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "notAfterDate",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "maxBaseFee",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
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
        "name": "InvalidNonce",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidShortString",
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
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "StringTooLong",
        "inputs": [
            {
                "name": "str",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "TransferTooEarly",
        "inputs": [
            {
                "name": "notBeforeDate",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "TransferTooLate",
        "inputs": [
            {
                "name": "notAfterDate",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    }
] as const