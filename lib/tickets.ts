import { prisma } from "@/lib/db";

export async function getTicketBalance(userId: string) {
  const rows = await prisma.ticketLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return rows._sum.amount ?? 0;
}

export async function getRaffleEntryTickets(userId: string, raffleAddress: string) {
  const rows = await prisma.ticketLedger.aggregate({
    where: {
      userId,
      relatedId: raffleAddress.toLowerCase(),
      reason: { in: ["raffle_entry", "raffle_entry_refund"] },
    },
    _sum: { amount: true },
  });
  return Math.max(0, -(rows._sum.amount ?? 0));
}

export type RoundParticipant = {
  userId: string;
  nickname: string;
  ticketCount: number;
  walletAddress: string | null;
};

export async function getRoundParticipants(
  raffleAddress: string,
  limit = 500,
): Promise<RoundParticipant[]> {
  const address = raffleAddress.toLowerCase();
  const grouped = await prisma.ticketLedger.groupBy({
    by: ["userId"],
    where: {
      relatedId: address,
      reason: { in: ["raffle_entry", "raffle_entry_refund"] },
    },
    _sum: { amount: true },
  });

  const scored = grouped
    .map((row) => ({
      userId: row.userId,
      ticketCount: Math.max(0, -(row._sum.amount ?? 0)),
    }))
    .filter((row) => row.ticketCount > 0)
    .sort(
      (a, b) =>
        b.ticketCount - a.ticketCount || a.userId.localeCompare(b.userId),
    )
    .slice(0, Math.max(1, limit));

  if (scored.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: scored.map((row) => row.userId) } },
    select: {
      id: true,
      nickname: true,
      wallet: { select: { address: true } },
    },
  });
  const byId = new Map(
    users.map((user) => [
      user.id,
      {
        nickname: user.nickname,
        walletAddress: user.wallet?.address ?? null,
      },
    ]),
  );

  return scored.map((row) => {
    const user = byId.get(row.userId);
    return {
      userId: row.userId,
      nickname: user?.nickname ?? "참여자",
      ticketCount: row.ticketCount,
      walletAddress: user?.walletAddress ?? null,
    };
  });
}

export async function spendTickets(input: {
  userId: string;
  amount: number;
  reason: string;
  relatedId: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("invalid ticket amount");
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.ticketLedger.aggregate({
      where: { userId: input.userId },
      _sum: { amount: true },
    });
    const balance = rows._sum.amount ?? 0;
    if (balance < input.amount) {
      throw new Error("insufficient tickets");
    }

    return tx.ticketLedger.create({
      data: {
        userId: input.userId,
        amount: -input.amount,
        reason: input.reason,
        relatedId: input.relatedId,
      },
    });
  });
}

export async function refundTickets(input: {
  userId: string;
  amount: number;
  reason: string;
  relatedId: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("invalid ticket amount");
  }

  return prisma.ticketLedger.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      relatedId: input.relatedId,
    },
  });
}
