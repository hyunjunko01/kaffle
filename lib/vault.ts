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
 * Fund the vault with prize tokens.
 * - anvil: mint MockERC20 into the vault
 * - testnets / mainnet: transfer from the owner wallet (fund that wallet first)
 */
export async function fundVault(amountHuman: string) {
  if (!/^\d+(\.\d+)?$/.test(amountHuman) || Number(amountHuman) <= 0) {
    throw new Error("invalid amount");
  }

  const { vault, prizeToken, slug, ownerAccount } = getChainConfig();
  const publicClient = getPublicClient();
  const owner = getOwnerWalletClient();

  const decimals = await publicClient.readContract({
    address: prizeToken,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amount = parseUnits(amountHuman, decimals);

  let hash: `0x${string}`;
  if (slug === "anvil") {
    hash = await owner.writeContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "mint",
      args: [vault, amount],
    });
  } else {
    const balance = await publicClient.readContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [ownerAccount.address],
    });
    if (balance < amount) {
      throw new Error("insufficient owner token balance");
    }
    hash = await owner.writeContract({
      address: prizeToken,
      abi: erc20Abi,
      functionName: "transfer",
      args: [vault, amount],
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("fund transaction failed");
  }

  return { hash, ...(await getVaultStatus()) };
}
