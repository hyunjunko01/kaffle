import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "kaffle_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export type SessionPayload = {
  sub: string;
  kakaoId: string;
};

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, secret: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey(secret));
}

export async function verifySession(token: string, secret: string) {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256"],
  });

  if (typeof payload.sub !== "string" || typeof payload.kakaoId !== "string") {
    throw new Error("Invalid session");
  }

  return { sub: payload.sub, kakaoId: payload.kakaoId } satisfies SessionPayload;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
