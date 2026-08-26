import {
  BaseError,
  ContractFunctionRevertedError,
  type Address,
} from "viem";
import { kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";
import { getRaffleStatus } from "@/lib/raffle/status";

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

/**
 * Pull-based prize payout. Relayer may pay gas; tokens always go to the winner.
 */
export async function claimPrize() {
  await syncChainClock();

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

  const { vault } = getChainConfig();
  const publicClient = getPublicClient();
  const relayer = getRelayerWalletClient();

  const hash = await relayer.writeContract({
    address: vault,
    abi: kaffleVaultAbi,
    functionName: "claim",
    args: [current.address as Address],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("claim transaction failed");
  }

  return {
    hash,
    winner: current.winner,
    ...(await getRaffleStatus()),
  };
}
