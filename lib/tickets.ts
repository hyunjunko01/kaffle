import { prisma } from "@/lib/db";

export async function getTicketBalance(userId: string) {
  const rows = await prisma.ticketLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return rows._sum.amount ?? 0;
}
