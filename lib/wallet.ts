import { formatUnits, type Address } from "viem";
import { erc20Abi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";

export async function getWalletStatus(walletAddress: string) {
  const { chainId, displayName, blockExplorerUrl, prizeToken } = getChainConfig();
  const client = getPublicClient();
  const account = walletAddress as Address;

  const [balance, decimals, symbol] = await Promise.all([
    client.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account],
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
  ]);

  return {
    chainId,
    network: displayName,
    explorerBaseUrl: blockExplorerUrl,
    wallet: walletAddress,
    token: prizeToken,
    symbol,
    decimals,
    balance: formatUnits(balance, decimals),
  };
}
