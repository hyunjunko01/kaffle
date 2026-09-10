import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import {
  grantTicketFaucet,
  isTicketFaucetEnabled,
} from "@/lib/missions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTicketFaucetEnabled()) {
    return NextResponse.json(
      { error: "Ticket faucet is only available on Base Sepolia" },
      { status: 403 },
    );
  }

  const completion = await grantTicketFaucet(user.id);
  if (!completion) {
    return NextResponse.json(
      { error: "Ticket faucet claim failed" },
      { status: 409 },
    );
  }

  return NextResponse.json(await toMePayload(user));
}
