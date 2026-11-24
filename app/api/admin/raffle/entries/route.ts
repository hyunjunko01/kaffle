import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { getChainConfig } from "@/lib/chain/config";
import { getEntryRecoveryStatus, InvalidEntryRecoveryCursor, recoverEntryBatch } from "@/lib/raffle/entry-management";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  try {
    const { chainId, blockExplorerUrl } = getChainConfig();
    return NextResponse.json(await getEntryRecoveryStatus({ chainId }, blockExplorerUrl), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "entry status unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  let body: { cursor?: unknown };
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  try {
    const { chainId } = getChainConfig();
    return NextResponse.json(await recoverEntryBatch({ chainId }, body.cursor));
  } catch (error) {
    const status = error instanceof InvalidEntryRecoveryCursor ? 400 : 503;
    return NextResponse.json({ error: status === 400 ? "invalid cursor" : "entry recovery unavailable" }, { status });
  }
}
