import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getRaffleStatus } from "@/lib/raffle/status";
import { withWinnerNickname } from "@/lib/raffle/winner";
import {
  getRaffleEntryTickets,
  getRoundParticipants,
  getTicketBalance,
} from "@/lib/tickets";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = await getRaffleStatus();
    const [ticketBalance, userTickets, participants] = await Promise.all([
      getTicketBalance(user.id),
      status.current
        ? getRaffleEntryTickets(user.id, status.current.address)
        : Promise.resolve(0),
      status.current
        ? getRoundParticipants(status.current.address)
        : Promise.resolve([]),
    ]);
    const current = status.current
      ? {
          ...(await withWinnerNickname(status.current)),
          userTickets,
        }
      : null;
    return NextResponse.json({
      ...status,
      current,
      ticketBalance,
      wallet: user.wallet?.address ?? null,
      maxTicketsPerEnter: 100,
      participants,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "raffle read failed";
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
