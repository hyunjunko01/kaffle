import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getWalletStatus } from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getWalletStatus(user.wallet.address));
  } catch (error) {
    const message = error instanceof Error ? error.message : "wallet read failed";
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
