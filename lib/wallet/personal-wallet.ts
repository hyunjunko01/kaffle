import { randomBytes } from "crypto";
import { isAddress } from "viem";

export const PERSONAL_WALLET_CHALLENGE_TTL_MS = 10 * 60 * 1000;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function normalizeWalletAddress(address: string | undefined | null) {
  if (!address || !ADDRESS_RE.test(address) || !isAddress(address)) {
    return null;
  }
  return address.toLowerCase();
}

export function createOwnershipNonce() {
  return randomBytes(16).toString("hex");
}

export function buildOwnershipMessage(input: {
  address: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}) {
  return [
    "Kaffle personal wallet verification",
    "",
    "Sign this message to prove you own this wallet.",
    "This does not cost gas and does not grant spending permission.",
    "",
    `Address: ${input.address}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt.toISOString()}`,
    `Expires At: ${input.expiresAt.toISOString()}`,
  ].join("\n");
}
