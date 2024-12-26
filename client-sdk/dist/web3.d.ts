import { Web3, Eip712TypedData } from "web3";
import { ScheduledTransfer, TransferScheduledEventLog, AddressNonceRecord } from './types';
export declare function createTypedData(chainId: number, scheduledTransfer: ScheduledTransfer): Eip712TypedData;
export declare function getGasTokenAddress(web3: Web3): Promise<string>;
export declare function getRelayCharge(web3: Web3, maxBaseFee: number): Promise<number>;
export declare function fetchQueuedTransfers(web3: Web3, address: `0x${string}`, status: boolean): Promise<TransferScheduledEventLog[]>;
export declare function queueScheduledTransfer(web3: Web3, scheduledTransfer: ScheduledTransfer, signature: string, from: string): Promise<{
    readonly transactionHash: string;
    readonly transactionIndex: bigint;
    readonly blockHash: string;
    readonly blockNumber: bigint;
    readonly from: string;
    readonly to: string;
    readonly cumulativeGasUsed: bigint;
    readonly gasUsed: bigint;
    readonly effectiveGasPrice?: bigint | undefined;
    readonly contractAddress?: string | undefined;
    readonly logs: {
        readonly id?: string | undefined;
        readonly removed?: boolean | undefined;
        readonly logIndex?: bigint | undefined;
        readonly transactionIndex?: bigint | undefined;
        readonly transactionHash?: string | undefined;
        readonly blockHash?: string | undefined;
        readonly blockNumber?: bigint | undefined;
        readonly address?: string | undefined;
        readonly data?: string | undefined;
        readonly topics?: string[] | undefined;
    }[];
    readonly logsBloom: string;
    readonly root: string;
    readonly status: bigint;
    readonly type?: bigint | undefined;
    events?: {
        [x: string]: {
            readonly event: string;
            readonly id?: string | undefined;
            readonly logIndex?: bigint | undefined;
            readonly transactionIndex?: bigint | undefined;
            readonly transactionHash?: string | undefined;
            readonly blockHash?: string | undefined;
            readonly blockNumber?: bigint | undefined;
            readonly address: string;
            readonly topics: string[];
            readonly data: string;
            readonly raw?: {
                data: string;
                topics: unknown[];
            } | undefined;
            readonly returnValues: {
                [x: string]: unknown;
            };
            readonly signature?: string | undefined;
        };
    } | undefined;
}>;
export declare function getTransfers(web3: Web3, address: `0x${string}`, nonce: number): Promise<AddressNonceRecord>;
//# sourceMappingURL=web3.d.ts.map