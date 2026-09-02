-- CreateTable
CREATE TABLE "RaffleSnapshot" (
    "id" TEXT NOT NULL,
    "raffleAddress" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "winnerAddress" TEXT,
    "prizeAmount" TEXT NOT NULL,
    "prizeClaimed" BOOLEAN NOT NULL DEFAULT false,
    "symbol" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeClaim" (
    "id" TEXT NOT NULL,
    "raffleAddress" TEXT NOT NULL,
    "winnerAddress" TEXT NOT NULL,
    "amountWei" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaffleSnapshot_raffleAddress_key" ON "RaffleSnapshot"("raffleAddress");

-- CreateIndex
CREATE INDEX "RaffleSnapshot_roundNumber_idx" ON "RaffleSnapshot"("roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_txHash_key" ON "PrizeClaim"("txHash");

-- CreateIndex
CREATE INDEX "PrizeClaim_winnerAddress_idx" ON "PrizeClaim"("winnerAddress");

-- AddForeignKey
ALTER TABLE "PrizeClaim" ADD CONSTRAINT "PrizeClaim_raffleAddress_fkey" FOREIGN KEY ("raffleAddress") REFERENCES "RaffleSnapshot"("raffleAddress") ON DELETE CASCADE ON UPDATE CASCADE;
