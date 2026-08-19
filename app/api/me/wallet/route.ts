import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser, toMePayload } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { address?: string };
  const address = body.address?.toLowerCase();

  if (!address || !ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
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
