import type { TypedData } from 'viem'

export const types = {
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
    ],
    ScheduledTransfer: [
        { name: 'owner', type: 'address' },
        { name: 'nonce', type: 'uint96' },
        { name: 'token', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint128' },
        { name: 'spender', type: 'address' },
        { name: 'notBeforeDate', type: 'uint40' },
        { name: 'notAfterDate', type: 'uint40' },
        { name: 'maxBaseFee', type: 'uint40' },
    ],
} as const satisfies TypedData