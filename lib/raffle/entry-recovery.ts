import type { RaffleEntryOperation } from "@prisma/client";
import { keccak256, type Address, type Hex, type TransactionReceipt } from "viem";
import { kaffleAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient, getRelayerWalletClient } from "@/lib/chain/clients";
import {
  acquireEntryLease,
  advanceEntryScan,
  confirmEntry,
  failEntry,
  listPendingEntries,
  readEntry,
  releaseEntryLease,
} from "@/lib/raffle/entry-store";

export const ENTRY_CONFIRMATIONS = 2;
const RECEIPT_WAIT_MS = 15_000;

export function entryOperationResponse(operation: RaffleEntryOperation) {
  return {
    operationId: operation.id,
    requestId: operation.requestId,
    state: operation.state === "CONFIRMED"
      ? "confirmed" as const
      : operation.state === "FAILED" ? "failed" as const : "pending" as const,
    hash: operation.confirmedTxHash ?? operation.txHash,
    raffleAddress: operation.raffleAddress,
    ticketCount: operation.ticketCount,
    error: operation.failureReason,
  };
}

async function settleReceipt(operation: RaffleEntryOperation, receipt: TransactionReceipt) {
  if (receipt.transactionHash.toLowerCase() !== operation.txHash?.toLowerCase()) return;
  const client = getPublicClient({ timeout: 5_000, retryCount: 0 });
  if (receipt.status === "success") {
    const latest = await client.getBlockNumber({ cacheTime: 0 });
    if (latest - receipt.blockNumber + BigInt(1) >= BigInt(ENTRY_CONFIRMATIONS)) {
      const canonical = await client.getBlock({ blockNumber: receipt.blockNumber });
      if (canonical.hash === receipt.blockHash) await confirmEntry(operation);
    }
    return;
  }

  // A reverted receipt can still be reorged. Refund only once it is finalized.
  const finalized = await client.getBlock({ blockTag: "finalized" });
  if (finalized.number === null || receipt.blockNumber > finalized.number) return;
  const canonical = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (canonical.hash !== receipt.blockHash) return;
  // Reversion does not invalidate the transferable voucher exposed in the mempool.
  // It must be expired and proven unused before any refund is safe.
  await resolveFinalizedVoucher(operation, "enter transaction failed");
}

async function resolveFinalizedVoucher(operation: RaffleEntryOperation, failureReason = "entry authorization expired unused") {
  const client = getPublicClient({ timeout: 5_000, retryCount: 0 });
  const finalized = await client.getBlock({ blockTag: "finalized" });
  if (finalized.number === null || operation.deadline === null || operation.entryNonce === null || operation.startBlock === null) return false;
  const nonce = await client.readContract({
    address: operation.raffleAddress as Address,
    abi: kaffleAbi,
    functionName: "nonce",
    args: [operation.walletAddress as Address],
    blockNumber: finalized.number,
  });
  // Expiry alone is insufficient: the entry may have succeeded before expiry.
  // An unchanged nonce at a finalized post-expiry block proves it did not.
  if (nonce === BigInt(operation.entryNonce) && finalized.timestamp > operation.deadline) {
    await failEntry(operation, failureReason);
    return true;
  }
  if (nonce > BigInt(operation.entryNonce)) {
    // The first entry after our nonce snapshot consumes this voucher nonce, even
    // when a third party forwards the call through another contract. Recover it
    // from the canonical event rather than assuming our relayer's hash succeeded.
    const fromBlock = operation.scanBlock ?? operation.startBlock + BigInt(1);
    if (fromBlock > finalized.number) return false;
    const toBlock = fromBlock + BigInt(1_999) < finalized.number
      ? fromBlock + BigInt(1_999) : finalized.number;
    const logs = await client.getContractEvents({
      address: operation.raffleAddress as Address,
      abi: kaffleAbi,
      eventName: "Entered",
      args: { user: operation.walletAddress as Address },
      fromBlock,
      toBlock,
      strict: true,
    });
    const first = logs.sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex)[0];
    if (first) {
      if (first.args.ticketCount === BigInt(operation.ticketCount)) {
        await confirmEntry(operation, first.transactionHash);
        return true;
      }
      // Conflicting historical authorization: retain the reservation for review.
      return false;
    }
    await advanceEntryScan(operation, toBlock + BigInt(1));
  }
  return false;
}

/** The operation's lease must be held. Every broadcast uses the already persisted bytes. */
export async function submitPreparedEntry(operation: RaffleEntryOperation, waitForReceipt = false) {
  if (operation.chainId !== getChainConfig().chainId) throw new Error("entry chain mismatch");
  if (!operation.rawTransaction || !operation.txHash) throw new Error("entry transaction missing");
  if (keccak256(operation.rawTransaction as Hex) !== operation.txHash) {
    throw new Error("entry transaction hash mismatch");
  }

  try {
    const client = getPublicClient({ timeout: 5_000, retryCount: 0 });
    let receipt: TransactionReceipt | null = null;
    try {
      receipt = await client.getTransactionReceipt({ hash: operation.txHash as Hex });
    } catch {
      // Not found and RPC failures both leave the outcome unknown.
    }
    if (receipt) {
      await settleReceipt(operation, receipt);
    } else {
      if (await resolveFinalizedVoucher(operation).catch(() => false)) {
        return await readEntry(operation.id);
      }

      try {
        await getRelayerWalletClient({ timeout: 5_000, retryCount: 0 }).sendRawTransaction({
          serializedTransaction: operation.rawTransaction as Hex,
        });
      } catch {
        // Includes "already known", lost responses and nonce/fee errors. None proves failure.
      }
      if (waitForReceipt) {
        receipt = await client.waitForTransactionReceipt({
          hash: operation.txHash as Hex,
          confirmations: ENTRY_CONFIRMATIONS,
          timeout: RECEIPT_WAIT_MS,
        });
        await settleReceipt(operation, receipt);
      }
    }
  } catch {
    // Preserve the debit on every uncertain RPC/DB outcome. A later worker can retry.
  } finally {
    await releaseEntryLease(operation);
  }
  return readEntry(operation.id);
}

export async function reconcileEntryOperation(id: string) {
  const existing = await readEntry(id);
  if (existing.chainId !== getChainConfig().chainId) throw new Error("entry chain mismatch");
  if (existing.state === "CONFIRMED" || existing.state === "FAILED") return existing;
  const operation = await acquireEntryLease(id);
  if (!operation) return readEntry(id);

  if (operation.state === "PREPARING") {
    // No persisted transaction exists and broadcasting before persistence is forbidden.
    // The lease token fences off any stale signer before refunding this interrupted attempt.
    try {
      await failEntry(operation, "entry preparation interrupted");
    } finally {
      await releaseEntryLease(operation);
    }
    return readEntry(id);
  }
  return submitPreparedEntry(operation);
}

export async function reconcilePendingEntries(limit = 10) {
  const operations = await listPendingEntries(getChainConfig().chainId, limit);
  // Bound work per invocation; lastCheckedAt rotates unresolved entries fairly.
  return Promise.all(operations.map(async (operation) => {
    try {
      return entryOperationResponse(await reconcileEntryOperation(operation.id));
    } catch {
      return { operationId: operation.id, state: "pending" as const };
    }
  }));
}
