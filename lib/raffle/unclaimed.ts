import { formatUnits, type Address, zeroAddress } from "viem";
import { erc20Abi, kaffleAbi, kaffleVaultAbi } from "@/lib/chain/abis";
import { getChainConfig } from "@/lib/chain/config";
import { getPublicClient, syncChainClock } from "@/lib/chain/clients";
import { getRaffleEntriesNewestFirst } from "@/lib/raffle/history";

export type UnclaimedPrize = {
  raffleAddress: string;
  roundNumber: number;
  prizeAmount: string;
  symbol: string;
};

const SCAN_BATCH = 10;

/**
 * Find past/current rounds where this wallet is the on-chain winner
 * and the vault prize is still attached and unclaimed.
 */
export async function getUnclaimedPrizesForWallet(
  walletAddress: string,
): Promise<UnclaimedPrize[]> {
  await syncChainClock();

  const wallet = walletAddress.toLowerCase();
  const raffles = await getRaffleEntriesNewestFirst();
  if (raffles.length === 0) {
    return [];
  }

  const { vault, prizeToken } = getChainConfig();
  const client = getPublicClient();

  const [decimals, symbol] = await Promise.all([
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

  const items: UnclaimedPrize[] = [];

  for (let i = 0; i < raffles.length; i += SCAN_BATCH) {
    const batch = raffles.slice(i, i + SCAN_BATCH);
    const results = await Promise.all(
      batch.map(async (raffle) => {
        const [winner, prize] = await Promise.all([
          client.readContract({
            address: raffle.address,
            abi: kaffleAbi,
            functionName: "winner",
          }),
          client.readContract({
            address: vault,
            abi: kaffleVaultAbi,
            functionName: "prizeOf",
            args: [raffle.address],
          }),
        ]);

        if (winner === zeroAddress || winner.toLowerCase() !== wallet) {
          return null;
        }

        const [amount, claimed, attached] = prize;
        if (!attached || claimed || amount === BigInt(0)) {
          return null;
        }

        return {
          raffleAddress: raffle.address.toLowerCase(),
          roundNumber: raffle.roundNumber,
          prizeAmount: formatUnits(amount, Number(decimals)),
          symbol,
        } satisfies UnclaimedPrize;
      }),
    );

    for (const item of results) {
      if (item) {
        items.push(item);
      }
    }
  }

  return items;
}

export async function readClaimablePrize(raffleAddress: Address) {
  const { vault, prizeToken } = getChainConfig();
  const client = getPublicClient();

  const [winner, prize, decimals, symbol] = await Promise.all([
    client.readContract({
      address: raffleAddress,
      abi: kaffleAbi,
      functionName: "winner",
    }),
    client.readContract({
      address: vault,
      abi: kaffleVaultAbi,
      functionName: "prizeOf",
      args: [raffleAddress],
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

  const [amount, claimed, attached] = prize;
  const winnerAddress = winner === zeroAddress ? null : winner.toLowerCase();

  return {
    winnerAddress,
    prizeAmount: formatUnits(amount, Number(decimals)),
    amountWei: amount,
    prizeClaimed: claimed,
    prizeAttached: attached,
    decimals: Number(decimals),
    symbol,
  };
}
