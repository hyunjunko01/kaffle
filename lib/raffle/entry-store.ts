import { randomUUID } from "crypto";
import type { RaffleEntryOperation, RaffleEntryState } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ENTRY_LEASE_MS = 120_000;
export const ACTIVE_ENTRY_STATES: RaffleEntryState[] = ["PREPARING", "PENDING"];

export class EntryAlreadyPendingError extends Error {
  constructor(public readonly operationId: string) {
    super("entry already pending");
  }
}

export function findEntryByRequest(userId: string, requestId: string) {
  return prisma.raffleEntryOperation.findUnique({
    where: { userId_requestId: { userId, requestId } },
  });
}

export function findUserEntry(userId: string, chainId: number, id?: string) {
  return prisma.raffleEntryOperation.findFirst({
    where: {
      userId,
      chainId,
      ...(id ? { id } : { state: { in: ACTIVE_ENTRY_STATES } }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function reserveEntry(input: {
  userId: string;
  requestId: string;
  chainId: number;
  raffleAddress: string;
  walletAddress: string;
  ticketCount: number;
}) {
  return prisma.$transaction(async (tx) => {
    // Serialize reservations for this user, including requests handled by other servers.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE`;
    const existing = await tx.raffleEntryOperation.findUnique({
      where: { userId_requestId: { userId: input.userId, requestId: input.requestId } },
    });
    if (existing) return { operation: existing, created: false };

    const pending = await tx.raffleEntryOperation.findFirst({
      where: { userId: input.userId, chainId: input.chainId, state: { in: ACTIVE_ENTRY_STATES } },
    });
    if (pending) throw new EntryAlreadyPendingError(pending.id);

    const balance = await tx.ticketLedger.aggregate({
      where: { userId: input.userId },
      _sum: { amount: true },
    });
    if ((balance._sum.amount ?? 0) < input.ticketCount) {
      throw new Error("insufficient tickets");
    }

    const operation = await tx.raffleEntryOperation.create({
      data: {
        ...input,
        leaseOwner: randomUUID(),
        leaseUntil: new Date(Date.now() + ENTRY_LEASE_MS),
      },
    });
    await tx.ticketLedger.create({
      data: {
        userId: input.userId,
        amount: -input.ticketCount,
        reason: "raffle_entry",
        relatedId: input.raffleAddress,
        entryOperationId: operation.id,
      },
    });
    return { operation, created: true };
  });
}

export async function acquireEntryLease(id: string) {
  const leaseOwner = randomUUID();
  const acquired = await prisma.raffleEntryOperation.updateMany({
    where: {
      id,
      state: { in: ACTIVE_ENTRY_STATES },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
    },
    data: {
      leaseOwner,
      leaseUntil: new Date(Date.now() + ENTRY_LEASE_MS),
      lastCheckedAt: new Date(),
    },
  });
  if (acquired.count !== 1) return null;
  return prisma.raffleEntryOperation.findUniqueOrThrow({ where: { id } });
}

export async function savePreparedEntry(operation: RaffleEntryOperation, prepared: {
  rawTransaction: string;
  txHash: string;
  entryNonce: string;
  deadline: bigint;
  startBlock: bigint;
}) {
  const saved = await prisma.raffleEntryOperation.updateMany({
    where: { id: operation.id, state: "PREPARING", leaseOwner: operation.leaseOwner },
    data: { state: "PENDING", ...prepared },
  });
  return saved.count === 1;
}

export function releaseEntryLease(operation: RaffleEntryOperation) {
  return prisma.raffleEntryOperation.updateMany({
    where: { id: operation.id, leaseOwner: operation.leaseOwner },
    data: { leaseOwner: null, leaseUntil: null, lastCheckedAt: new Date() },
  });
}

export function confirmEntry(operation: RaffleEntryOperation, confirmedTxHash = operation.txHash) {
  return prisma.raffleEntryOperation.updateMany({
    where: { id: operation.id, state: "PENDING", txHash: operation.txHash },
    data: { state: "CONFIRMED", confirmedTxHash, rawTransaction: null, failureReason: null },
  });
}

export async function failEntry(operation: RaffleEntryOperation, reason: string) {
  if (!ACTIVE_ENTRY_STATES.includes(operation.state) || !operation.leaseOwner) return;
  return prisma.$transaction(async (tx) => {
    // CAS and refund commit together. Racing workers cannot refund the same entry twice.
    const failed = await tx.raffleEntryOperation.updateMany({
      where: {
        id: operation.id,
        state: operation.state,
        leaseOwner: operation.leaseOwner,
      },
      data: { state: "FAILED", rawTransaction: null, failureReason: reason },
    });
    if (failed.count !== 1) return;
    await tx.ticketLedger.create({
      data: {
        userId: operation.userId,
        amount: operation.ticketCount,
        reason: "raffle_entry_refund",
        relatedId: operation.raffleAddress,
        entryOperationId: operation.id,
      },
    });
  });
}

export function readEntry(id: string) {
  return prisma.raffleEntryOperation.findUniqueOrThrow({ where: { id } });
}

export function listPendingEntries(chainId: number, take: number) {
  return prisma.raffleEntryOperation.findMany({
    where: {
      chainId,
      state: { in: ACTIVE_ENTRY_STATES },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
    },
    orderBy: [{ lastCheckedAt: "asc" }, { createdAt: "asc" }],
    take,
  });
}

export function advanceEntryScan(operation: RaffleEntryOperation, scanBlock: bigint) {
  return prisma.raffleEntryOperation.updateMany({
    where: { id: operation.id, state: "PENDING", leaseOwner: operation.leaseOwner },
    data: { scanBlock },
  });
}
