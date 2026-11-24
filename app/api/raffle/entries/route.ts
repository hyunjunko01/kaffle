import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getChainConfig } from "@/lib/chain/config";
import { getEntryRecoveryStatus, InvalidEntryRecoveryCursor, recoverEntryBatch } from "@/lib/raffle/entry-management";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { chainId, blockExplorerUrl } = getChainConfig();
    return NextResponse.json(await getEntryRecoveryStatus({ chainId, userId: user.id }, blockExplorerUrl), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "entry status unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { cursor?: unknown };
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  try {
    const { chainId } = getChainConfig();
    return NextResponse.json(await recoverEntryBatch({ chainId, userId: user.id }, body.cursor));
  } catch (error) {
    const status = error instanceof InvalidEntryRecoveryCursor ? 400 : 503;
    return NextResponse.json({ error: status === 400 ? "invalid cursor" : "entry recovery unavailable" }, { status });
  }
}
