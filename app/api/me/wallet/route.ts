import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { prisma } from "@/lib/db";
import {
  MappedWalletVerificationError,
  MappedWalletVerificationUnavailableError,
  normalizeMappedWalletAddress,
  verifyMappedWallet,
} from "@/lib/auth/mapped-wallet-verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { address?: unknown; identityToken?: unknown; accessToken?: unknown };
  try {
    body = (await request.json()) as typeof body;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const submittedAddress = normalizeMappedWalletAddress(body.address);
  if (!submittedAddress) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  let address: string;
  try {
    address = await verifyMappedWallet({
      kakaoId: user.kakaoId,
      address: submittedAddress,
      identityToken: body.identityToken,
      accessToken: body.accessToken,
    });
  } catch (error) {
    if (error instanceof MappedWalletVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof MappedWalletVerificationUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  if (user.wallet) {
    if (user.wallet.address !== address) {
      return NextResponse.json({ error: "Wallet already mapped" }, { status: 409 });
    }
    return NextResponse.json(await toMePayload(user));
  }

  try {
    const wallet = await prisma.wallet.create({
      data: { userId: user.id, address },
    });
    return NextResponse.json(await toMePayload({ ...user, wallet }));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Address already mapped" }, { status: 409 });
    }
    throw error;
  }
}
