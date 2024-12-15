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
        { name: 'nonce', type: 'uint256' },
        { name: 'token', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'spender', type: 'address' },
        { name: 'maxBaseFee', type: 'uint256' },
        { name: 'notBeforeDate', type: 'uint256' },
        { name: 'notAfterDate', type: 'uint256' },
    ],
} as const satisfies TypedData