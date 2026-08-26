import { createPublicClient, createWalletClient, http } from "viem";
import { getChainConfig, getChainSlug } from "@/lib/chain/config";

export function getPublicClient() {
  const { rpcUrl, chain } = getChainConfig();
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export function getWalletClient() {
  const { rpcUrl, account, chain } = getChainConfig();
  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Anvil freezes block.timestamp until a block is mined. eth_call status checks
 * then look "still open" after wall-clock endTime. Mining one block advances
 * time to roughly now so isFinished/enter windows match the UI clock.
 */
export async function syncChainClock() {
  if (getChainSlug() !== "anvil") return;

  const client = getPublicClient();
  try {
    await client.request({
      method: "evm_mine" as "eth_chainId",
      params: [] as never,
    });
  } catch {
    // Non-Anvil RPCs ignore this.
  }
}
