import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/env";
import { kakaoAuthorizeUrl, oauthStateCookie } from "@/lib/kakao";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(kakaoAuthorizeUrl(state));
    const cookie = oauthStateCookie(state);
    response.cookies.set(cookie);
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=kakao-config", getAppUrl()),
    );
  }
}
