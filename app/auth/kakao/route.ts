import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { kakaoAuthorizeUrl, oauthStateCookie } from "@/lib/auth/kakao";
import { clearReferralCookie, referralCookie } from "@/lib/referrals";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ref = url.searchParams.get("ref");
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(kakaoAuthorizeUrl(state));
    response.cookies.set(oauthStateCookie(state));

    if (ref && /^[a-fA-F0-9]{8}$/.test(ref.trim())) {
      response.cookies.set(referralCookie(ref.trim().toLowerCase()));
    } else {
      response.cookies.set(clearReferralCookie());
    }

    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=kakao-config", getAppUrl()),
    );
  }
}
