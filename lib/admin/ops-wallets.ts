import { formatEther, formatUnits } from "viem";
import { erc20Abi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient } from "@/lib/chain/clients";

export type OpsWalletStatus = {
  network: string;
  symbol: string;
  owner: {
    address: string;
    eth: string;
    token: string;
  };
  relayer: {
    address: string;
    eth: string;
  };
};

/** Balances for admin ops keys (derived from env private keys). */
export async function getOpsWalletStatus(): Promise<OpsWalletStatus> {
  const {
    displayName,
    prizeToken,
    ownerAccount,
    relayerAccount,
  } = getChainConfig();
  const client = getPublicClient();
  const owner = ownerAccount.address;
  const relayer = relayerAccount.address;

  const [ownerEth, relayerEth, tokenBalance, decimals, symbol] =
    await Promise.all([
      client.getBalance({ address: owner }),
      client.getBalance({ address: relayer }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
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
    network: displayName,
    symbol,
    owner: {
      address: owner,
      eth: formatEther(ownerEth),
      token: formatUnits(tokenBalance, decimals),
    },
    relayer: {
      address: relayer,
      eth: formatEther(relayerEth),
    },
  };
}
