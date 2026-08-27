import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Tickets granted to inviter and invitee on a successful signup referral. */
export const REFERRAL_TICKETS = 5;
/** Max successful invites that earn the inviter a reward. */
export const REFERRAL_SUCCESS_CAP = 10;

export const REFERRAL_COOKIE = "kaffle_referral_code";

export function referralCookie(code: string, maxAge = 60 * 60 * 24) {
  return {
    name: REFERRAL_COOKIE,
    value: code,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function clearReferralCookie() {
  return referralCookie("", 0);
}

function normalizeReferralCode(value: string | null | undefined) {
  if (!value) return null;
  const code = value.trim().toLowerCase();
  if (!/^[a-f0-9]{8}$/.test(code)) return null;
  return code;
}

export async function countSuccessfulReferrals(inviterId: string) {
  return prisma.missionCompletion.count({
    where: { userId: inviterId, mission: "referral", status: "granted" },
  });
}

/**
 * On first signup via invite link:
 * - bind invitee → inviter
 * - grant invitee +REFERRAL_TICKETS (once)
 * - grant inviter +REFERRAL_TICKETS if under REFERRAL_SUCCESS_CAP
 * No share/copy reward.
 */
export async function attachReferralOnCreate(input: {
  inviteeUserId: string;
  referralCode: string | null | undefined;
}) {
  const code = normalizeReferralCode(input.referralCode ?? null);
  if (!code) return { applied: false as const };

  const inviter = await prisma.user.findUnique({
    where: { referralCode: code },
  });
  if (!inviter || inviter.id === input.inviteeUserId) {
    return { applied: false as const };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitee = await tx.user.findUnique({
        where: { id: input.inviteeUserId },
      });
      if (!invitee || invitee.referredByUserId) {
        return { applied: false as const };
      }

      await tx.user.update({
        where: { id: invitee.id },
        data: { referredByUserId: inviter.id },
      });

      const inviteeCompletion = await tx.missionCompletion.create({
        data: {
          userId: invitee.id,
          mission: "referral_join",
          status: "granted",
          extra: inviter.id,
        },
      });
      await tx.ticketLedger.create({
        data: {
          userId: invitee.id,
          amount: REFERRAL_TICKETS,
          reason: "referral_join",
          relatedId: inviteeCompletion.id,
        },
      });

      const inviterSuccesses = await tx.missionCompletion.count({
        where: {
          userId: inviter.id,
          mission: "referral",
          status: "granted",
        },
      });

      let inviterRewarded = false;
      if (inviterSuccesses < REFERRAL_SUCCESS_CAP) {
        const inviterCompletion = await tx.missionCompletion.create({
          data: {
            userId: inviter.id,
            mission: "referral",
            status: "granted",
            extra: invitee.id,
          },
        });
        await tx.ticketLedger.create({
          data: {
            userId: inviter.id,
            amount: REFERRAL_TICKETS,
            reason: "referral",
            relatedId: inviterCompletion.id,
          },
        });
        inviterRewarded = true;
      }

      return {
        applied: true as const,
        inviterId: inviter.id,
        inviterRewarded,
      };
    });

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { applied: false as const };
    }
    throw error;
  }
}

/**
 * Apply a referral code after login if the user has none yet.
 */
export async function applyReferralCode(userId: string, rawCode: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("user not found");
  }
  if (user.referredByUserId) {
    throw new Error("already referred");
  }

  const result = await attachReferralOnCreate({
    inviteeUserId: userId,
    referralCode: rawCode,
  });
  if (!result.applied) {
    throw new Error("invalid referral");
  }
  return result;
}
