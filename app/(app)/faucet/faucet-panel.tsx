"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FaucetView = {
  faucet: string;
  token: string;
  symbol: string;
  claimAmount: string;
  faucetBalance: string;
  walletBalance: string;
  claimed: boolean;
  paused: boolean;
  canClaim: boolean;
  ticketBalance: number;
  wallet: string;
  hash?: string;
  explorerBaseUrl?: string;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function explorerLink(baseUrl: string | undefined, hash: string) {
  return baseUrl ? `${baseUrl}/tx/${hash}` : null;
}

export function FaucetPanel() {
  const router = useRouter();
  const [view, setView] = useState<FaucetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/faucet");
    const body = (await res.json()) as FaucetView & { error?: string };
    if (!res.ok) {
      setView(null);
      setError(
        body.error?.includes("is not set")
          ? "Faucet 컨트랙트 주소가 .env에 없습니다."
          : (body.error ?? "온체인 미션을 불러오지 못했습니다."),
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

  async function claim() {
    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/faucet", { method: "POST" });
    const body = (await res.json()) as FaucetView & {
      error?: string;
      hash?: string;
    };
    if (!res.ok) {
      setError(
        body.error === "AlreadyClaimed"
          ? "이미 온체인 미션을 완료했습니다."
          : body.error === "InsufficientFunds"
            ? "현재 지급 가능한 USDC가 없습니다."
            : body.error === "Paused"
              ? "온체인 미션이 잠시 중단되었습니다."
              : (body.error ?? "온체인 미션에 실패했습니다."),
      );
      setPending(false);
      return;
    }

    setView(body);
    setSuccess("온체인 미션 완료");
    setPending(false);
    router.refresh();
  }

  const txUrl = view?.hash
    ? explorerLink(view.explorerBaseUrl, view.hash)
    : null;

  return (
    <section className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-[var(--kaffle-radius-lg)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-[var(--kaffle-radius-lg)] bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {success}
          {txUrl ? (
            <>
              {" · "}
              <Link href={txUrl} target="_blank" className="underline">
                트랜잭션 확인
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-center text-sm text-muted">온체인 미션 확인 중…</p>
      ) : view ? (
        <>
          <div className="rounded-[var(--kaffle-radius-lg)] border border-border p-5">
            <p className="text-sm text-muted">내 지갑</p>
            <p className="mt-1 break-all font-mono text-xs">{view.wallet}</p>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-muted">내 {view.symbol}</dt>
                <dd className="mt-1 font-medium">
                  {view.walletBalance} {view.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-muted">미션 보상</dt>
                <dd className="mt-1 font-medium">
                  {view.claimAmount} {view.symbol}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Faucet</dt>
                <dd className="mt-1 font-mono text-xs">
                  {shortAddress(view.faucet)}
                </dd>
              </div>
              {view.hash ? (
                <div className="col-span-2">
                  <dt className="text-muted">최근 트랜잭션</dt>
                  <dd className="mt-1 break-all font-mono text-xs">
                    {txUrl ? (
                      <Link href={txUrl} target="_blank" className="underline">
                        {shortAddress(view.hash)}
                      </Link>
                    ) : (
                      shortAddress(view.hash)
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-[var(--kaffle-radius-lg)] border border-border p-5">
            <h2 className="text-base font-semibold">첫 USDC 받기</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              버튼을 누르면 플랫폼이 가스비를 내고 내 지갑으로{" "}
              {view.claimAmount} {view.symbol}를 보냅니다. 트랜잭션을
              Basescan에서 확인하면 티켓 1장을 받습니다.
            </p>
            <button
              type="button"
              onClick={() => void claim()}
              disabled={pending || !view.canClaim}
              className="mt-6 h-11 w-full rounded-[var(--kaffle-radius-lg)] bg-foreground px-4 text-sm font-medium text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
            >
              {pending
                ? "처리 중…"
                : view.paused
                  ? "미션 일시 중단"
                  : view.claimed
                    ? "이미 완료한 미션"
                    : "USDC 받고 티켓 받기"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
