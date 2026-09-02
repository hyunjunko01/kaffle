import { formatUnits, zeroAddress } from "viem";
import { erc20Abi, kaffleAbi, kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import { prisma } from "@/lib/db";
import { getRaffleEntriesNewestFirst } from "@/lib/raffle/history";
import {
  getRecentWinnerFromDb,
  type RecentWinnerSnapshot,
} from "@/lib/raffle/snapshot";

export type RecentWinner = RecentWinnerSnapshot;

export type ChainRecentWinner = RecentWinnerSnapshot & {
  raffleAddress: string;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export async function scanRecentWinnerFromChain(): Promise<ChainRecentWinner | null> {
  const { vault, prizeToken } = getChainConfig();
  const client = getPublicClient();
  const raffles = await getRaffleEntriesNewestFirst();
  if (raffles.length === 0) {
    return null;
  }

  const [decimals, symbol] = await Promise.all([
    client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
    client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "symbol",
    }),
  ]);

  for (const raffle of raffles) {
    const winner = await client.readContract({
      address: raffle.address,
      abi: kaffleAbi,
      functionName: "winner",
    });
    if (winner === zeroAddress) {
      continue;
    }

    const [prizeAmount, prizeClaimed] = await client.readContract({
      address: vault,
      abi: kaffleVaultAbi,
      functionName: "prizeOf",
      args: [raffle.address],
    });

    const wallet = await prisma.wallet.findUnique({
      where: { address: winner.toLowerCase() },
      include: { user: true },
    });

    return {
      raffleAddress: raffle.address.toLowerCase(),
      roundNumber: raffle.roundNumber,
      winnerAddress: winner.toLowerCase(),
      winnerLabel: wallet?.user.nickname ?? shortAddress(winner),
      prizeAmount: formatUnits(prizeAmount, decimals),
      symbol,
      claimed: prizeClaimed,
    };
  }

  return null;
}

export async function getRecentWinner(): Promise<RecentWinner | null> {
  return getRecentWinnerFromDb();
}
