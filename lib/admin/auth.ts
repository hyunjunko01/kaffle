import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { getSessionSecret } from "@/lib/env";

export async function requireAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  try {
    await verifyAdminSession(token, getSessionSecret());
    return { ok: true as const };
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
}
