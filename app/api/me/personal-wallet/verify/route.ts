import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyMessage, type Hex } from "viem";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { prisma } from "@/lib/db";
import { normalizeWalletAddress } from "@/lib/wallet/personal-wallet";

const SIGNATURE_RE = /^0x[a-fA-F0-9]+$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    address?: string;
    nonce?: string;
    signature?: string;
  };

  const address = normalizeWalletAddress(body.address);
  const nonce = body.nonce?.trim();
  const signature = body.signature?.trim();

  if (!address || !nonce || !signature || !SIGNATURE_RE.test(signature)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const challenge = await prisma.walletOwnershipChallenge.findUnique({
    where: { nonce },
  });

  if (
    !challenge ||
    challenge.userId !== user.id ||
    challenge.address !== address
  ) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (challenge.usedAt) {
    return NextResponse.json({ error: "Challenge already used" }, { status: 409 });
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 410 });
  }

  const valid = await verifyMessage({
    address: address as `0x${string}`,
    message: challenge.message,
    signature: signature as Hex,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const personalWallet = await prisma.$transaction(async (tx) => {
      const updated = await tx.walletOwnershipChallenge.updateMany({
        where: {
          id: challenge.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      if (updated.count !== 1) {
        throw new Error("challenge_unavailable");
      }

      const taken = await tx.personalWallet.findUnique({ where: { address } });
      if (taken && taken.userId !== user.id) {
        throw new Error("address_taken");
      }

      return tx.personalWallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, address },
        update: { address, verifiedAt: new Date() },
      });
    });

    return NextResponse.json(
      await toMePayload({
        ...user,
        personalWallet,
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "address_taken") {
        return NextResponse.json(
          { error: "Address already registered" },
          { status: 409 },
        );
      }
      if (error.message === "challenge_unavailable") {
        return NextResponse.json(
          { error: "Challenge already used" },
          { status: 409 },
        );
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Address already registered" },
        { status: 409 },
      );
    }
    throw error;
  }
}
