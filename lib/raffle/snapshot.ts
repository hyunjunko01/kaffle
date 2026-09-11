import { formatUnits } from "viem";
import { erc20Abi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import { prisma } from "@/lib/db";
import type { CurrentRaffle } from "@/lib/raffle/status";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function normalizeAddress(value: string) {
  return value.toLowerCase();
}

export async function getRaffleRoundNumberFromDb(
  raffleAddress: string,
): Promise<number | null> {
  const snapshot = await prisma.raffleSnapshot.findUnique({
    where: { raffleAddress: normalizeAddress(raffleAddress) },
    select: { roundNumber: true },
  });
  if (!snapshot || snapshot.roundNumber <= 0) {
    return null;
  }
  return snapshot.roundNumber;
}

/** Persist round number after a chain lookup so later reads can skip log scans. */
export async function cacheRaffleRoundNumberInDb(
  raffleAddress: string,
  roundNumber: number,
) {
  if (roundNumber <= 0) {
    return;
  }

  const normalized = normalizeAddress(raffleAddress);
  const existing = await prisma.raffleSnapshot.findUnique({
    where: { raffleAddress: normalized },
    select: { roundNumber: true },
  });
  if (existing) {
    if (existing.roundNumber === roundNumber) {
      return;
    }
    await prisma.raffleSnapshot.update({
      where: { raffleAddress: normalized },
      data: { roundNumber },
    });
    return;
  }

  const { prizeToken } = getChainConfig();
  const client = getPublicClient();
  const [symbol, decimals] = await Promise.all([
    client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  await prisma.raffleSnapshot.create({
    data: {
      raffleAddress: normalized,
      roundNumber,
      prizeAmount: "0",
      symbol,
      tokenDecimals: Number(decimals),
    },
  });
}

export async function upsertRaffleSnapshotFromCurrent(
  current: CurrentRaffle,
  symbol: string,
  tokenDecimals: number,
) {
  const raffleAddress = normalizeAddress(current.address);
  const winnerAddress = current.winner
    ? normalizeAddress(current.winner)
    : null;
  const roundNumber = current.roundNumber ?? 0;

  await prisma.raffleSnapshot.upsert({
    where: { raffleAddress },
    create: {
      raffleAddress,
      roundNumber,
      winnerAddress,
      prizeAmount: current.prizeAmount,
      prizeClaimed: current.prizeClaimed,
      symbol,
      tokenDecimals,
    },
    update: {
      roundNumber,
      winnerAddress,
      prizeAmount: current.prizeAmount,
      prizeClaimed: current.prizeClaimed,
      symbol,
      tokenDecimals,
    },
  });
}

export async function syncCurrentRaffleSnapshotIfStale(
  current: CurrentRaffle,
  symbol: string,
  tokenDecimals: number,
) {
  const raffleAddress = normalizeAddress(current.address);
  const existing = await prisma.raffleSnapshot.findUnique({
    where: { raffleAddress },
  });
  const winnerAddress = current.winner
    ? normalizeAddress(current.winner)
    : null;

  const needsSync =
    !existing ||
    existing.roundNumber !== (current.roundNumber ?? 0) ||
    existing.winnerAddress !== winnerAddress ||
    existing.prizeClaimed !== current.prizeClaimed ||
    existing.prizeAmount !== current.prizeAmount ||
    existing.symbol !== symbol ||
    existing.tokenDecimals !== tokenDecimals;

  if (!needsSync) {
    return;
  }

  await upsertRaffleSnapshotFromCurrent(current, symbol, tokenDecimals);
}

export async function recordPrizeClaim(input: {
  raffleAddress: string;
  winnerAddress: string;
  amountWei: string;
  txHash: string;
  symbol: string;
  prizeAmount: string;
  roundNumber: number;
  tokenDecimals: number;
}) {
  const raffleAddress = normalizeAddress(input.raffleAddress);
  const winnerAddress = normalizeAddress(input.winnerAddress);

  await prisma.$transaction(async (tx) => {
    await tx.raffleSnapshot.upsert({
      where: { raffleAddress },
      create: {
        raffleAddress,
        roundNumber: input.roundNumber,
        winnerAddress,
        prizeAmount: input.prizeAmount,
        prizeClaimed: true,
        symbol: input.symbol,
        tokenDecimals: input.tokenDecimals,
      },
      update: {
        winnerAddress,
        prizeAmount: input.prizeAmount,
        prizeClaimed: true,
        symbol: input.symbol,
        roundNumber: input.roundNumber,
        tokenDecimals: input.tokenDecimals,
      },
    });

    await tx.prizeClaim.upsert({
      where: { txHash: input.txHash },
      create: {
        raffleAddress,
        winnerAddress,
        amountWei: input.amountWei,
        txHash: input.txHash,
      },
      update: {},
    });
  });
}

export type RecentWinnerSnapshot = {
  roundNumber: number;
  winnerAddress: string;
  winnerLabel: string;
  prizeAmount: string;
  symbol: string;
  claimed: boolean;
};

export async function getRecentWinnerFromDb(): Promise<RecentWinnerSnapshot | null> {
  const winners = await getRecentWinnersFromDb(1);
  return winners[0] ?? null;
}

export async function getRecentWinnersFromDb(
  limit = 3,
): Promise<RecentWinnerSnapshot[]> {
  const snapshots = await prisma.raffleSnapshot.findMany({
    where: { winnerAddress: { not: null } },
    orderBy: { roundNumber: "desc" },
    take: limit,
  });

  if (snapshots.length === 0) {
    return [];
  }

  const addresses = snapshots
    .map((s) => s.winnerAddress)
    .filter((a): a is string => a !== null);

  const wallets = await prisma.wallet.findMany({
    where: { address: { in: addresses } },
    include: { user: true },
  });

  const labels = new Map(
    wallets.map((w) => [w.address, w.user.nickname]),
  );

  return snapshots
    .filter((s): s is typeof s & { winnerAddress: string } => s.winnerAddress !== null)
    .map((s) => ({
      roundNumber: s.roundNumber,
      winnerAddress: s.winnerAddress,
      winnerLabel: labels.get(s.winnerAddress) ?? shortAddress(s.winnerAddress),
      prizeAmount: s.prizeAmount,
      symbol: s.symbol,
      claimed: s.prizeClaimed,
    }));
}

export type LeaderboardSnapshotEntry = {
  rank: number;
  winnerAddress: string;
  winnerLabel: string;
  nickname: string | null;
  prizeTotal: string;
  symbol: string;
};

async function buildPrizeLeaderboardFromDb(): Promise<
  LeaderboardSnapshotEntry[]
> {
  const claims = await prisma.prizeClaim.findMany({
    select: {
      winnerAddress: true,
      amountWei: true,
      raffle: {
        select: {
          symbol: true,
          tokenDecimals: true,
        },
      },
    },
  });
  if (claims.length === 0) {
    return [];
  }

  const symbol = claims[0]?.raffle.symbol ?? "";
  const decimals = claims[0]?.raffle.tokenDecimals ?? 6;

  const totals = new Map<string, bigint>();
  for (const claim of claims) {
    const winner = normalizeAddress(claim.winnerAddress);
    const amount = BigInt(claim.amountWei);
    totals.set(winner, (totals.get(winner) ?? BigInt(0)) + amount);
  }

  const ranked = Array.from(totals.entries()).sort((left, right) => {
    if (left[1] === right[1]) {
      return left[0].localeCompare(right[0]);
    }
    return left[1] > right[1] ? -1 : 1;
  });

  const wallets = await prisma.wallet.findMany({
    where: {
      address: { in: ranked.map(([address]) => address) },
    },
    include: { user: true },
  });
  const labels = new Map(
    wallets.map((wallet) => [wallet.address, wallet.user.nickname]),
  );

  return ranked.map(([address, total], index) => {
    const nickname = labels.get(address) ?? null;
    return {
      rank: index + 1,
      winnerAddress: address,
      winnerLabel: nickname ?? shortAddress(address),
      nickname,
      prizeTotal: formatUnits(total, decimals),
      symbol,
    };
  });
}

export async function getPrizeLeaderboardFromDb(
  limit = 3,
  offset = 0,
): Promise<{ entries: LeaderboardSnapshotEntry[]; total: number }> {
  const all = await buildPrizeLeaderboardFromDb();
  return {
    entries: all.slice(offset, offset + limit),
    total: all.length,
  };
}

export async function getLeaderboardPageFromDb(
  page: number,
  pageSize = 10,
): Promise<{
  podium: LeaderboardSnapshotEntry[];
  entries: LeaderboardSnapshotEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}> {
  const all = await buildPrizeLeaderboardFromDb();
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    podium: all.slice(0, 3),
    entries: all.slice(offset, offset + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export async function backfillRaffleHomeFromChain() {
  const { scanRecentWinnerFromChain } = await import("@/lib/raffle/recent-winner");
  const { scanVaultClaimsFromChain } = await import("@/lib/raffle/leaderboard");
  const { getRaffleRoundNumber } = await import("@/lib/raffle/history");
  const { formatUnits } = await import("viem");
  const { erc20Abi } = await import("@/lib/chain/abis");
  const { getChainConfig } = await import("@/lib/chain/config");
  const { getPublicClient } = await import("@/lib/chain/clients");

  const { prizeToken } = getChainConfig();
  const client = getPublicClient();
  const decimals = Number(
    await client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
  const symbol = await client.readContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "symbol",
  });

  const recentWinner = await scanRecentWinnerFromChain();
  if (recentWinner) {
    await upsertRaffleSnapshotFromCurrent(
      {
        address: recentWinner.raffleAddress,
        roundNumber: recentWinner.roundNumber,
        startTime: 0,
        endTime: 0,
        isFinished: true,
        isOpen: false,
        canRequestWinner: false,
        canClaim: false,
        totalTickets: 0,
        winner: recentWinner.winnerAddress,
        prizeAmount: recentWinner.prizeAmount,
        prizeClaimed: recentWinner.claimed,
        prizeAttached: true,
      },
      recentWinner.symbol,
      decimals,
    );
  }

  const chainClaims = await scanVaultClaimsFromChain();
  for (const claim of chainClaims) {
    const roundNumber =
      (await getRaffleRoundNumber(claim.raffleAddress)) ?? 0;
    const prizeAmount = formatUnits(BigInt(claim.amountWei), decimals);

    await recordPrizeClaim({
      raffleAddress: claim.raffleAddress,
      winnerAddress: claim.winnerAddress,
      amountWei: claim.amountWei,
      txHash: claim.txHash,
      symbol,
      prizeAmount,
      roundNumber,
      tokenDecimals: decimals,
    }).catch(() => {
      // skip duplicate txHash on re-run
    });
  }
}
