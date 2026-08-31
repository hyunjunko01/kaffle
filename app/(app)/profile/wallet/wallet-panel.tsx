"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, getAddress, isAddress, parseUnits } from "viem";
import { erc20Abi } from "@/lib/chain/abis";
import { connectMappedWalletProvider } from "@/lib/auth/web3auth";

type WalletView = {
  chainId: number;
  network: string;
  explorerBaseUrl: string;
  wallet: string;
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
};

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "자산을 전송하지 못했습니다.";
  }
  if (error.message === "invalid recipient") {
    return "받는 주소를 확인해 주세요.";
  }
  if (error.message === "invalid amount") {
    return "전송 수량을 올바르게 입력해 주세요.";
  }
  if (error.message === "insufficient balance") {
    return "잔액이 부족합니다.";
  }
  if (error.message === "wallet mismatch") {
    return "현재 로그인한 지갑과 연결된 지갑이 다릅니다.";
  }
  return error.message || "자산을 전송하지 못했습니다.";
}

export function WalletPanel() {
  const [view, setView] = useState<WalletView | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/wallet");
    const body = (await response.json()) as WalletView & { error?: string };
    if (!response.ok) {
      setView(null);
      setError(
        body.error?.includes("is not set")
          ? "네트워크 또는 토큰 설정이 없습니다."
          : (body.error ?? "지갑 정보를 불러오지 못했습니다."),
      );
      setLoading(false);
      return;
    }
    setView(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view) return;

    setPending(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      const rawRecipient = recipient.trim();
      if (!isAddress(rawRecipient)) {
        throw new Error("invalid recipient");
      }

      let tokenAmount: bigint;
      try {
        tokenAmount = parseUnits(amount.trim(), view.decimals);
      } catch {
        throw new Error("invalid amount");
      }
      if (tokenAmount <= BigInt(0)) {
        throw new Error("invalid amount");
      }
      if (tokenAmount > parseUnits(view.balance, view.decimals)) {
        throw new Error("insufficient balance");
      }

      const tokenData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [getAddress(rawRecipient), tokenAmount],
      });
      const tokenResponse = await fetch("/api/auth/web3auth-token");
      if (!tokenResponse.ok) {
        throw new Error("지갑 연결용 토큰을 만들지 못했습니다.");
      }
      const { idToken } = (await tokenResponse.json()) as { idToken: string };
      const provider = await connectMappedWalletProvider(idToken);
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      const from = accounts[0];
      if (!from || from.toLowerCase() !== view.wallet.toLowerCase()) {
        throw new Error("wallet mismatch");
      }

      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: view.token,
            data: tokenData,
          },
        ],
      })) as string;

      setTxHash(hash);
      setSuccess("전송 요청이 완료되었습니다.");
      setRecipient("");
      setAmount("");
      setPending(false);
      void load();
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  const txUrl = txHash && view?.explorerBaseUrl
    ? `${view.explorerBaseUrl}/tx/${txHash}`
    : null;

  return (
    <section className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {success}
          {txUrl ? (
            <>
              {" · "}
              <Link href={txUrl} target="_blank" rel="noreferrer" className="underline">
                트랜잭션 확인
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-sm text-zinc-500">지갑 정보를 불러오는 중…</p>
      ) : view ? (
        <>
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-zinc-500">네트워크</dt>
                <dd className="mt-1 font-medium">{view.network}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">잔액</dt>
                <dd className="mt-1 font-medium">
                  {view.balance} {view.symbol}
                </dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">내 지갑</p>
              <p className="mt-1 break-all font-mono text-xs">{view.wallet}</p>
            </div>
          </div>

          <form onSubmit={(event) => void send(event)} className="space-y-4">
            <label className="block text-sm font-medium">
              받는 지갑 주소
              <input
                type="text"
                inputMode="text"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="0x..."
                disabled={pending}
                className="mt-2 h-14 w-full rounded-xl border border-zinc-200 bg-transparent px-4 font-mono text-sm outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800"
              />
            </label>
            <label className="block text-sm font-medium">
              전송 수량 ({view.symbol})
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.0"
                disabled={pending}
                className="mt-2 h-14 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-base outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800"
              />
            </label>
            <button
              type="submit"
              disabled={pending || recipient.trim().length === 0 || amount.trim().length === 0}
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {pending ? "지갑에서 확인 중…" : `${view.symbol} 전송하기`}
            </button>
          </form>

          <p className="text-xs leading-5 text-zinc-500">
            잘못된 주소나 지원하지 않는 네트워크로 전송한 자산은 복구할 수 없습니다.
            받는 지갑이 {view.network}의 {view.symbol}을 지원하는지 확인하세요.
          </p>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => void load()}
        disabled={loading || pending}
        className="h-12 w-full rounded-xl border border-zinc-200 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        새로고침
      </button>
    </section>
  );
}
