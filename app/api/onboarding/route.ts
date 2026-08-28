import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  validateNickname,
} from "@/lib/auth/profile";
import { prisma } from "@/lib/db";
import {
  REFERRAL_COOKIE,
  attachReferralOnCreate,
  clearReferralCookie,
} from "@/lib/referrals";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const REFERRAL_RE = /^[a-f0-9]{8}$/;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  const cookieStore = await cookies();
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null;

  return NextResponse.json({
    user: {
      nickname: user.nickname,
      canChangeNickname: user.nicknameChangeCount === 0,
      wallet: user.wallet?.address ?? null,
    },
    referralCode: referralCode && REFERRAL_RE.test(referralCode) ? referralCode : null,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  let body: {
    nickname?: unknown;
    walletAddress?: unknown;
    referralCode?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("invalid request");
  }

  let nickname: string;
  try {
    nickname = validateNickname(body.nickname);
  } catch {
    return errorResponse(
      `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자의 한글, 영문, 숫자, 공백, 하이픈, 밑줄만 사용할 수 있습니다.`,
    );
  }

  if (
    typeof body.walletAddress !== "string" ||
    !ADDRESS_RE.test(body.walletAddress)
  ) {
    return errorResponse("invalid wallet");
  }
  const walletAddress = body.walletAddress.toLowerCase();

  const cookieStore = await cookies();
  const cookieReferralCode = cookieStore.get(REFERRAL_COOKIE)?.value;
  const submittedReferralCode =
    typeof body.referralCode === "string" ? body.referralCode : null;
  const rawReferralCode = cookieReferralCode ?? submittedReferralCode;
  const referralCode = rawReferralCode?.trim().toLowerCase() ?? null;

  if (referralCode && !REFERRAL_RE.test(referralCode)) {
    return errorResponse("invalid referral");
  }

  if (referralCode) {
    const inviter = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!inviter || inviter.id === user.id) {
      return errorResponse("invalid referral");
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: user.id },
        include: { wallet: true },
      });
      if (!current) {
        throw new Error("user not found");
      }

      if (current.nickname !== nickname && current.nicknameChangeCount >= 1) {
        throw new Error("nickname change exhausted");
      }

      if (current.wallet && current.wallet.address !== walletAddress) {
        throw new Error("wallet already mapped");
      }

      if (current.nickname !== nickname) {
        const nicknameUpdate = await tx.user.updateMany({
          where: { id: current.id, nicknameChangeCount: 0 },
          data: {
            nickname,
            nicknameChangeCount: { increment: 1 },
          },
        });
        if (nicknameUpdate.count === 0) {
          throw new Error("nickname change exhausted");
        }
      }

      if (!current.wallet) {
        await tx.wallet.create({
          data: { userId: current.id, address: walletAddress },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("wallet already mapped", 409);
    }
    if (error instanceof Error && error.message === "nickname change exhausted") {
      return errorResponse("nickname change exhausted", 409);
    }
    if (error instanceof Error && error.message === "wallet already mapped") {
      return errorResponse("wallet already mapped", 409);
    }
    throw error;
  }

  if (referralCode && !user.referredByUserId) {
    await attachReferralOnCreate({
      inviteeUserId: user.id,
      referralCode,
    });
  }

  const finalUser = await getCurrentUser();
  if (!finalUser) {
    return errorResponse("user not found", 404);
  }

  const response = NextResponse.json(await toMePayload(finalUser));
  response.cookies.set(clearReferralCookie());
  return response;
}
