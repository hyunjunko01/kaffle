import { getKakaoConfig } from "@/lib/env";

export const OAUTH_STATE_COOKIE = "kaffle_oauth_state";

export function kakaoAuthorizeUrl(state: string) {
  const { restApiKey, redirectUri } = getKakaoConfig();
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", restApiKey);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export function oauthStateCookie(state: string, maxAge = 600) {
  return {
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

type KakaoTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type KakaoUserResponse = {
  id?: number;
};

export async function exchangeKakaoCode(code: string) {
  const { restApiKey, clientSecret, redirectUri } = getKakaoConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    redirect_uri: redirectUri,
    code,
  });

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = (await tokenRes.json()) as KakaoTokenResponse;

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description ?? "Kakao token exchange failed");
  }

  const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const userJson = (await userRes.json()) as KakaoUserResponse;

  if (!userRes.ok || typeof userJson.id !== "number") {
    throw new Error("Kakao user lookup failed");
  }

  return { kakaoId: String(userJson.id) };
}
