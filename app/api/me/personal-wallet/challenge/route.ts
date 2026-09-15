import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db";
import {
  PERSONAL_WALLET_CHALLENGE_TTL_MS,
  buildOwnershipMessage,
  createOwnershipNonce,
  normalizeWalletAddress,
} from "@/lib/wallet/personal-wallet";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { address?: string };
  const address = normalizeWalletAddress(body.address);
  if (!address) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const taken = await prisma.personalWallet.findUnique({ where: { address } });
  if (taken && taken.userId !== user.id) {
    return NextResponse.json(
      { error: "Address already registered" },
      { status: 409 },
    );
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + PERSONAL_WALLET_CHALLENGE_TTL_MS);
  const nonce = createOwnershipNonce();
  const message = buildOwnershipMessage({
    address,
    nonce,
    issuedAt,
    expiresAt,
  });

  await prisma.walletOwnershipChallenge.create({
    data: {
      userId: user.id,
      address,
      nonce,
      message,
      expiresAt,
    },
  });

  return NextResponse.json({
    address,
    nonce,
    message,
    expiresAt: expiresAt.toISOString(),
  });
}
