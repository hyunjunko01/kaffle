-- CreateTable
CREATE TABLE "PersonalWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletOwnershipChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletOwnershipChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalWallet_userId_key" ON "PersonalWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalWallet_address_key" ON "PersonalWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "WalletOwnershipChallenge_nonce_key" ON "WalletOwnershipChallenge"("nonce");

-- CreateIndex
CREATE INDEX "WalletOwnershipChallenge_userId_address_idx" ON "WalletOwnershipChallenge"("userId", "address");

-- AddForeignKey
ALTER TABLE "PersonalWallet" ADD CONSTRAINT "PersonalWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletOwnershipChallenge" ADD CONSTRAINT "WalletOwnershipChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
