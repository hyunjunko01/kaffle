import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getChainConfig } from "@/lib/chain/config";
import { claimFaucet, faucetErrorMessage, getFaucetStatus } from "@/lib/faucet";
import { grantOnchainMission } from "@/lib/missions";
import { getTicketBalance } from "@/lib/tickets";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    const [status, ticketBalance] = await Promise.all([
      getFaucetStatus(user.wallet.address),
      getTicketBalance(user.id),
    ]);
    return NextResponse.json({
      ...status,
      ticketBalance,
      wallet: user.wallet.address,
      explorerBaseUrl: getChainConfig().blockExplorerUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "faucet read failed";
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    const result = await claimFaucet(user.wallet.address);
    const { faucet } = await getFaucetStatus(user.wallet.address);
    const completion = await grantOnchainMission(user.id, faucet);
    const [status, ticketBalance] = await Promise.all([
      getFaucetStatus(user.wallet.address),
      getTicketBalance(user.id),
    ]);
    return NextResponse.json({
      ...status,
      ticketBalance,
      wallet: user.wallet.address,
      hash: result.hash,
      missionGranted: Boolean(completion),
      explorerBaseUrl: getChainConfig().blockExplorerUrl,
    });
  } catch (error) {
    const message = faucetErrorMessage(error);
    if (
      message === "AlreadyClaimed" ||
      message === "InsufficientFunds" ||
      message === "InvalidSignature" ||
      message === "Paused" ||
      message === "SignatureExpired"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
