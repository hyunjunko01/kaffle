import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRaffleStatus } from "@/lib/raffle";
import { getTicketBalance } from "@/lib/tickets";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [status, ticketBalance] = await Promise.all([
      getRaffleStatus(),
      getTicketBalance(user.id),
    ]);
    return NextResponse.json({
      ...status,
      ticketBalance,
      wallet: user.wallet?.address ?? null,
      maxTicketsPerEnter: 100,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "raffle read failed";
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
