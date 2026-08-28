import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createNickname, createReferralCode } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import {
  exchangeKakaoCode,
  OAUTH_STATE_COOKIE,
  oauthStateCookie,
} from "@/lib/auth/kakao";
import { attachSessionCookie } from "@/lib/auth/session";
import { clearReferralCookie } from "@/lib/referrals";

function loginRedirect(path: string) {
  return NextResponse.redirect(new URL(path, getAppUrl()));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = loginRedirect("/login?error=kakao");
    response.cookies.set(oauthStateCookie("", 0));
    response.cookies.set(clearReferralCookie());
    return response;
  }

  try {
    const { kakaoId } = await exchangeKakaoCode(code);
    const existing = await prisma.user.findUnique({
      where: { kakaoId },
      include: { wallet: true },
    });

    let user;
    const isNewUser = !existing;
    if (existing) {
      user = existing;
    } else {
      user = await prisma.user.create({
        data: {
          kakaoId,
          nickname: createNickname(),
          referralCode: await createReferralCode(),
        },
      });
    }

    const response = loginRedirect("/onboarding");
    await attachSessionCookie(response, { sub: user.id, kakaoId: user.kakaoId });
    response.cookies.set(oauthStateCookie("", 0));
    const shouldKeepReferral = isNewUser || Boolean(existing && !existing.wallet);
    if (!shouldKeepReferral) {
      response.cookies.set(clearReferralCookie());
    }
    return response;
  } catch {
    const response = loginRedirect("/login?error=kakao");
    response.cookies.set(oauthStateCookie("", 0));
    response.cookies.set(clearReferralCookie());
    return response;
  }
}
