import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  formatUnits,
  parseUnits,
  zeroAddress,
} from "viem";
import {
  erc20Abi,
  kaffleAbi,
  kaffleFactoryAbi,
  kaffleVaultAbi,
} from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getOwnerWalletClient,
  getPublicClient,
  syncChainClock,
} from "@/lib/chain/clients";

export type CurrentRaffle = {
  address: string;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  isOpen: boolean;
  canRequestWinner: boolean;
  canClaim: boolean;
  totalTickets: number;
  winner: string | null;
  prizeAmount: string;
  prizeClaimed: boolean;
  prizeAttached: boolean;
};

export type RaffleStatus = {
  factory: string;
  symbol: string;
  decimals: number;
  unallocated: string;
  current: CurrentRaffle | null;
};

function formatTs(unix: number) {
  return new Date(unix * 1000).toISOString();
}

export function raffleErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name === "RaffleActive") {
        return "RaffleActive";
      }
      if (name === "InsufficientFunds") {
        return "InsufficientFunds";
      }
      if (name) {
        return name;
      }
    }
    return error.shortMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "createRaffle failed";
}

export async function getRaffleStatus(): Promise<RaffleStatus> {
  await syncChainClock();

  const { factory, vault, prizeToken } = getChainConfig();
  const client = getPublicClient();

  const [currentAddress, unallocated, decimals, symbol] = await Promise.all([
    client.readContract({
      address: factory,
      abi: kaffleFactoryAbi,
      functionName: "currentRaffle",
    }),
    client.readContract({
      address: vault,
      abi: kaffleVaultAbi,
      functionName: "unallocated",
    }),
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

  if (currentAddress === zeroAddress) {
    return {
      factory,
      symbol,
      decimals,
      unallocated: formatUnits(unallocated, decimals),
      current: null,
    };
  }

  const [startTime, endTime, isFinished, winner, prize, totalTickets] =
    await Promise.all([
      client.readContract({
        address: currentAddress,
        abi: kaffleAbi,
        functionName: "startTime",
      }),
      client.readContract({
        address: currentAddress,
        abi: kaffleAbi,
        functionName: "endTime",
      }),
      client.readContract({
        address: currentAddress,
        abi: kaffleAbi,
        functionName: "isFinished",
      }),
      client.readContract({
        address: currentAddress,
        abi: kaffleAbi,
        functionName: "winner",
      }),
      client.readContract({
        address: vault,
        abi: kaffleVaultAbi,
        functionName: "prizeOf",
        args: [currentAddress],
      }),
      client.readContract({
        address: currentAddress,
        abi: kaffleAbi,
        functionName: "totalTickets",
      }),
    ]);

  const [prizeAmount, prizeClaimed, prizeAttached] = prize;
  const start = Number(startTime);
  const end = Number(endTime);
  const block = await client.getBlock();
  const now = Number(block.timestamp);
  const finished =
    Boolean(isFinished) || (now >= end && Number(totalTickets) === 0);
  const open = !finished && now >= start && now < end;
  const winnerAddress = winner === zeroAddress ? null : winner;

  return {
    factory,
    symbol,
    decimals,
    unallocated: formatUnits(unallocated, decimals),
    current: {
      address: currentAddress,
      startTime: start,
      endTime: end,
      isFinished: finished,
      isOpen: open,
      canRequestWinner:
        !open && !finished && !winnerAddress && Number(totalTickets) > 0,
      canClaim: Boolean(winnerAddress) && prizeAttached && !prizeClaimed,
      totalTickets: Number(totalTickets),
      winner: winnerAddress,
      prizeAmount: formatUnits(prizeAmount, decimals),
      prizeClaimed,
      prizeAttached,
    },
  };
}

export async function createRaffle(input: {
  durationSeconds: string;
  prizeAmount: string;
}) {
  await syncChainClock();

  const duration = Number(input.durationSeconds);
  if (!Number.isInteger(duration) || duration <= 0 || duration > Number.MAX_SAFE_INTEGER) {
    throw new Error("invalid duration");
  }
  if (!/^\d+(\.\d+)?$/.test(input.prizeAmount) || Number(input.prizeAmount) <= 0) {
    throw new Error("invalid prize");
  }

  const { factory, prizeToken } = getChainConfig();
  const publicClient = getPublicClient();
  const owner = getOwnerWalletClient();

  const decimals = await publicClient.readContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const prizeAmount = parseUnits(input.prizeAmount, decimals);

  const hash = await owner.writeContract({
    address: factory,
    abi: kaffleFactoryAbi,
    functionName: "createRaffle",
    args: [BigInt(duration), prizeAmount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("createRaffle transaction failed");
  }

  let raffleAddress: string | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: kaffleFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "RaffleCreated") {
        raffleAddress = decoded.args.raffle;
        break;
      }
    } catch {
      // other contracts' logs
    }
  }

  const status = await getRaffleStatus();
  return {
    hash,
    raffle: raffleAddress ?? status.current?.address ?? null,
    startTimeIso: status.current ? formatTs(status.current.startTime) : null,
    endTimeIso: status.current ? formatTs(status.current.endTime) : null,
    ...status,
  };
}
