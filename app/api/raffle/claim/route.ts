import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { claimErrorMessage, claimPrize } from "@/lib/raffle/claim";
import { getTicketBalance } from "@/lib/tickets";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await claimPrize();
    const ticketBalance = await getTicketBalance(user.id);
    return NextResponse.json({
      ...result,
      ticketBalance,
      wallet: user.wallet?.address ?? null,
      maxTicketsPerEnter: 100,
    });
  } catch (error) {
    const message = claimErrorMessage(error);
    if (
      message === "no raffle" ||
      message === "NoWinner" ||
      message === "AlreadyClaimed" ||
      message === "PrizeNotAttached"
    ) {
      const status =
        message === "AlreadyClaimed" || message === "NoWinner" ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
