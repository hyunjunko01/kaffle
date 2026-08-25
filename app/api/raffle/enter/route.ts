import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { enterErrorMessage, enterRaffle } from "@/lib/enter";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  let ticketCount: unknown;
  try {
    ({ ticketCount } = (await request.json()) as { ticketCount?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (typeof ticketCount !== "number" && typeof ticketCount !== "string") {
    return NextResponse.json({ error: "invalid ticket count" }, { status: 400 });
  }

  const count = typeof ticketCount === "number" ? ticketCount : Number(ticketCount);
  if (!Number.isInteger(count)) {
    return NextResponse.json({ error: "invalid ticket count" }, { status: 400 });
  }

  try {
    const result = await enterRaffle({
      userId: user.id,
      walletAddress: user.wallet.address,
      ticketCount: count,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = enterErrorMessage(error);
    if (
      message === "invalid ticket count" ||
      message === "insufficient tickets" ||
      message === "no raffle" ||
      message === "RoundClosed"
    ) {
      const status =
        message === "insufficient tickets" || message === "RoundClosed" ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
