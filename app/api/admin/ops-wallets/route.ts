import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getOpsWalletStatus } from "@/lib/admin/ops-wallets";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    return NextResponse.json(await getOpsWalletStatus());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ops wallet read failed";
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
