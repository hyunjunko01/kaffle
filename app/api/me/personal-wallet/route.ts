import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { prisma } from "@/lib/db";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.personalWallet.deleteMany({
    where: { userId: user.id },
  });

  return NextResponse.json(
    await toMePayload({
      ...user,
      personalWallet: null,
    }),
  );
}
