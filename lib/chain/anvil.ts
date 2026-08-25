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

/** Well-known Anvil account #1 — default ticketSigner on local deploy. */
export const ANVIL_DEFAULT_TICKET_SIGNER_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;

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
  const ticketSignerKey = (process.env.ANVIL_TICKET_SIGNER_PRIVATE_KEY ??
    ANVIL_DEFAULT_TICKET_SIGNER_KEY) as Hex;

  return {
    rpcUrl: process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545",
    factory: requiredAddress("ANVIL_KAFFLE_FACTORY"),
    vault: requiredAddress("ANVIL_KAFFLE_VAULT"),
    prizeToken: requiredAddress("ANVIL_PRIZE_TOKEN"),
    privateKey,
    ticketSignerKey,
    account: privateKeyToAccount(privateKey),
    ticketSigner: privateKeyToAccount(ticketSignerKey),
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
