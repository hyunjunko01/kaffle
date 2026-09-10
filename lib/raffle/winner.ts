import { prisma } from "@/lib/db";

export async function getNicknameByWalletAddress(
  address: string | null | undefined,
): Promise<string | null> {
  if (!address) {
    return null;
  }

  const wallet = await prisma.wallet.findUnique({
    where: { address: address.toLowerCase() },
    select: { user: { select: { nickname: true } } },
  });

  return wallet?.user.nickname ?? null;
}

export async function withWinnerNickname<
  T extends { winner: string | null },
>(current: T): Promise<T & { winnerNickname: string | null }> {
  return {
    ...current,
    winnerNickname: await getNicknameByWalletAddress(current.winner),
  };
}
