import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import { createRaffle, getRaffleStatus, raffleErrorMessage } from "@/lib/raffle/status";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    return NextResponse.json(await getRaffleStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "raffle read failed";
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  let durationSeconds: unknown;
  let prizeAmount: unknown;
  try {
    ({ durationSeconds, prizeAmount } = (await request.json()) as {
      durationSeconds?: unknown;
      prizeAmount?: unknown;
    });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (typeof durationSeconds !== "string" || typeof prizeAmount !== "string") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const result = await createRaffle({
      durationSeconds: durationSeconds.trim(),
      prizeAmount: prizeAmount.trim(),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = raffleErrorMessage(error);
    if (message === "invalid duration" || message === "invalid prize") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "RaffleActive" || message === "InsufficientFunds") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
