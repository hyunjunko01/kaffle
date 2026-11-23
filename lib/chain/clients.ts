import { createPublicClient, createWalletClient, http } from "viem";
import { getChainConfig, getChainSlug } from "@/lib/chain/config";

export function getPublicClient(options?: { timeout?: number; retryCount?: number }) {
  const { rpcUrl, chain } = getChainConfig();
  return createPublicClient({
    chain,
    transport: http(rpcUrl, options),
  });
}

/** Ownable admin actions: createRaffle, vault funding helpers, etc. */
export function getOwnerWalletClient() {
  const { rpcUrl, ownerAccount, chain } = getChainConfig();
  return createWalletClient({
    account: ownerAccount,
    chain,
    transport: http(rpcUrl),
  });
}

/** Pays gas for enter / claim / requestWinner. Need not be the contract owner. */
export function getRelayerWalletClient(options?: { timeout?: number; retryCount?: number }) {
  const { rpcUrl, relayerAccount, chain } = getChainConfig();
  return createWalletClient({
    account: relayerAccount,
    chain,
    transport: http(rpcUrl, options),
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
