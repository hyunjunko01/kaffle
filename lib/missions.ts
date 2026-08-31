import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const ATTENDANCE_TICKETS = 1;
export const ONCHAIN_TICKETS = 1;

export function seoulDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function hasAttendanceToday(userId: string) {
  const extra = seoulDateKey();
  const existing = await prisma.missionCompletion.findUnique({
    where: {
      userId_mission_extra: {
        userId,
        mission: "attendance",
        extra,
      },
    },
  });
  return Boolean(existing);
}

export async function grantAttendance(userId: string) {
  const extra = seoulDateKey();

  try {
    return await prisma.$transaction(async (tx) => {
      const completion = await tx.missionCompletion.create({
        data: {
          userId,
          mission: "attendance",
          status: "granted",
          extra,
        },
      });
      await tx.ticketLedger.create({
        data: {
          userId,
          amount: ATTENDANCE_TICKETS,
          reason: "attendance",
          relatedId: completion.id,
        },
      });
      return completion;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

export async function grantOnchainMission(userId: string, faucetAddress: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const completion = await tx.missionCompletion.create({
        data: {
          userId,
          mission: "on-chain",
          status: "granted",
          extra: faucetAddress.toLowerCase(),
        },
      });
      await tx.ticketLedger.create({
        data: {
          userId,
          amount: ONCHAIN_TICKETS,
          reason: "on-chain",
          relatedId: completion.id,
        },
      });
      return completion;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}
