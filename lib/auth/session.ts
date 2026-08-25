import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getSessionSecret } from "@/lib/env";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/session-token";

export { SESSION_COOKIE, type SessionPayload };

export async function attachSessionCookie(
  response: NextResponse,
  payload: SessionPayload,
) {
  const token = await signSession(payload, getSessionSecret());
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifySession(token, getSessionSecret());
  } catch {
    return null;
  }
}
