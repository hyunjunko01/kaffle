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
    return response;
  }

  try {
    const { kakaoId } = await exchangeKakaoCode(code);
    const user = await prisma.user.upsert({
      where: { kakaoId },
      update: {},
      create: {
        kakaoId,
        referralCode: await createReferralCode(),
      },
    });

    const response = loginRedirect("/login?wallet=1");
    await attachSessionCookie(response, { sub: user.id, kakaoId: user.kakaoId });
    response.cookies.set(oauthStateCookie("", 0));
    return response;
  } catch {
    const response = loginRedirect("/login?error=kakao");
    response.cookies.set(oauthStateCookie("", 0));
    return response;
  }
}
