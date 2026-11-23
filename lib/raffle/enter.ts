import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { kaffleAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";
import { getRaffleStatus } from "@/lib/raffle/status";
import { findEntryByRequest, reserveEntry, savePreparedEntry, failEntry, readEntry, releaseEntryLease } from "@/lib/raffle/entry-store";
import { entryOperationResponse, reconcileEntryOperation, submitPreparedEntry } from "@/lib/raffle/entry-recovery";

export const MAX_TICKETS_PER_ENTER = 100;
const SIGNATURE_TTL_SECONDS = 10 * 60;

const enterTypes = {
  Enter: [
    { name: "user", type: "address" },
    { name: "raffle", type: "address" },
    { name: "ticketCount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function enterErrorMessage(error: unknown) {
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
  return "enter failed";
}

export async function enterRaffle(input: {
  userId: string;
  requestId: string;
  walletAddress: string;
  ticketCount: number;
}) {
  const ticketCount = input.ticketCount;
  if (
    !Number.isInteger(ticketCount) ||
    ticketCount <= 0 ||
    ticketCount > MAX_TICKETS_PER_ENTER
  ) {
    throw new Error("invalid ticket count");
  }

  const { chainId, ticketSigner } = getChainConfig();
  const replay = await findEntryByRequest(input.userId, input.requestId);
  if (replay) {
    if (replay.ticketCount !== ticketCount || replay.chainId !== chainId ||
      replay.walletAddress !== input.walletAddress.toLowerCase()) {
      throw new Error("entry request conflict");
    }
    return entryOperationResponse(await reconcileEntryOperation(replay.id));
  }

  await syncChainClock();

  const status = await getRaffleStatus();
  const current = status.current;
  if (!current) {
    throw new Error("no raffle");
  }
  if (!current.isOpen) {
    throw new Error("RoundClosed");
  }

  const user = input.walletAddress.toLowerCase() as Address;
  const raffle = current.address as Address;
  const publicClient = getPublicClient();
  const relayer = getRelayerWalletClient();

  const { operation, created } = await reserveEntry({
    userId: input.userId,
    requestId: input.requestId,
    chainId,
    raffleAddress: raffle.toLowerCase(),
    walletAddress: user,
    ticketCount,
  });
  if (!created) {
    if (operation.ticketCount !== ticketCount || operation.chainId !== chainId || operation.walletAddress !== user) {
      throw new Error("entry request conflict");
    }
    return entryOperationResponse(await reconcileEntryOperation(operation.id));
  }

  let prepared: {
    rawTransaction: Hex;
    txHash: Hex;
    entryNonce: string;
    deadline: bigint;
    startBlock: bigint;
  };
  try {
    // Read the nonce only after reserving the user: no other entry can be prepared concurrently.
    const block = await publicClient.getBlock();
    if (block.number === null) throw new Error("entry block unavailable");
    const nonce = await publicClient.readContract({
      address: raffle, abi: kaffleAbi, functionName: "nonce", args: [user], blockNumber: block.number,
    });
    const deadline = block.timestamp + BigInt(SIGNATURE_TTL_SECONDS) < BigInt(current.endTime)
      ? block.timestamp + BigInt(SIGNATURE_TTL_SECONDS) : BigInt(current.endTime);
    const signature = await ticketSigner.signTypedData({
      domain: { name: "Kaffle", version: "1", chainId, verifyingContract: raffle },
      types: enterTypes,
      primaryType: "Enter",
      message: { user, raffle, ticketCount: BigInt(ticketCount), nonce, deadline },
    });
    const request = await relayer.prepareTransactionRequest({
      account: relayer.account,
      to: raffle,
      data: encodeFunctionData({
        abi: kaffleAbi,
        functionName: "enter",
        args: [user, BigInt(ticketCount), deadline, signature as Hex],
      }),
    });
    const rawTransaction = await relayer.signTransaction(request);
    prepared = { rawTransaction, txHash: keccak256(rawTransaction), entryNonce: nonce.toString(), deadline, startBlock: block.number };
    const saved = await savePreparedEntry(operation, prepared);
    if (!saved) return entryOperationResponse(await readEntry(operation.id));
  } catch {
    // No broadcast occurs in this block. A CAS prevents refunding if persistence
    // actually succeeded but its DB response was lost, or another worker took over.
    try {
      await failEntry(operation, "entry preparation failed");
    } finally {
      await releaseEntryLease(operation);
    }
    return entryOperationResponse(await readEntry(operation.id));
  }

  const pending = { ...operation, state: "PENDING" as const, ...prepared };
  return entryOperationResponse(await submitPreparedEntry(pending, true));
}
