import { createPublicClient, http, type Address, zeroAddress } from "viem";
import { kaffleFactoryAbi } from "@/lib/chain/abis";
import { getChainConfig, getChainSlug, NETWORKS } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";
import {
  cacheRaffleRoundNumberInDb,
  getRaffleRoundNumberFromDb,
} from "@/lib/raffle/snapshot";

const LOG_CHUNK_SIZE = BigInt(9_000);
const ROUND_CACHE_TTL_MS = 60_000;

export type RaffleHistoryEntry = {
  address: Address;
  roundNumber: number;
};

type RoundCache = {
  factory: Address;
  roundsByRaffle: Map<string, number>;
  expiresAt: number;
};

let roundCache: RoundCache | null = null;

function compareCreationOrder(
  left: { blockNumber: bigint; logIndex: number },
  right: { blockNumber: bigint; logIndex: number },
) {
  if (left.blockNumber !== right.blockNumber) {
    return left.blockNumber < right.blockNumber ? -1 : 1;
  }
  return left.logIndex - right.logIndex;
}

export function getDeployScanBlock() {
  const slug = getChainSlug();
  return NETWORKS[slug].factoryDeployBlock ?? BigInt(0);
}

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

async function loadRaffleRoundMap(factory: Address) {
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
      address: factory,
      abi: kaffleFactoryAbi,
      eventName: "RaffleCreated",
      fromBlock: cursor,
      toBlock,
    });
    logs.push(...chunk);
  }

  logs.sort(compareCreationOrder);

  const roundsByRaffle = new Map<string, number>();
  logs.forEach((log, index) => {
    const raffle = log.args.raffle;
    if (raffle) {
      roundsByRaffle.set(raffle.toLowerCase(), index + 1);
    }
  });

  return roundsByRaffle;
}

async function getRaffleRoundMap() {
  const { factory } = getChainConfig();
  const now = Date.now();
  if (
    roundCache &&
    roundCache.factory === factory &&
    roundCache.expiresAt > now
  ) {
    return roundCache.roundsByRaffle;
  }

  const roundsByRaffle = await loadRaffleRoundMap(factory);
  roundCache = {
    factory,
    roundsByRaffle,
    expiresAt: now + ROUND_CACHE_TTL_MS,
  };
  return roundsByRaffle;
}

export async function getRaffleRoundNumber(raffleAddress: string) {
  const normalized = raffleAddress.toLowerCase();
  if (normalized === zeroAddress) {
    return null;
  }

  const fromDb = await getRaffleRoundNumberFromDb(normalized);
  if (fromDb !== null) {
    return fromDb;
  }

  let roundsByRaffle = await getRaffleRoundMap();
  let round = roundsByRaffle.get(normalized);
  if (round === undefined) {
    roundCache = null;
    roundsByRaffle = await getRaffleRoundMap();
    round = roundsByRaffle.get(normalized);
  }

  if (round !== undefined) {
    await cacheRaffleRoundNumberInDb(normalized, round).catch(() => {});
  }

  return round ?? null;
}

export function clearRaffleRoundCache() {
  roundCache = null;
}

export async function getRaffleEntriesNewestFirst(): Promise<RaffleHistoryEntry[]> {
  const roundsByRaffle = await getRaffleRoundMap();
  return Array.from(roundsByRaffle.entries())
    .map(([address, roundNumber]) => ({
      address: address as Address,
      roundNumber,
    }))
    .sort((left, right) => right.roundNumber - left.roundNumber);
}
