import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";
import { kaffleAbi, mockVrfCoordinatorAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";
import { getRaffleStatus } from "@/lib/raffle/status";

export function requestWinnerErrorMessage(error: unknown) {
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
  return "requestWinner failed";
}

function readRequestId(logs: { data: Hex; topics: [Hex, ...Hex[]] | [] }[]) {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: kaffleAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "WinnerRequested") {
        return decoded.args.requestId;
      }
    } catch {
      // other logs
    }
  }
  return null;
}

/**
 * Anyone may call requestWinner after the window ends.
 * On Anvil we also fulfill MockVRF so the winner is settled in the same flow.
 */
export async function requestWinner() {
  await syncChainClock();

  const status = await getRaffleStatus();
  const current = status.current;
  if (!current) {
    throw new Error("no raffle");
  }
  if (current.winner) {
    throw new Error("AlreadySettled");
  }
  if (current.isOpen) {
    throw new Error("RoundOpen");
  }
  if (current.totalTickets === 0) {
    throw new Error("NoEntries");
  }

  const { factory, vrfCoordinator, slug } = getChainConfig();
  const publicClient = getPublicClient();
  const relayer = getRelayerWalletClient();
  const raffle = current.address as Address;

  const requestHash = await relayer.writeContract({
    address: raffle,
    abi: kaffleAbi,
    functionName: "requestWinner",
  });
  const requestReceipt = await publicClient.waitForTransactionReceipt({
    hash: requestHash,
  });
  if (requestReceipt.status !== "success") {
    throw new Error("requestWinner transaction failed");
  }

  const requestId = readRequestId(requestReceipt.logs);
  if (requestId == null) {
    throw new Error("WinnerRequested event missing");
  }

  // Local mock Chainlink callback. Real networks fulfill asynchronously.
  if (slug !== "anvil") {
    return {
      requestHash,
      requestId: requestId.toString(),
      ...(await getRaffleStatus()),
    };
  }

  const randomWord = BigInt(Date.now());
  const fulfillHash = await relayer.writeContract({
    address: vrfCoordinator,
    abi: mockVrfCoordinatorAbi,
    functionName: "fulfill",
    args: [factory, requestId, randomWord],
  });
  const fulfillReceipt = await publicClient.waitForTransactionReceipt({
    hash: fulfillHash,
  });
  if (fulfillReceipt.status !== "success") {
    throw new Error("VRF fulfill transaction failed");
  }

  return {
    requestHash,
    fulfillHash,
    requestId: requestId.toString(),
    ...(await getRaffleStatus()),
  };
}
