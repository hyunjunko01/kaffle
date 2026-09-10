import { Prisma } from "@prisma/client";
import { getChainSlug } from "@/lib/chain/config";
import { prisma } from "@/lib/db";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
  countSuccessfulReferrals,
} from "@/lib/referrals";

export const ATTENDANCE_TICKETS = 1;
export const ONCHAIN_TICKETS = 1;
export const KAFFLE_GUIDE_TICKETS = 1;
/** Base Sepolia-only test faucet for wheel / raffle load testing. */
export const TICKET_FAUCET_TICKETS = 20;

export type MissionId =
  | "attendance"
  | "referral"
  | "on-chain"
  | "kaffle-guide"
  | "ticket-faucet";

export type MissionCatalogItem = {
  id: MissionId;
  href: string;
  title: string;
  description: string;
  tickets: number;
};

/** Static mission definitions for v0. Completions live in the DB. */
export const MISSION_CATALOG: MissionCatalogItem[] = [
  {
    id: "kaffle-guide",
    href: "/missions/guide",
    title: "Kaffle 가이드",
    description: "Kaffle이 어떻게 작동하는지 확인하고 티켓을 받습니다.",
    tickets: KAFFLE_GUIDE_TICKETS,
  },
  {
    id: "attendance",
    href: "/missions/attendance",
    title: "출석",
    description: "하루 한 번 출석하고 티켓을 받습니다.",
    tickets: ATTENDANCE_TICKETS,
  },
  {
    id: "referral",
    href: "/missions/invite",
    title: "친구 초대",
    description: "친구를 초대하고 티켓을 받습니다.",
    tickets: REFERRAL_TICKETS,
  },
  {
    id: "on-chain",
    href: "/missions/onchain",
    title: "온체인 미션",
    description: "테스트 토큰을 받고 지갑 트랜잭션을 확인합니다.",
    tickets: ONCHAIN_TICKETS,
  },
  {
    id: "ticket-faucet",
    href: "/missions/ticket-faucet",
    title: "티켓 faucet",
    description: "Base Sepolia 테스트용으로 티켓 20장을 받습니다.",
    tickets: TICKET_FAUCET_TICKETS,
  },
];

export function isTicketFaucetEnabled() {
  return getChainSlug() === "base-sepolia";
}

export function getVisibleMissionCatalog(): MissionCatalogItem[] {
  return MISSION_CATALOG.filter(
    (mission) => mission.id !== "ticket-faucet" || isTicketFaucetEnabled(),
  );
}

export type MissionOverviewItem = MissionCatalogItem & {
  completed: boolean;
  available: boolean;
  statusLabel: string;
  inviteCount?: number;
  inviteCap?: number;
};

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

export async function hasOnchainMissionCompleted(userId: string) {
  const existing = await prisma.missionCompletion.findFirst({
    where: {
      userId,
      mission: "on-chain",
      status: "granted",
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function hasKaffleGuideCompleted(userId: string) {
  const existing = await prisma.missionCompletion.findUnique({
    where: {
      userId_mission_extra: {
        userId,
        mission: "kaffle-guide",
        extra: "",
      },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

/** Hub status for /missions. Catalog is code; completion flags come from DB. */
export async function getMissionsOverview(
  userId: string,
): Promise<MissionOverviewItem[]> {
  const [attendanceDone, inviteCount, onchainDone, guideDone] =
    await Promise.all([
      hasAttendanceToday(userId),
      countSuccessfulReferrals(userId),
      hasOnchainMissionCompleted(userId),
      hasKaffleGuideCompleted(userId),
    ]);

  return getVisibleMissionCatalog().map((mission) => {
    if (mission.id === "kaffle-guide") {
      return {
        ...mission,
        completed: guideDone,
        available: !guideDone,
        statusLabel: guideDone ? "완료" : "가능",
      };
    }
    if (mission.id === "attendance") {
      return {
        ...mission,
        completed: attendanceDone,
        available: !attendanceDone,
        statusLabel: attendanceDone ? "완료" : "가능",
      };
    }
    if (mission.id === "referral") {
      const completed = inviteCount >= REFERRAL_SUCCESS_CAP;
      return {
        ...mission,
        completed,
        available: !completed,
        statusLabel: `${inviteCount}/${REFERRAL_SUCCESS_CAP}`,
        inviteCount,
        inviteCap: REFERRAL_SUCCESS_CAP,
      };
    }
    if (mission.id === "ticket-faucet") {
      return {
        ...mission,
        completed: false,
        available: true,
        statusLabel: "테스트",
      };
    }
    return {
      ...mission,
      completed: onchainDone,
      available: !onchainDone,
      statusLabel: onchainDone ? "완료" : "가능",
    };
  });
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

export async function grantOnchainMission(
  userId: string,
  faucetAddress: string,
) {
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

export async function grantKaffleGuide(userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const completion = await tx.missionCompletion.create({
        data: {
          userId,
          mission: "kaffle-guide",
          status: "granted",
          extra: "",
        },
      });
      await tx.ticketLedger.create({
        data: {
          userId,
          amount: KAFFLE_GUIDE_TICKETS,
          reason: "kaffle-guide",
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

/** Repeatable +20 ticket drip for Base Sepolia animation / load tests. */
export async function grantTicketFaucet(userId: string) {
  if (!isTicketFaucetEnabled()) {
    return null;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const completion = await tx.missionCompletion.create({
        data: {
          userId,
          mission: "ticket-faucet",
          status: "granted",
          // Unique per claim so testers can drip repeatedly.
          extra: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
      });
      await tx.ticketLedger.create({
        data: {
          userId,
          amount: TICKET_FAUCET_TICKETS,
          reason: "ticket-faucet",
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
