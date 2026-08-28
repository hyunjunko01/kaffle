import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/session";
import { getTicketBalance } from "@/lib/tickets";

export async function getCurrentUser() {
  const session = await readSession();
  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.sub },
    include: { wallet: true },
  });
}

export async function createReferralCode() {
  for (let i = 0; i < 8; i += 1) {
    const referralCode = randomBytes(4).toString("hex");
    const existing = await prisma.user.findUnique({ where: { referralCode } });
    if (!existing) {
      return referralCode;
    }
  }

  throw new Error("Could not allocate a referral code");
}

export function createNickname() {
  return `user-${randomBytes(4).toString("hex")}`;
}

export function toMeResponse(
  user: {
    id: string;
    kakaoId: string;
    nickname: string;
    nicknameChangeCount: number;
    referralCode: string;
    createdAt: Date;
    wallet: { address: string } | null;
  },
  ticketBalance: number,
) {
  return {
    user: {
      id: user.id,
      kakaoId: user.kakaoId,
      nickname: user.nickname,
      canChangeNickname: user.nicknameChangeCount === 0,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    },
    wallet: user.wallet ? { address: user.wallet.address } : null,
    ticketBalance,
  };
}

export async function toMePayload(user: {
  id: string;
  kakaoId: string;
  nickname: string;
  nicknameChangeCount: number;
  referralCode: string;
  createdAt: Date;
  wallet: { address: string } | null;
}) {
  return toMeResponse(user, await getTicketBalance(user.id));
}

export type MeResponse = ReturnType<typeof toMeResponse>;
