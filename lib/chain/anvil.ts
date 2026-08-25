import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

/** Well-known Anvil account #0. Local only. */
export const ANVIL_DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

function requiredAddress(name: string): Address {
  const value = process.env[name];
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${name} is not set`);
  }
  return value as Address;
}

export function getAnvilConfig() {
  const privateKey = (process.env.ANVIL_OWNER_PRIVATE_KEY ??
    ANVIL_DEFAULT_PRIVATE_KEY) as Hex;

  return {
    rpcUrl: process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545",
    vault: requiredAddress("ANVIL_KAFFLE_VAULT"),
    prizeToken: requiredAddress("ANVIL_PRIZE_TOKEN"),
    privateKey,
    account: privateKeyToAccount(privateKey),
  };
}

export function getAnvilPublicClient() {
  const { rpcUrl } = getAnvilConfig();
  return createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });
}

export function getAnvilWalletClient() {
  const { rpcUrl, account } = getAnvilConfig();
  return createWalletClient({
    account,
    chain: foundry,
    transport: http(rpcUrl),
  });
}
