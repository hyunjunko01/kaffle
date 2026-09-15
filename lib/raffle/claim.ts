import {
  BaseError,
  ContractFunctionRevertedError,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";
import { getRaffleRoundNumber } from "@/lib/raffle/history";
import { getRaffleStatus } from "@/lib/raffle/status";
import { recordPrizeClaim } from "@/lib/raffle/snapshot";
import { readClaimablePrize } from "@/lib/raffle/unclaimed";

export function claimErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      return revert.data.errorName;
    }
    return error.shortMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "claim failed";
}

export type ClaimPrizeInput = {
  /** Claim a specific raffle. Defaults to the current factory raffle. */
  raffleAddress?: string;
  /**
   * When set with raffleAddress, require this wallet to be the on-chain winner.
   * Used by the profile unclaimed flow.
   */
  requireWinnerWallet?: string;
};

/**
 * Pull-based prize payout. Relayer may pay gas; tokens always go to the winner.
 */
export async function claimPrize(input: ClaimPrizeInput = {}) {
  await syncChainClock();

  const { vault } = getChainConfig();
  const publicClient = getPublicClient();
  const relayer = getRelayerWalletClient();

  let raffleAddress: Address;
  let winnerAddress: string;
  let prizeAmount: string;
  let amountWei: bigint;
  let decimals: number;
  let symbol: string;
  let roundNumber: number;

  if (input.raffleAddress) {
    if (!isAddress(input.raffleAddress)) {
      throw new Error("invalid raffle");
    }
    raffleAddress = getAddress(input.raffleAddress);
    const prize = await readClaimablePrize(raffleAddress);

    if (!prize.winnerAddress) {
      throw new Error("NoWinner");
    }
    if (prize.prizeClaimed) {
      throw new Error("AlreadyClaimed");
    }
    if (!prize.prizeAttached) {
      throw new Error("PrizeNotAttached");
    }
    if (
      input.requireWinnerWallet &&
      prize.winnerAddress !== input.requireWinnerWallet.toLowerCase()
    ) {
      throw new Error("NotWinner");
    }

    const round = await getRaffleRoundNumber(raffleAddress);
    winnerAddress = prize.winnerAddress;
    prizeAmount = prize.prizeAmount;
    amountWei = prize.amountWei;
    decimals = prize.decimals;
    symbol = prize.symbol;
    roundNumber = round ?? 0;
  } else {
    const status = await getRaffleStatus();
    const current = status.current;
    if (!current) {
      throw new Error("no raffle");
    }
    if (!current.winner) {
      throw new Error("NoWinner");
    }
    if (current.prizeClaimed) {
      throw new Error("AlreadyClaimed");
    }
    if (!current.prizeAttached) {
      throw new Error("PrizeNotAttached");
    }

    raffleAddress = getAddress(current.address);
    winnerAddress = current.winner.toLowerCase();
    prizeAmount = current.prizeAmount;
    decimals = status.decimals;
    symbol = status.symbol;
    roundNumber = current.roundNumber ?? 0;
    amountWei = parseUnits(current.prizeAmount, status.decimals);
  }

  const hash = await relayer.writeContract({
    address: vault,
    abi: kaffleVaultAbi,
    functionName: "claim",
    args: [raffleAddress],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("claim transaction failed");
  }

  await recordPrizeClaim({
    raffleAddress: raffleAddress.toLowerCase(),
    winnerAddress,
    amountWei: amountWei.toString(),
    txHash: hash,
    symbol,
    prizeAmount,
    roundNumber,
    tokenDecimals: decimals,
  });

  if (input.raffleAddress) {
    return {
      hash,
      winner: winnerAddress,
      raffleAddress: raffleAddress.toLowerCase(),
      roundNumber,
      prizeAmount,
      symbol,
    };
  }

  const updated = await getRaffleStatus();
  return {
    hash,
    winner: winnerAddress,
    ...updated,
  };
}
