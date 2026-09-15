import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getUnclaimedPrizesForWallet } from "@/lib/raffle/unclaimed";
import { getChainConfig } from "@/lib/chain/config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet?.address) {
    return NextResponse.json({ error: "no wallet" }, { status: 400 });
  }

  try {
    const items = await getUnclaimedPrizesForWallet(user.wallet.address);
    return NextResponse.json({
      items,
      wallet: user.wallet.address,
      explorerBaseUrl: getChainConfig().blockExplorerUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to load unclaimed prizes";
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
