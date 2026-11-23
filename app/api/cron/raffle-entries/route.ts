import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { reconcilePendingEntries } from "@/lib/raffle/entry-recovery";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "reconciliation unavailable" }, { status: 503 });
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ operations: await reconcilePendingEntries(5) });
  } catch {
    return NextResponse.json({ error: "reconciliation unavailable" }, { status: 503 });
  }
}
