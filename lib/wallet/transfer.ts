import {
  BaseError,
  ContractFunctionRevertedError,
  getAddress,
  isAddress,
  parseSignature,
  parseUnits,
  type Hex,
} from "viem";
import { usdcEip3009Abi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";
import { getWalletStatus } from "@/lib/wallet";

export function walletTransferErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );
    if (revert instanceof ContractFunctionRevertedError) {
      if (revert.data?.errorName) {
        return revert.data.errorName;
      }
      if (revert.shortMessage.includes("authorizationState")) {
        return "token does not support EIP-3009";
      }
    }
    const message = error.shortMessage.toLowerCase();
    if (message.includes("insufficient funds")) {
      return "relayer insufficient funds";
    }
    if (message.includes("invalid signature")) {
      return "ERC3009InvalidSignature";
    }
    return error.shortMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "wallet transfer failed";
}

function normalizeSignatureV(v: number | bigint | undefined) {
  if (v === undefined) {
    throw new Error("invalid signature");
  }
  const value = Number(v);
  if (value === 0 || value === 1) {
    return value + 27;
  }
  if (value === 27 || value === 28) {
    return value;
  }
  throw new Error("invalid signature");
}

export async function submitUsdcTransferWithAuthorization(input: {
  walletAddress: string;
  recipient: string;
  amount: string;
  nonce: Hex;
  validAfter: string;
  validBefore: string;
  signature: Hex;
}) {
  const { slug, prizeToken } = getChainConfig();
  if (slug !== "base-sepolia") {
    throw new Error("unsupported chain");
  }

  if (!isAddress(input.recipient)) {
    throw new Error("invalid recipient");
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(input.nonce)) {
    throw new Error("invalid nonce");
  }

  const from = getAddress(input.walletAddress);
  const to = getAddress(input.recipient);
  if (to.toLowerCase() === from.toLowerCase()) {
    throw new Error("invalid recipient");
  }

  await syncChainClock();

  const client = getPublicClient();
  const relayer = getRelayerWalletClient();
  const decimals = await client.readContract({
    address: prizeToken,
    abi: usdcEip3009Abi,
    functionName: "decimals",
  });

  let value: bigint;
  try {
    value = parseUnits(input.amount, decimals);
  } catch {
    throw new Error("invalid amount");
  }
  if (value <= BigInt(0)) {
    throw new Error("invalid amount");
  }

  const balance = await client.readContract({
    address: prizeToken,
    abi: usdcEip3009Abi,
    functionName: "balanceOf",
    args: [from],
  });
  if (balance < value) {
    throw new Error("insufficient balance");
  }

  const validAfter = BigInt(input.validAfter);
  const validBefore = BigInt(input.validBefore);
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (validBefore <= now) {
    throw new Error("authorization expired");
  }

  const alreadyUsed = await client.readContract({
    address: prizeToken,
    abi: usdcEip3009Abi,
    functionName: "authorizationState",
    args: [from, input.nonce],
  });
  if (alreadyUsed) {
    throw new Error("authorization already used");
  }

  const parsed = parseSignature(input.signature);
  const signatureV = normalizeSignatureV(parsed.v ?? parsed.yParity);

  await client.simulateContract({
    account: relayer.account,
    address: prizeToken,
    abi: usdcEip3009Abi,
    functionName: "transferWithAuthorization",
    args: [
      from,
      to,
      value,
      validAfter,
      validBefore,
      input.nonce,
      signatureV,
      parsed.r,
      parsed.s,
    ],
  });

  const hash = await relayer.writeContract({
    address: prizeToken,
    abi: usdcEip3009Abi,
    functionName: "transferWithAuthorization",
    args: [
      from,
      to,
      value,
      validAfter,
      validBefore,
      input.nonce,
      signatureV,
      parsed.r,
      parsed.s,
    ],
  });

  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("transfer transaction failed");
  }

  return {
    hash,
    ...(await getWalletStatus(from)),
  };
}
