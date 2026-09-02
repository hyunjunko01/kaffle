import { formatUnits, type Address } from "viem";
import { erc20Abi, kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import { prisma } from "@/lib/db";
import { getDeployScanBlock, getLogScanClient } from "@/lib/raffle/history";

const LOG_CHUNK_SIZE = BigInt(9_000);
const LEADERBOARD_CACHE_TTL_MS = 60_000;
const MAX_CACHED_ENTRIES = 10;
const DEFAULT_LIMIT = 3;

export type LeaderboardEntry = {
  rank: number;
  winnerAddress: string;
  winnerLabel: string;
  prizeTotal: string;
  symbol: string;
};

type LeaderboardCache = {
  vault: Address;
  entries: LeaderboardEntry[];
  expiresAt: number;
};

let leaderboardCache: LeaderboardCache | null = null;

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function loadVaultClaimedLogs(vault: Address) {
  const client = getLogScanClient();
  const fromBlock = getDeployScanBlock();
  const latest = await client.getBlockNumber();
  const logs = [];

  for (
    let cursor = fromBlock;
    cursor <= latest;
    cursor += LOG_CHUNK_SIZE + BigInt(1)
  ) {
    const toBlock =
      cursor + LOG_CHUNK_SIZE > latest ? latest : cursor + LOG_CHUNK_SIZE;
    const chunk = await client.getContractEvents({
      address: vault,
      abi: kaffleVaultAbi,
      eventName: "Claimed",
      fromBlock: cursor,
      toBlock,
    });
    logs.push(...chunk);
  }

  return logs;
}

async function buildLeaderboard(limit: number) {
  const { vault, prizeToken } = getChainConfig();
  const client = getPublicClient();
  const [decimals, symbol, logs] = await Promise.all([
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
    loadVaultClaimedLogs(vault),
  ]);

  const totals = new Map<string, bigint>();
  for (const log of logs) {
    const winner = log.args.winner?.toLowerCase();
    const amount = log.args.amount;
    if (!winner || amount === undefined) {
      continue;
    }
    totals.set(winner, (totals.get(winner) ?? BigInt(0)) + amount);
  }

  const ranked = Array.from(totals.entries())
    .sort((left, right) => {
      if (left[1] === right[1]) {
        return left[0].localeCompare(right[0]);
      }
      return left[1] > right[1] ? -1 : 1;
    })
    .slice(0, limit);

  if (ranked.length === 0) {
    return [];
  }

  const wallets = await prisma.wallet.findMany({
    where: {
      address: { in: ranked.map(([address]) => address) },
    },
    include: { user: true },
  });
  const labels = new Map(
    wallets.map((wallet) => [wallet.address, wallet.user.nickname]),
  );

  return ranked.map(([address, total], index) => ({
    rank: index + 1,
    winnerAddress: address,
    winnerLabel: labels.get(address) ?? shortAddress(address),
    prizeTotal: formatUnits(total, decimals),
    symbol,
  }));
}

export async function getPrizeLeaderboard(
  limit = DEFAULT_LIMIT,
): Promise<LeaderboardEntry[]> {
  const { vault } = getChainConfig();
  const now = Date.now();
  if (
    leaderboardCache &&
    leaderboardCache.vault === vault &&
    leaderboardCache.expiresAt > now
  ) {
    return leaderboardCache.entries.slice(0, limit);
  }

  const entries = await buildLeaderboard(MAX_CACHED_ENTRIES);
  leaderboardCache = {
    vault,
    entries,
    expiresAt: now + LEADERBOARD_CACHE_TTL_MS,
  };
  return entries.slice(0, limit);
}

export function clearPrizeLeaderboardCache() {
  leaderboardCache = null;
}
