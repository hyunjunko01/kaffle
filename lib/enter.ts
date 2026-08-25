import {
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type Hex,
} from "viem";
import { foundry } from "viem/chains";
import { kaffleAbi } from "@/lib/chain/abis";
import {
  getAnvilConfig,
  getAnvilPublicClient,
  getAnvilWalletClient,
} from "@/lib/chain/anvil";
import { getRaffleStatus } from "@/lib/raffle";
import { getTicketBalance, refundTickets, spendTickets } from "@/lib/tickets";

export const MAX_TICKETS_PER_ENTER = 100;
const SIGNATURE_TTL_SECONDS = 10 * 60;

const enterTypes = {
  Enter: [
    { name: "user", type: "address" },
    { name: "raffle", type: "address" },
    { name: "ticketCount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function enterErrorMessage(error: unknown) {
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
  return "enter failed";
}

export async function enterRaffle(input: {
  userId: string;
  walletAddress: string;
  ticketCount: number;
}) {
  const ticketCount = input.ticketCount;
  if (
    !Number.isInteger(ticketCount) ||
    ticketCount <= 0 ||
    ticketCount > MAX_TICKETS_PER_ENTER
  ) {
    throw new Error("invalid ticket count");
  }

  const status = await getRaffleStatus();
  const current = status.current;
  if (!current) {
    throw new Error("no raffle");
  }
  if (!current.isOpen) {
    throw new Error("RoundClosed");
  }

  const user = input.walletAddress.toLowerCase() as Address;
  const raffle = current.address as Address;
  const { ticketSigner } = getAnvilConfig();
  const publicClient = getAnvilPublicClient();
  const relayer = getAnvilWalletClient();

  const nonce = await publicClient.readContract({
    address: raffle,
    abi: kaffleAbi,
    functionName: "nonce",
    args: [user],
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);

  const signature = await ticketSigner.signTypedData({
    domain: {
      name: "Kaffle",
      version: "1",
      chainId: foundry.id,
      verifyingContract: raffle,
    },
    types: enterTypes,
    primaryType: "Enter",
    message: {
      user,
      raffle,
      ticketCount: BigInt(ticketCount),
      nonce,
      deadline,
    },
  });

  await spendTickets({
    userId: input.userId,
    amount: ticketCount,
    reason: "raffle_entry",
    relatedId: raffle.toLowerCase(),
  });

  try {
    const hash = await relayer.writeContract({
      address: raffle,
      abi: kaffleAbi,
      functionName: "enter",
      args: [user, BigInt(ticketCount), deadline, signature as Hex],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("enter transaction failed");
    }

    const [ticketBalance, nextStatus] = await Promise.all([
      getTicketBalance(input.userId),
      getRaffleStatus(),
    ]);

    return {
      hash,
      ticketBalance,
      ...nextStatus,
    };
  } catch (error) {
    await refundTickets({
      userId: input.userId,
      amount: ticketCount,
      reason: "raffle_entry_refund",
      relatedId: raffle.toLowerCase(),
    });
    throw error;
  }
}
