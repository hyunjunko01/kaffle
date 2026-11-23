CREATE TYPE "RaffleEntryState" AS ENUM ('PREPARING', 'PENDING', 'CONFIRMED', 'FAILED');

CREATE TABLE "RaffleEntryOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "raffleAddress" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL CHECK ("ticketCount" > 0 AND "ticketCount" <= 100),
    "entryNonce" TEXT,
    "deadline" BIGINT,
    "startBlock" BIGINT,
    "scanBlock" BIGINT,
    "confirmedTxHash" TEXT,
    "state" "RaffleEntryState" NOT NULL DEFAULT 'PREPARING',
    "txHash" TEXT,
    "rawTransaction" TEXT,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "failureReason" TEXT,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RaffleEntryOperation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TicketLedger" ADD COLUMN "entryOperationId" TEXT;
CREATE UNIQUE INDEX "RaffleEntryOperation_userId_requestId_key" ON "RaffleEntryOperation"("userId", "requestId");
CREATE UNIQUE INDEX "RaffleEntryOperation_txHash_key" ON "RaffleEntryOperation"("txHash");
CREATE INDEX "RaffleEntryOperation_chainId_state_lastCheckedAt_idx" ON "RaffleEntryOperation"("chainId", "state", "lastCheckedAt");
CREATE UNIQUE INDEX "TicketLedger_entryOperationId_reason_key" ON "TicketLedger"("entryOperationId", "reason");
ALTER TABLE "RaffleEntryOperation" ADD CONSTRAINT "RaffleEntryOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketLedger" ADD CONSTRAINT "TicketLedger_entryOperationId_fkey" FOREIGN KEY ("entryOperationId") REFERENCES "RaffleEntryOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A stale chain snapshot must never authorize another spend of a consumed voucher nonce.
CREATE UNIQUE INDEX "RaffleEntryOperation_live_voucher_key"
ON "RaffleEntryOperation"("chainId", "raffleAddress", "walletAddress", "entryNonce")
WHERE "state" IN ('PENDING', 'CONFIRMED');
