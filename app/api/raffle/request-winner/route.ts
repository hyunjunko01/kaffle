import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getTicketBalance } from "@/lib/tickets";
import {
  requestWinner,
  requestWinnerErrorMessage,
} from "@/lib/raffle/request-winner";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await requestWinner();
    const ticketBalance = await getTicketBalance(user.id);
    return NextResponse.json({
      ...result,
      ticketBalance,
      wallet: user.wallet?.address ?? null,
      maxTicketsPerEnter: 100,
    });
  } catch (error) {
    const message = requestWinnerErrorMessage(error);
    if (
      message === "no raffle" ||
      message === "RoundOpen" ||
      message === "NoEntries" ||
      message === "AlreadySettled" ||
      message === "AlreadyRequested"
    ) {
      const status =
        message === "RoundOpen" || message === "NoEntries" || message === "AlreadySettled"
          ? 409
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
