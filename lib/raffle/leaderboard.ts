import { formatUnits, type Address } from "viem";
import { erc20Abi, kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import { prisma } from "@/lib/db";
import { getDeployScanBlock, getLogScanClient } from "@/lib/raffle/history";
import {
  getLeaderboardPageFromDb,
  getPrizeLeaderboardFromDb,
  type LeaderboardSnapshotEntry,
} from "@/lib/raffle/snapshot";

const LOG_CHUNK_SIZE = BigInt(9_000);
const DEFAULT_LIMIT = 3;
const PAGE_SIZE = 10;

export type LeaderboardEntry = LeaderboardSnapshotEntry;

export type ChainPrizeClaim = {
  raffleAddress: string;
  winnerAddress: string;
  amountWei: string;
  txHash: string;
};

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

export async function scanVaultClaimsFromChain(): Promise<ChainPrizeClaim[]> {
  const { vault } = getChainConfig();
  const logs = await loadVaultClaimedLogs(vault);
  const claims: ChainPrizeClaim[] = [];

  for (const log of logs) {
    const raffle = log.args.raffle;
    const winner = log.args.winner;
    const amount = log.args.amount;
    const txHash = log.transactionHash;
    if (!raffle || !winner || amount === undefined || !txHash) {
      continue;
    }
    claims.push({
      raffleAddress: raffle.toLowerCase(),
      winnerAddress: winner.toLowerCase(),
      amountWei: amount.toString(),
      txHash,
    });
  }

  return claims;
}

export async function buildLeaderboardFromChain(limit: number) {
  const { prizeToken } = getChainConfig();
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
    loadVaultClaimedLogs(getChainConfig().vault),
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

export async function getPrizeLeaderboard(
  limit = DEFAULT_LIMIT,
  offset = 0,
): Promise<LeaderboardEntry[]> {
  const { entries } = await getPrizeLeaderboardFromDb(limit, offset);
  return entries;
}

export async function getLeaderboardPage(page: number) {
  return getLeaderboardPageFromDb(page, PAGE_SIZE);
}
