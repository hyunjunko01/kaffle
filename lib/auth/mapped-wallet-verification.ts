import { ECDH } from "crypto";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { isAddress, zeroAddress, type Hex } from "viem";
import { publicKeyToAddress } from "viem/accounts";

// @web3auth/no-modal v11 uses Citadel for identity tokens. Keep the key source
// and issuer pinned; neither may come from the submitted token or request.
const WEB3AUTH_ISSUER = "web3auth.io";
const web3AuthKeys = createRemoteJWKSet(
  new URL("https://api.web3auth.io/citadel-service/.well-known/jwks.json"),
  { timeoutDuration: 5_000 },
);

export class MappedWalletVerificationError extends Error {
  constructor() {
    super("Wallet verification failed");
  }
}

export class MappedWalletVerificationUnavailableError extends Error {
  constructor() {
    super("Wallet verification unavailable");
  }
}

export function normalizeMappedWalletAddress(value: unknown) {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) return null;
  const address = value.toLowerCase();
  return address === zeroAddress ? null : address;
}

function addressFromPublicKey(value: unknown) {
  if (typeof value !== "string") return null;
  let key = value.replace(/^0x/i, "");
  if (!/^(?:[a-fA-F0-9]{66}|[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(key)) return null;
  if (key.length === 128) key = `04${key}`;
  try {
    // Decompress and validate the full curve point. Prefix comparisons are not
    // sufficient to verify that a claimed address belongs to this public key.
    const uncompressed = ECDH.convertKey(key, "secp256k1", "hex", "hex", "uncompressed");
    return publicKeyToAddress(`0x${uncompressed.toString()}` as Hex).toLowerCase();
  } catch {
    return null;
  }
}

/** Verify the provider's identity token, not the Kaffle JWT used to log into Web3Auth. */
export async function verifyMappedWallet(input: {
  kakaoId: string;
  address: unknown;
  identityToken: unknown;
  accessToken?: unknown;
}) {
  const address = normalizeMappedWalletAddress(input.address);
  if (!address || typeof input.identityToken !== "string" ||
      input.identityToken.length === 0 || input.identityToken.length > 16_384) {
    throw new MappedWalletVerificationError();
  }

  const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
  const authConnectionId = process.env.NEXT_PUBLIC_WEB3AUTH_AUTH_CONNECTION_ID;
  if (!clientId || !authConnectionId) throw new MappedWalletVerificationUnavailableError();

  let payload;
  try {
    ({ payload } = await jwtVerify(input.identityToken, web3AuthKeys, {
      algorithms: ["ES256"],
      issuer: WEB3AUTH_ISSUER,
      audience: clientId,
      requiredClaims: ["exp", "iat", "authConnection", "authConnectionId", "wallets"],
      clockTolerance: 30,
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout) &&
        !(error instanceof errors.JWKSInvalid)) {
      throw new MappedWalletVerificationError();
    }
    throw new MappedWalletVerificationUnavailableError();
  }

  if (payload.authConnection !== "custom" ||
      payload.authConnectionId !== authConnectionId ||
      typeof payload.iat !== "number" || payload.iat > Math.floor(Date.now() / 1000) + 30 ||
      typeof payload.exp !== "number" || payload.exp <= payload.iat ||
      !Array.isArray(payload.wallets) || payload.wallets.length > 16) {
    throw new MappedWalletVerificationError();
  }

  const ownsAddress = payload.wallets.some((wallet: unknown) => {
    if (!wallet || typeof wallet !== "object") return false;
    const claim = wallet as Record<string, unknown>;
    return claim.type === "web3auth_app_key" && claim.curve === "secp256k1" &&
      addressFromPublicKey(claim.public_key) === address;
  });
  if (!ownsAddress) throw new MappedWalletVerificationError();

  if (payload.userId !== undefined) {
    if (payload.userId !== input.kakaoId) throw new MappedWalletVerificationError();
  } else {
    // v11 tokens can omit the original login identifier. Resolve it using the
    // same authenticated /v1/user endpoint as the installed AUTH connector.
    // Match the primary social EOA as well, so unrelated tokens cannot be paired.
    await verifyProviderUser(input, address, authConnectionId);
  }
  return address;
}

async function verifyProviderUser(
  input: { kakaoId: string; accessToken?: unknown },
  address: string,
  authConnectionId: string,
) {
  if (typeof input.accessToken !== "string" || input.accessToken.length === 0 ||
      input.accessToken.length > 16_384 || !/^[a-zA-Z0-9._~-]+$/.test(input.accessToken)) {
    throw new MappedWalletVerificationError();
  }
  let response: Response;
  try {
    response = await fetch("https://api.web3auth.io/citadel-service/v1/user", {
      headers: { Authorization: `Bearer ${input.accessToken}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new MappedWalletVerificationUnavailableError();
  }
  if (response.status === 401 || response.status === 403) throw new MappedWalletVerificationError();
  if (!response.ok) throw new MappedWalletVerificationUnavailableError();
  let profile: Record<string, unknown>;
  try {
    profile = await response.json();
  } catch {
    throw new MappedWalletVerificationUnavailableError();
  }
  const network = process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK === "sapphire_mainnet"
    ? "sapphire_mainnet" : "sapphire_devnet";
  if (!profile || profile.identifier !== input.kakaoId || profile.connectionId !== authConnectionId ||
      profile.web3AuthNetwork !== network || !Array.isArray(profile.accounts)) {
    throw new MappedWalletVerificationError();
  }
  const primaryMatches = profile.accounts.some((account: unknown) => {
    if (!account || typeof account !== "object") return false;
    const claim = account as Record<string, unknown>;
    return claim.isPrimary === true && claim.accountType === "social" &&
      claim.chainNamespace === "evm" && normalizeMappedWalletAddress(claim.eoaAddress) === address;
  });
  if (!primaryMatches) throw new MappedWalletVerificationError();
}
