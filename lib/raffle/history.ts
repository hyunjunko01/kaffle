import type { Address } from "viem";
import { createPublicClient, http, zeroAddress } from "viem";
import { getChainConfig, getChainSlug, NETWORKS } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import {
  getRaffleEntriesNewestFirstFromDb,
  getRaffleRoundNumberFromDb,
} from "@/lib/raffle/snapshot";

export type RaffleHistoryEntry = {
  address: Address;
  roundNumber: number;
};

/** Start block for optional chain log scans (leaderboard backfill). */
export function getDeployScanBlock() {
  const slug = getChainSlug();
  return NETWORKS[slug].factoryDeployBlock ?? BigInt(0);
}

/** RPC used for eth_getLogs when the primary provider limits range. */
export function getLogScanClient() {
  const slug = getChainSlug();
  const network = NETWORKS[slug];
  const { chain, rpcUrl } = getChainConfig();
  const logRpcUrl = network.logRpcUrl ?? rpcUrl;
  if (logRpcUrl === rpcUrl) {
    return getPublicClient();
  }
  return createPublicClient({
    chain,
    transport: http(logRpcUrl),
  });
}

/** Round numbers live in RaffleSnapshot; assigned when admin creates a round. */
export async function getRaffleRoundNumber(raffleAddress: string) {
  const normalized = raffleAddress.toLowerCase();
  if (normalized === zeroAddress) {
    return null;
  }
  return getRaffleRoundNumberFromDb(normalized);
}

export async function getRaffleEntriesNewestFirst(): Promise<RaffleHistoryEntry[]> {
  const rows = await getRaffleEntriesNewestFirstFromDb();
  return rows.map((row) => ({
    address: row.raffleAddress as Address,
    roundNumber: row.roundNumber,
  }));
}
