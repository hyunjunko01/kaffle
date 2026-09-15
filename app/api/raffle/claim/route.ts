import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { claimErrorMessage, claimPrize } from "@/lib/raffle/claim";
import { withWinnerNickname } from "@/lib/raffle/winner";
import { getRaffleEntryTickets, getTicketBalance } from "@/lib/tickets";

type ClaimBody = {
  raffleAddress?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ClaimBody = {};
  try {
    body = (await request.json()) as ClaimBody;
  } catch {
    body = {};
  }

  const raffleAddress =
    typeof body.raffleAddress === "string" && body.raffleAddress.length > 0
      ? body.raffleAddress
      : undefined;

  try {
    if (raffleAddress) {
      if (!user.wallet?.address) {
        return NextResponse.json({ error: "no wallet" }, { status: 400 });
      }
      const result = await claimPrize({
        raffleAddress,
        requireWinnerWallet: user.wallet.address,
      });
      return NextResponse.json(result);
    }

    const result = await claimPrize({});
    const ticketBalance = await getTicketBalance(user.id);
    const currentRaffle = "current" in result ? result.current : null;
    const userTickets = currentRaffle
      ? await getRaffleEntryTickets(user.id, currentRaffle.address)
      : 0;
    const current = currentRaffle
      ? {
          ...(await withWinnerNickname(currentRaffle)),
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
    const message = claimErrorMessage(error);
    if (
      message === "no raffle" ||
      message === "invalid raffle" ||
      message === "no wallet" ||
      message === "NoWinner" ||
      message === "AlreadyClaimed" ||
      message === "PrizeNotAttached" ||
      message === "NotWinner"
    ) {
      const status =
        message === "AlreadyClaimed" ||
        message === "NoWinner" ||
        message === "NotWinner"
          ? 409
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
