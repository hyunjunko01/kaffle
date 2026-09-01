"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress, parseUnits, type Address, type Hex } from "viem";
import { connectMappedWalletProvider } from "@/lib/auth/web3auth";
import {
  AUTHORIZATION_TTL_SECONDS,
  buildTransferWithAuthorizationTypedData,
  randomAuthorizationNonce,
  serializeTransferWithAuthorizationTypedData,
} from "@/lib/wallet/eip3009";

type WalletView = {
  chainId: number;
  slug: string;
  transferMode: "eip3009" | "unsupported";
  network: string;
  explorerBaseUrl: string;
  wallet: string;
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
};

function errorMessage(error: unknown, bodyError?: string) {
  if (bodyError === "unsupported chain") {
    return "Base Sepolia에서만 전송할 수 있습니다.";
  }
  if (bodyError === "invalid recipient") {
    return "받는 주소를 확인해 주세요.";
  }
  if (bodyError === "invalid amount") {
    return "전송 수량을 올바르게 입력해 주세요.";
  }
  if (bodyError === "insufficient balance") {
    return "잔액이 부족합니다.";
  }
  if (bodyError === "authorization expired") {
    return "서명이 만료되었습니다. 다시 시도해 주세요.";
  }
  if (bodyError === "relayer insufficient funds") {
    return "플랫폼 relayer에 Base Sepolia ETH가 부족합니다. 관리자에게 relayer 지갑 충전을 요청해 주세요.";
  }
  if (bodyError === "ERC3009InvalidSignature" || bodyError === "invalid signature") {
    return "전송 서명이 올바르지 않습니다. 다시 시도해 주세요.";
  }
  if (bodyError === "token does not support EIP-3009") {
    return "현재 prize token이 EIP-3009를 지원하지 않습니다.";
  }
  if (!(error instanceof Error)) {
    return bodyError ?? "자산을 전송하지 못했습니다.";
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
  return bodyError ?? error.message ?? "자산을 전송하지 못했습니다.";
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
    if (!view || view.transferMode !== "eip3009") return;

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

      const nonce = randomAuthorizationNonce();
      const validAfter = BigInt(0);
      const validBefore = BigInt(
        Math.floor(Date.now() / 1000) + AUTHORIZATION_TTL_SECONDS,
      );
      const typedData = buildTransferWithAuthorizationTypedData({
        chainId: view.chainId,
        token: view.token as Address,
        from: getAddress(from),
        to: getAddress(rawRecipient),
        value: tokenAmount,
        validAfter,
        validBefore,
        nonce,
      });
      const signature = (await provider.request({
        method: "eth_signTypedData_v4",
        params: [from, JSON.stringify(serializeTransferWithAuthorizationTypedData(typedData))],
      })) as Hex;

      const response = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: getAddress(rawRecipient),
          amount: amount.trim(),
          nonce,
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          signature,
        }),
      });
      const body = (await response.json()) as WalletView & {
        error?: string;
        hash?: string;
      };
      if (!response.ok) {
        throw new Error(errorMessage(new Error("transfer failed"), body.error));
      }

      setView(body);
      setTxHash(body.hash ?? null);
      setSuccess("전송이 완료되었습니다.");
      setRecipient("");
      setAmount("");
      setPending(false);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  const txUrl = txHash && view?.explorerBaseUrl
    ? `${view.explorerBaseUrl}/tx/${txHash}`
    : null;
  const canTransfer = view?.transferMode === "eip3009";

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

          {canTransfer ? (
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
                {pending ? "전송 처리 중…" : `${view.symbol} 전송하기`}
              </button>
            </form>
          ) : (
            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
              자산 전송은 Base Sepolia에서만 지원합니다.
            </p>
          )}

          {canTransfer ? (
            <p className="text-xs leading-5 text-zinc-500">
              Base Sepolia에서는 ETH 없이 {view.symbol}만으로 전송할 수 있습니다.
              플랫폼 relayer가 네트워크 수수료를 대신 냅니다.
            </p>
          ) : null}

          {!canTransfer ? (
            <p className="text-xs leading-5 text-zinc-500">
              잘못된 주소나 지원하지 않는 네트워크로 전송한 자산은 복구할 수 없습니다.
            </p>
          ) : null}
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
