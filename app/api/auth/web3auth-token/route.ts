import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { signWeb3AuthIdToken } from "@/lib/web3auth-jwt";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idToken = await signWeb3AuthIdToken(user.kakaoId);
  return NextResponse.json({ idToken });
}
