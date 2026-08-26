import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, foundry, sepolia, type Chain } from "viem/chains";
import type { Address, Hex } from "viem";

export type ChainSlug = "anvil" | "sepolia" | "base-sepolia";

type ChainEnvKeys = {
  rpcUrl: string;
  factory: string;
  vault: string;
  implementation: string;
  prizeToken: string;
  vrfCoordinator: string;
  ownerPrivateKey: string;
  relayerPrivateKey: string;
  ticketSignerPrivateKey: string;
};

type NetworkDefinition = {
  chain: Chain;
  displayName: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
  keys: ChainEnvKeys;
};

/**
 * Static network metadata + env var names per chain.
 * Addresses, RPC, and keys always come from env — no code fallbacks.
 */
export const NETWORKS: Record<ChainSlug, NetworkDefinition> = {
  anvil: {
    chain: foundry,
    displayName: "Anvil",
    blockExplorerUrl: "",
    isTestnet: true,
    keys: {
      rpcUrl: "ANVIL_RPC_URL",
      factory: "ANVIL_KAFFLE_FACTORY",
      vault: "ANVIL_KAFFLE_VAULT",
      implementation: "ANVIL_KAFFLE_IMPLEMENTATION",
      prizeToken: "ANVIL_PRIZE_TOKEN",
      vrfCoordinator: "ANVIL_VRF_COORDINATOR",
      ownerPrivateKey: "ANVIL_OWNER_PRIVATE_KEY",
      relayerPrivateKey: "ANVIL_RELAYER_PRIVATE_KEY",
      ticketSignerPrivateKey: "ANVIL_TICKET_SIGNER_PRIVATE_KEY",
    },
  },
  sepolia: {
    chain: sepolia,
    displayName: "Ethereum Sepolia",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    isTestnet: true,
    keys: {
      rpcUrl: "SEPOLIA_RPC_URL",
      factory: "SEPOLIA_KAFFLE_FACTORY",
      vault: "SEPOLIA_KAFFLE_VAULT",
      implementation: "SEPOLIA_KAFFLE_IMPLEMENTATION",
      prizeToken: "SEPOLIA_PRIZE_TOKEN",
      vrfCoordinator: "SEPOLIA_VRF_COORDINATOR",
      ownerPrivateKey: "SEPOLIA_OWNER_PRIVATE_KEY",
      relayerPrivateKey: "SEPOLIA_RELAYER_PRIVATE_KEY",
      ticketSignerPrivateKey: "SEPOLIA_TICKET_SIGNER_PRIVATE_KEY",
    },
  },
  "base-sepolia": {
    chain: baseSepolia,
    displayName: "Base Sepolia",
    blockExplorerUrl: "https://sepolia.basescan.org",
    isTestnet: true,
    keys: {
      rpcUrl: "BASE_SEPOLIA_RPC_URL",
      factory: "BASE_SEPOLIA_KAFFLE_FACTORY",
      vault: "BASE_SEPOLIA_KAFFLE_VAULT",
      implementation: "BASE_SEPOLIA_KAFFLE_IMPLEMENTATION",
      prizeToken: "BASE_SEPOLIA_PRIZE_TOKEN",
      vrfCoordinator: "BASE_SEPOLIA_VRF_COORDINATOR",
      ownerPrivateKey: "BASE_SEPOLIA_OWNER_PRIVATE_KEY",
      relayerPrivateKey: "BASE_SEPOLIA_RELAYER_PRIVATE_KEY",
      ticketSignerPrivateKey: "BASE_SEPOLIA_TICKET_SIGNER_PRIVATE_KEY",
    },
  },
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function required(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function requiredAddress(name: string): Address {
  const value = required(name);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is not a valid address`);
  }
  return value as Address;
}

function optionalAddress(name: string): Address | undefined {
  const value = readEnv(name);
  if (!value) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is not a valid address`);
  }
  return value as Address;
}

function requiredPrivateKey(name: string): Hex {
  const value = readEnv(name) as Hex | undefined;
  if (!value || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function parseChainSlug(value: string): ChainSlug {
  const slug = value.trim();
  if (slug in NETWORKS) {
    return slug as ChainSlug;
  }
  throw new Error(
    `CHAIN must be one of: ${Object.keys(NETWORKS).join(", ")} (got "${value}")`,
  );
}

/** Active chain. Set `CHAIN` (server) and `NEXT_PUBLIC_CHAIN` (browser) to the same value. */
export function getChainSlug(): ChainSlug {
  const value = readEnv("CHAIN") ?? readEnv("NEXT_PUBLIC_CHAIN");
  if (!value) {
    throw new Error("CHAIN (or NEXT_PUBLIC_CHAIN) is not set");
  }
  return parseChainSlug(value);
}

/**
 * Browser-safe chain info for Web3Auth / wallet UI.
 * Uses `NEXT_PUBLIC_CHAIN` + `NEXT_PUBLIC_RPC_URL` only.
 */
export function getPublicChainConfig() {
  const value = readEnv("NEXT_PUBLIC_CHAIN");
  if (!value) {
    throw new Error("NEXT_PUBLIC_CHAIN is not set");
  }
  const slug = parseChainSlug(value);
  const network = NETWORKS[slug];
  const rpcUrl = required("NEXT_PUBLIC_RPC_URL");
  const chainIdHex = `0x${network.chain.id.toString(16)}`;

  return {
    slug,
    chain: network.chain,
    chainId: network.chain.id,
    chainIdHex,
    rpcUrl,
    displayName: network.displayName,
    blockExplorerUrl: network.blockExplorerUrl,
    isTestnet: network.isTestnet,
  };
}

/**
 * Server-side config: RPC, deployed addresses, and keys.
 * Owner / relayer / ticketSigner are separate env vars (values may match on testnets).
 */
export function getChainConfig() {
  const slug = getChainSlug();
  const network = NETWORKS[slug];
  const { keys } = network;
  const ownerPrivateKey = requiredPrivateKey(keys.ownerPrivateKey);
  const relayerPrivateKey = requiredPrivateKey(keys.relayerPrivateKey);
  const ticketSignerKey = requiredPrivateKey(keys.ticketSignerPrivateKey);

  return {
    slug,
    chain: network.chain,
    chainId: network.chain.id,
    displayName: network.displayName,
    blockExplorerUrl: network.blockExplorerUrl,
    isTestnet: network.isTestnet,
    keys,
    rpcUrl: required(keys.rpcUrl),
    factory: requiredAddress(keys.factory),
    vault: requiredAddress(keys.vault),
    implementation: optionalAddress(keys.implementation),
    prizeToken: requiredAddress(keys.prizeToken),
    vrfCoordinator: requiredAddress(keys.vrfCoordinator),
    ownerPrivateKey,
    relayerPrivateKey,
    ticketSignerKey,
    ownerAccount: privateKeyToAccount(ownerPrivateKey),
    relayerAccount: privateKeyToAccount(relayerPrivateKey),
    ticketSigner: privateKeyToAccount(ticketSignerKey),
  };
}
