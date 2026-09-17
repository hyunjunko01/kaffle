import { NextResponse } from "next/server";
import { isAdminKakaoId } from "@/lib/admin/allowlist";
import { readSession } from "@/lib/auth/session";

export async function requireAdminSession() {
  const session = await readSession();
  if (!session || !isAdminKakaoId(session.kakaoId)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const };
}
