import { formatUnits, parseUnits } from "viem";
import { erc20Abi, kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getOwnerWalletClient, getPublicClient } from "@/lib/chain/clients";

export type VaultStatus = {
  vault: string;
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
  reserved: string;
  unallocated: string;
  balanceRaw: string;
  reservedRaw: string;
  unallocatedRaw: string;
};

export async function getVaultStatus(): Promise<VaultStatus> {
  const { vault, prizeToken, keys } = getChainConfig();
  const client = getPublicClient();

  const [tokenFromVault, reserved, unallocated, balance, decimals, symbol] =
    await Promise.all([
      client.readContract({
        address: vault,
        abi: kaffleVaultAbi,
        functionName: "token",
      }),
      client.readContract({
        address: vault,
        abi: kaffleVaultAbi,
        functionName: "reserved",
      }),
      client.readContract({
        address: vault,
        abi: kaffleVaultAbi,
        functionName: "unallocated",
      }),
      client.readContract({
        address: prizeToken,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [vault],
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

  if (tokenFromVault.toLowerCase() !== prizeToken.toLowerCase()) {
    throw new Error(`${keys.prizeToken} does not match vault.token()`);
  }

  return {
    vault,
    token: prizeToken,
    symbol,
    decimals,
    balance: formatUnits(balance, decimals),
    reserved: formatUnits(reserved, decimals),
    unallocated: formatUnits(unallocated, decimals),
    balanceRaw: balance.toString(),
    reservedRaw: reserved.toString(),
    unallocatedRaw: unallocated.toString(),
  };
}

/**
 * Local helper: mint MockERC20 into the vault (Anvil mock token).
 * On testnets this would become a wallet transfer of real USDC instead.
 */
export async function fundVault(amountHuman: string) {
  if (!/^\d+(\.\d+)?$/.test(amountHuman) || Number(amountHuman) <= 0) {
    throw new Error("invalid amount");
  }

  const { vault, prizeToken } = getChainConfig();
  const publicClient = getPublicClient();
  const owner = getOwnerWalletClient();

  const decimals = await publicClient.readContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amount = parseUnits(amountHuman, decimals);

  const hash = await owner.writeContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "mint",
    args: [vault, amount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("fund transaction failed");
  }

  return { hash, ...(await getVaultStatus()) };
}
