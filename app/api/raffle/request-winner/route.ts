import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  requestWinner,
  requestWinnerErrorMessage,
} from "@/lib/raffle/request-winner";
import { withWinnerNickname } from "@/lib/raffle/winner";
import { getRaffleEntryTickets, getTicketBalance } from "@/lib/tickets";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await requestWinner();
    const ticketBalance = await getTicketBalance(user.id);
    const userTickets = result.current
      ? await getRaffleEntryTickets(user.id, result.current.address)
      : 0;
    const current = result.current
      ? {
          ...(await withWinnerNickname(result.current)),
          userTickets,
        }
      : null;
    return NextResponse.json({
      ...result,
      current,
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
        message === "RoundOpen" ||
        message === "NoEntries" ||
        message === "AlreadySettled"
          ? 409
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
