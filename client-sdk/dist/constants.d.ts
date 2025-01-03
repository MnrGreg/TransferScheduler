export declare const TransferSchedulerContractAddress = "0xBa551D945d9d4f14F7F6abc9abd26BD2684fA940";
export declare const transferSchedulerABI: readonly [{
    readonly type: "constructor";
    readonly inputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "UPGRADE_INTERFACE_VERSION";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "cancelScheduledTransfer";
    readonly inputs: readonly [{
        readonly name: "_wallet";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_nonce";
        readonly type: "uint96";
        readonly internalType: "uint96";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "eip712Domain";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "fields";
        readonly type: "bytes1";
        readonly internalType: "bytes1";
    }, {
        readonly name: "name";
        readonly type: "string";
        readonly internalType: "string";
    }, {
        readonly name: "version";
        readonly type: "string";
        readonly internalType: "string";
    }, {
        readonly name: "chainId";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "verifyingContract";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "salt";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }, {
        readonly name: "extensions";
        readonly type: "uint256[]";
        readonly internalType: "uint256[]";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "executeScheduledTransfer";
    readonly inputs: readonly [{
        readonly name: "scheduledTransferDetails";
        readonly type: "tuple";
        readonly internalType: "struct IScheduledTransfer.ScheduledTransferDetails";
        readonly components: readonly [{
            readonly name: "owner";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "nonce";
            readonly type: "uint96";
            readonly internalType: "uint96";
        }, {
            readonly name: "token";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "to";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "amount";
            readonly type: "uint128";
            readonly internalType: "uint128";
        }, {
            readonly name: "spender";
            readonly type: "address";
            readonly internalType: "address";
        }, {
            readonly name: "notBeforeDate";
            readonly type: "uint40";
            readonly internalType: "uint40";
        }, {
            readonly name: "notAfterDate";
            readonly type: "uint40";
            readonly internalType: "uint40";
        }, {
            readonly name: "maxBaseFee";
            readonly type: "uint40";
            readonly internalType: "uint40";
        }];
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "getRelayGasCommissionPercentage";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint8";
        readonly internalType: "uint8";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getRelayGasToken";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getRelayGasUsage";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getScheduledTransfers";
    readonly inputs: readonly [{
        readonly name: "_wallet";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_status";
        readonly type: "uint8";
        readonly internalType: "enum Status";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "tuple[]";
        readonly internalType: "struct QueuedTransferRecord[]";
        readonly components: readonly [{
            readonly name: "nonce";
            readonly type: "uint96";
            readonly internalType: "uint96";
        }, {
            readonly name: "blockNumber";
            readonly type: "uint40";
            readonly internalType: "uint40";
        }];
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "initialize";
    readonly inputs: readonly [{
        readonly name: "_relayGasToken";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_relayGasCommissionPercentage";
        readonly type: "uint8";
        readonly internalType: "uint8";
    }, {
        readonly name: "_relayGasUsage";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "owner";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "proxiableUUID";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "queueScheduledTransfer";
    readonly inputs: readonly [{
        readonly name: "_wallet";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_nonce";
        readonly type: "uint96";
        readonly internalType: "uint96";
    }, {
        readonly name: "_token";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_to";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "_amount";
        readonly type: "uint128";
        readonly internalType: "uint128";
    }, {
        readonly name: "_notBeforeDate";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }, {
        readonly name: "_notAfterDate";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }, {
        readonly name: "_maxBaseFee";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }, {
        readonly name: "_signature";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "renounceOwnership";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transferOwnership";
    readonly inputs: readonly [{
        readonly name: "newOwner";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "transfers";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "";
        readonly type: "uint96";
        readonly internalType: "uint96";
    }];
    readonly outputs: readonly [{
        readonly name: "blockNumber";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }, {
        readonly name: "status";
        readonly type: "uint8";
        readonly internalType: "enum Status";
    }, {
        readonly name: "exists";
        readonly type: "bool";
        readonly internalType: "bool";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "upgradeToAndCall";
    readonly inputs: readonly [{
        readonly name: "newImplementation";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "data";
        readonly type: "bytes";
        readonly internalType: "bytes";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
}, {
    readonly type: "event";
    readonly name: "EIP712DomainChanged";
    readonly inputs: readonly [];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Initialized";
    readonly inputs: readonly [{
        readonly name: "version";
        readonly type: "uint64";
        readonly indexed: false;
        readonly internalType: "uint64";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "OwnershipTransferred";
    readonly inputs: readonly [{
        readonly name: "previousOwner";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "newOwner";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "TransferExecuted";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "nonce";
        readonly type: "uint96";
        readonly indexed: false;
        readonly internalType: "uint96";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "TransferScheduled";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "nonce";
        readonly type: "uint96";
        readonly indexed: false;
        readonly internalType: "uint96";
    }, {
        readonly name: "token";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "to";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint128";
        readonly indexed: false;
        readonly internalType: "uint128";
    }, {
        readonly name: "notBeforeDate";
        readonly type: "uint40";
        readonly indexed: false;
        readonly internalType: "uint40";
    }, {
        readonly name: "notAfterDate";
        readonly type: "uint40";
        readonly indexed: false;
        readonly internalType: "uint40";
    }, {
        readonly name: "maxBaseFee";
        readonly type: "uint40";
        readonly indexed: false;
        readonly internalType: "uint40";
    }, {
        readonly name: "signature";
        readonly type: "bytes";
        readonly indexed: false;
        readonly internalType: "bytes";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "UnorderedNonceInvalidation";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "word";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "mask";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Upgraded";
    readonly inputs: readonly [{
        readonly name: "implementation";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }];
    readonly anonymous: false;
}, {
    readonly type: "error";
    readonly name: "AddressEmptyCode";
    readonly inputs: readonly [{
        readonly name: "target";
        readonly type: "address";
        readonly internalType: "address";
    }];
}, {
    readonly type: "error";
    readonly name: "ERC1967InvalidImplementation";
    readonly inputs: readonly [{
        readonly name: "implementation";
        readonly type: "address";
        readonly internalType: "address";
    }];
}, {
    readonly type: "error";
    readonly name: "ERC1967NonPayable";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "FailedCall";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InsufficientGasTokenAllowance";
    readonly inputs: readonly [{
        readonly name: "spenderGasTokenAllowance";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "InsufficientTokenAllowance";
    readonly inputs: readonly [{
        readonly name: "spenderTokenAllowance";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "InvalidAmount";
    readonly inputs: readonly [{
        readonly name: "maxAmount";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
}, {
    readonly type: "error";
    readonly name: "InvalidContractSignature";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidInitialization";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidNonce";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidNonceStatus";
    readonly inputs: readonly [{
        readonly name: "status";
        readonly type: "uint8";
        readonly internalType: "enum Status";
    }];
}, {
    readonly type: "error";
    readonly name: "InvalidSignature";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidSignatureLength";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidSigner";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "LengthMismatch";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MaxBaseFeeExceeded";
    readonly inputs: readonly [{
        readonly name: "baseFee";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "maxBaseFee";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }];
}, {
    readonly type: "error";
    readonly name: "NotInitializing";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "OwnableInvalidOwner";
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
        readonly internalType: "address";
    }];
}, {
    readonly type: "error";
    readonly name: "OwnableUnauthorizedAccount";
    readonly inputs: readonly [{
        readonly name: "account";
        readonly type: "address";
        readonly internalType: "address";
    }];
}, {
    readonly type: "error";
    readonly name: "TransferTooEarly";
    readonly inputs: readonly [{
        readonly name: "notBeforeDate";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }];
}, {
    readonly type: "error";
    readonly name: "TransferTooLate";
    readonly inputs: readonly [{
        readonly name: "notAfterDate";
        readonly type: "uint40";
        readonly internalType: "uint40";
    }];
}, {
    readonly type: "error";
    readonly name: "UUPSUnauthorizedCallContext";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "UUPSUnsupportedProxiableUUID";
    readonly inputs: readonly [{
        readonly name: "slot";
        readonly type: "bytes32";
        readonly internalType: "bytes32";
    }];
}, {
    readonly type: "error";
    readonly name: "Unauthorized";
    readonly inputs: readonly [{
        readonly name: "caller";
        readonly type: "address";
        readonly internalType: "address";
    }];
}];
//# sourceMappingURL=constants.d.ts.map