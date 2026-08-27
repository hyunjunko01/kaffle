import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createReferralCode } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import {
  exchangeKakaoCode,
  OAUTH_STATE_COOKIE,
  oauthStateCookie,
} from "@/lib/auth/kakao";
import { attachSessionCookie } from "@/lib/auth/session";
import {
  REFERRAL_COOKIE,
  attachReferralOnCreate,
  clearReferralCookie,
} from "@/lib/referrals";

function loginRedirect(path: string) {
  return NextResponse.redirect(new URL(path, getAppUrl()));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? null;

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = loginRedirect("/login?error=kakao");
    response.cookies.set(oauthStateCookie("", 0));
    response.cookies.set(clearReferralCookie());
    return response;
  }

  try {
    const { kakaoId } = await exchangeKakaoCode(code);
    const existing = await prisma.user.findUnique({ where: { kakaoId } });

    let user;
    if (existing) {
      user = existing;
    } else {
      user = await prisma.user.create({
        data: {
          kakaoId,
          referralCode: await createReferralCode(),
        },
      });
      await attachReferralOnCreate({
        inviteeUserId: user.id,
        referralCode,
      });
    }

    const response = loginRedirect("/login?wallet=1");
    await attachSessionCookie(response, { sub: user.id, kakaoId: user.kakaoId });
    response.cookies.set(oauthStateCookie("", 0));
    response.cookies.set(clearReferralCookie());
    return response;
  } catch {
    const response = loginRedirect("/login?error=kakao");
    response.cookies.set(oauthStateCookie("", 0));
    response.cookies.set(clearReferralCookie());
    return response;
  }
}
