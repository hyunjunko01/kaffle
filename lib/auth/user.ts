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
    include: { wallet: true, personalWallet: true },
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

type MeUserInput = {
  id: string;
  kakaoId: string;
  nickname: string;
  nicknameChangeCount: number;
  postSignupNicknameChanged: boolean;
  referralCode: string;
  createdAt: Date;
  wallet: { address: string } | null;
  personalWallet?: { address: string; verifiedAt: Date } | null;
};

export function toMeResponse(user: MeUserInput, ticketBalance: number) {
  return {
    user: {
      id: user.id,
      kakaoId: user.kakaoId,
      nickname: user.nickname,
      canChangeNickname: !user.postSignupNicknameChanged,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    },
    wallet: user.wallet ? { address: user.wallet.address } : null,
    personalWallet: user.personalWallet
      ? {
          address: user.personalWallet.address,
          verifiedAt: user.personalWallet.verifiedAt.toISOString(),
        }
      : null,
    ticketBalance,
  };
}

export async function toMePayload(user: MeUserInput) {
  return toMeResponse(user, await getTicketBalance(user.id));
}

export type MeResponse = ReturnType<typeof toMeResponse>;
