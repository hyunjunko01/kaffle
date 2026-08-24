import { SignJWT, jwtVerify } from "jose";
import { sessionCookieOptions } from "@/lib/session-token";

export const ADMIN_COOKIE = "kaffle_admin";
export const ADMIN_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(secret: string) {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MAX_AGE}s`)
    .sign(secretKey(secret));
}

export async function verifyAdminSession(token: string, secret: string) {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    algorithms: ["HS256"],
  });

  if (payload.role !== "admin") {
    throw new Error("Invalid admin session");
  }
}

export function adminCookieOptions(maxAge = ADMIN_MAX_AGE) {
  return { ...sessionCookieOptions(maxAge) };
}
