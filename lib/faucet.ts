import {
  BaseError,
  ContractFunctionRevertedError,
  formatUnits,
  type Address,
  type Hex,
} from "viem";
import { kaffleFaucetAbi, erc20Abi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import {
  getPublicClient,
  getRelayerWalletClient,
  syncChainClock,
} from "@/lib/chain/clients";

const SIGNATURE_TTL_SECONDS = 10 * 60;

const claimTypes = {
  Claim: [
    { name: "user", type: "address" },
    { name: "faucet", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type FaucetStatus = {
  faucet: string;
  token: string;
  symbol: string;
  decimals: number;
  claimAmount: string;
  faucetBalance: string;
  walletBalance: string;
  claimed: boolean;
  paused: boolean;
  canClaim: boolean;
};

export function faucetErrorMessage(error: unknown) {
  if (error instanceof BaseError) {
    const revert = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      return revert.data.errorName;
    }
    return error.shortMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "faucet request failed";
}

export async function getFaucetStatus(walletAddress: string): Promise<FaucetStatus> {
  await syncChainClock();

  const { faucet, prizeToken } = getChainConfig();
  const client = getPublicClient();
  const user = walletAddress as Address;

  const [tokenFromFaucet, claimAmount, claimed, paused, decimals, symbol, faucetBalance, walletBalance] =
    await Promise.all([
      client.readContract({
        address: faucet,
        abi: kaffleFaucetAbi,
        functionName: "token",
      }),
      client.readContract({
        address: faucet,
        abi: kaffleFaucetAbi,
        functionName: "claimAmount",
      }),
      client.readContract({
        address: faucet,
        abi: kaffleFaucetAbi,
        functionName: "claimed",
        args: [user],
      }),
      client.readContract({
        address: faucet,
        abi: kaffleFaucetAbi,
        functionName: "paused",
      }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "symbol",
      }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [faucet],
      }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [user],
      }),
    ]);

  if (tokenFromFaucet.toLowerCase() !== prizeToken.toLowerCase()) {
    throw new Error("faucet token does not match configured prize token");
  }

  return {
    faucet,
    token: prizeToken,
    symbol,
    decimals,
    claimAmount: formatUnits(claimAmount, decimals),
    faucetBalance: formatUnits(faucetBalance, decimals),
    walletBalance: formatUnits(walletBalance, decimals),
    claimed,
    paused,
    canClaim: !claimed && !paused,
  };
}

export async function claimFaucet(walletAddress: string) {
  await syncChainClock();

  const { faucet, chainId, ticketSigner } = getChainConfig();
  const user = walletAddress as Address;
  const client = getPublicClient();
  const relayer = getRelayerWalletClient();
  const amount = await client.readContract({
    address: faucet,
    abi: kaffleFaucetAbi,
    functionName: "claimAmount",
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);
  const signature = await ticketSigner.signTypedData({
    domain: {
      name: "KaffleFaucet",
      version: "1",
      chainId,
      verifyingContract: faucet,
    },
    types: claimTypes,
    primaryType: "Claim",
    message: {
      user,
      faucet,
      amount,
      deadline,
    },
  });

  const hash = await relayer.writeContract({
    address: faucet,
    abi: kaffleFaucetAbi,
    functionName: "claim",
    args: [user, deadline, signature as Hex],
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("faucet claim transaction failed");
  }

  return { hash };
}
