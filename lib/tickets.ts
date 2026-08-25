import { prisma } from "@/lib/db";

export async function getTicketBalance(userId: string) {
  const rows = await prisma.ticketLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return rows._sum.amount ?? 0;
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
