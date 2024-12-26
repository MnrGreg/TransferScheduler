
# ScheduledTransfers Relay Worker

1. Watches for the TransferScheduled events on the TransferScheduler contract
2. Writes event entries to a queue when received
3. Waits till notBeforeDate
4. Executes the transfer with presigned signauture
