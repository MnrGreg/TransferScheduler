export type ScheduledTransfer = {
    owner: `0x${string}`;
    nonce: number;
    token: `0x${string}`;
    to: `0x${string}`;
    amount: number;
    spender: `0x${string}`;
    notBeforeDate: number;
    notAfterDate: number;
    maxBaseFee: number;
};
export type TransferScheduledEventLog = {
    owner: `0x${string}`;
    nonce: bigint;
    token: `0x${string}`;
    to: `0x${string}`;
    amount: bigint;
    notBeforeDate: number;
    notAfterDate: number;
    maxBaseFee: number;
    signature: `0x${string}`;
};
export type QueuedTransferRecords = {
    nonce: bigint;
    blockNumber: number;
}[];
export declare enum Status {
    notCompleted = 0,
    completed = 1,
    cancelled = 2
}
export type AddressNonceRecord = {
    blockNumber: number;
    status: Status;
    exists: boolean;
};
//# sourceMappingURL=types.d.ts.map