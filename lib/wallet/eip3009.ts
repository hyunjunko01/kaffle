import { type Address, type Hex } from "viem";
import { getPublicChainConfig, NETWORKS } from "@/lib/chain/config";

export const DEFAULT_PRIZE_TOKEN_EIP712 = {
  name: "USD Coin",
  version: "2",
} as const;
export const AUTHORIZATION_TTL_SECONDS = 10 * 60;

export function getPrizeTokenEip712Domain() {
  const { slug } = getPublicChainConfig();
  return NETWORKS[slug].prizeTokenEip712 ?? DEFAULT_PRIZE_TOKEN_EIP712;
}

export const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function randomAuthorizationNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function buildTransferWithAuthorizationTypedData(input: {
  chainId: number;
  token: Address;
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
}) {
  const eip712 = getPrizeTokenEip712Domain();
  return {
    types: transferWithAuthorizationTypes,
    primaryType: "TransferWithAuthorization" as const,
    domain: {
      name: eip712.name,
      version: eip712.version,
      chainId: input.chainId,
      verifyingContract: input.token,
    },
    message: {
      from: input.from,
      to: input.to,
      value: input.value,
      validAfter: input.validAfter,
      validBefore: input.validBefore,
      nonce: input.nonce,
    },
  };
}

export function serializeTransferWithAuthorizationTypedData(
  typedData: ReturnType<typeof buildTransferWithAuthorizationTypedData>,
) {
  return {
    ...typedData,
    message: {
      from: typedData.message.from,
      to: typedData.message.to,
      value: typedData.message.value.toString(),
      validAfter: typedData.message.validAfter.toString(),
      validBefore: typedData.message.validBefore.toString(),
      nonce: typedData.message.nonce,
    },
  };
}
