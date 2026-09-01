import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  submitUsdcTransferWithAuthorization,
  walletTransferErrorMessage,
} from "@/lib/wallet/transfer";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  let body: {
    recipient?: unknown;
    amount?: unknown;
    nonce?: unknown;
    validAfter?: unknown;
    validBefore?: unknown;
    signature?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (
    typeof body.recipient !== "string" ||
    typeof body.amount !== "string" ||
    typeof body.nonce !== "string" ||
    typeof body.validAfter !== "string" ||
    typeof body.validBefore !== "string" ||
    typeof body.signature !== "string"
  ) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const result = await submitUsdcTransferWithAuthorization({
      walletAddress: user.wallet.address,
      recipient: body.recipient,
      amount: body.amount,
      nonce: body.nonce as `0x${string}`,
      validAfter: body.validAfter,
      validBefore: body.validBefore,
      signature: body.signature as `0x${string}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = walletTransferErrorMessage(error);
    if (
      message === "unsupported chain" ||
      message === "invalid recipient" ||
      message === "invalid amount" ||
      message === "invalid nonce" ||
      message === "authorization expired"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (
      message === "insufficient balance" ||
      message === "authorization already used"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (
      message === "relayer insufficient funds" ||
      message === "ERC3009InvalidSignature" ||
      message === "token does not support EIP-3009"
    ) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    const statusCode = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
