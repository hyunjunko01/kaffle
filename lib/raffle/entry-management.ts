import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVE_ENTRY_STATES } from "@/lib/raffle/entry-store";
import { entryOperationResponse, reconcileEntryOperation } from "@/lib/raffle/entry-recovery";
import type { EntryRecoveryBatch, EntryRecoveryResult, EntryRecoveryStatus } from "@/lib/raffle/entry-recovery-types";

const BATCH_SIZE = 5;
const PREVIEW_SIZE = 10;
type Scope = { chainId: number; userId?: string };
type Cursor = { cutoff: string; createdAt: string; id: string };

export class InvalidEntryRecoveryCursor extends Error {}

function activeEntries(scope: Scope): Prisma.RaffleEntryOperationWhereInput {
  return {
    chainId: scope.chainId,
    ...(scope.userId !== undefined ? { userId: scope.userId } : {}),
    state: { in: ACTIVE_ENTRY_STATES },
  };
}

function decodeCursor(value: unknown): Cursor | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > 1024) throw new InvalidEntryRecoveryCursor();
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Cursor;
    const validDate = (date: unknown) => typeof date === "string" &&
      Number.isFinite(Date.parse(date)) && new Date(date).toISOString() === date;
    if (!cursor || !validDate(cursor.cutoff) || !validDate(cursor.createdAt) ||
        Date.parse(cursor.createdAt) > Date.parse(cursor.cutoff) || typeof cursor.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(cursor.id)) throw new InvalidEntryRecoveryCursor();
    return cursor;
  } catch {
    throw new InvalidEntryRecoveryCursor();
  }
}

export async function getEntryRecoveryStatus(scope: Scope, explorerBaseUrl: string): Promise<EntryRecoveryStatus> {
  const where = activeEntries(scope);
  const [total, operations] = await Promise.all([
    prisma.raffleEntryOperation.count({ where }),
    prisma.raffleEntryOperation.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: PREVIEW_SIZE,
      select: {
        id: true, raffleAddress: true, ticketCount: true, state: true,
        txHash: true, createdAt: true, user: { select: { nickname: true } },
      },
    }),
  ]);
  const rounds = operations.length ? await prisma.raffleSnapshot.findMany({
    where: { raffleAddress: { in: operations.map(operation => operation.raffleAddress) } },
    select: { raffleAddress: true, roundNumber: true },
  }) : [];
  const roundNumbers = new Map(rounds.map(round => [round.raffleAddress, round.roundNumber]));
  return {
    total,
    explorerBaseUrl,
    entries: operations.map(operation => ({
      operationId: operation.id,
      raffleAddress: operation.raffleAddress,
      roundNumber: roundNumbers.get(operation.raffleAddress) ?? null,
      ticketCount: operation.ticketCount,
      state: operation.state === "PREPARING" ? "preparing" : "pending",
      nickname: operation.user.nickname,
      hash: operation.txHash,
      createdAt: operation.createdAt.toISOString(),
    })),
  };
}

/** A click scans a fixed creation-time window, once per operation, across bounded requests. */
export async function recoverEntryBatch(scope: Scope, cursorValue?: unknown): Promise<EntryRecoveryBatch> {
  const cursor = decodeCursor(cursorValue);
  const cutoff = cursor?.cutoff ?? new Date().toISOString();
  const operations = await prisma.raffleEntryOperation.findMany({
    where: {
      ...activeEntries(scope),
      createdAt: { lte: new Date(cutoff) },
      ...(cursor ? {
        AND: [{ OR: [
          { createdAt: { gt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { gt: cursor.id } },
        ] }],
      } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: BATCH_SIZE + 1,
    select: { id: true, createdAt: true },
  });
  const batch = operations.slice(0, BATCH_SIZE);
  const results = await Promise.all(batch.map(async (operation): Promise<EntryRecoveryResult> => {
    try {
      const result = entryOperationResponse(await reconcileEntryOperation(operation.id));
      return { operationId: operation.id, state: result.state };
    } catch {
      return { operationId: operation.id, state: "unavailable" };
    }
  }));
  const last = batch.at(-1);
  const nextCursor = operations.length > BATCH_SIZE && last
    ? Buffer.from(JSON.stringify({ cutoff, createdAt: last.createdAt.toISOString(), id: last.id })).toString("base64url")
    : null;
  return { results, nextCursor };
}
