"use client";

import { useCallback, useEffect, useState } from "react";

type CurrentRaffle = {
  address: string;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  winner: string | null;
  prizeAmount: string;
  prizeClaimed: boolean;
  prizeAttached: boolean;
};

type RaffleStatus = {
  factory: string;
  symbol: string;
  decimals: number;
  unallocated: string;
  current: CurrentRaffle | null;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatLocal(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

export function RafflePanel() {
  const [status, setStatus] = useState<RaffleStatus | null>(null);
  const [durationSeconds, setDurationSeconds] = useState("300");
  const [prizeAmount, setPrizeAmount] = useState("100");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/raffle");
    const body = (await res.json()) as RaffleStatus & { error?: string };
    if (!res.ok) {
      setStatus(null);
      setError(
        body.error?.includes("is not set")
          ? "Anvil 컨트랙트 주소가 .env에 없습니다. ANVIL_KAFFLE_FACTORY 등을 설정하세요."
          : (body.error ??
              "라운드 상태를 읽지 못했습니다. Anvil이 켜져 있는지 확인하세요."),
      );
      setLoading(false);
      return;
    }
    setStatus(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setTxHash(null);

    const res = await fetch("/api/admin/raffle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationSeconds, prizeAmount }),
    });
    const body = (await res.json()) as RaffleStatus & {
      error?: string;
      hash?: string;
      raffle?: string;
    };

    if (!res.ok) {
      setError(
        body.error?.includes("RaffleActive")
          ? "현재 라운드가 아직 끝나지 않았습니다."
          : body.error?.includes("InsufficientFunds")
            ? "Vault 사용 가능 잔액이 상금보다 적습니다. 먼저 vault에 넣어 주세요."
            : (body.error ?? "라운드 생성에 실패했습니다."),
      );
      setPending(false);
      return;
    }

    setStatus(body);
    setTxHash(body.hash ?? null);
    setPending(false);
  }

  const canCreate = !status?.current || status.current.isFinished;

  return (
    <section className="mt-10 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">라운드</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Factory owner 키로 createRaffle을 보냅니다. vault 사용 가능 잔액이
          상금 이상이어야 합니다.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {txHash ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          라운드 생성 완료 · {shortAddress(txHash)}
        </p>
      ) : null}

      {loading && !status ? (
        <p className="text-sm text-zinc-500">라운드 읽는 중…</p>
      ) : status ? (
        <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            vault 사용 가능{" "}
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
              {status.unallocated} {status.symbol}
            </span>
          </p>
          {status.current ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2">
                <dt className="text-zinc-500">현재 라운드</dt>
                <dd className="mt-1 font-mono text-xs">
                  {shortAddress(status.current.address)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">상태</dt>
                <dd className="mt-1 font-medium">
                  {status.current.isFinished ? "종료" : "진행 중"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">상금</dt>
                <dd className="mt-1 font-medium">
                  {status.current.prizeAmount} {status.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">시작</dt>
                <dd className="mt-1 text-xs">{formatLocal(status.current.startTime)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">종료</dt>
                <dd className="mt-1 text-xs">{formatLocal(status.current.endTime)}</dd>
              </div>
              {status.current.winner ? (
                <div className="col-span-2">
                  <dt className="text-zinc-500">당첨자</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {shortAddress(status.current.winner)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">열린 라운드가 없습니다.</p>
          )}
          <p className="mt-4 font-mono text-xs text-zinc-500">
            factory {shortAddress(status.factory)}
          </p>
        </div>
      ) : null}

      <form onSubmit={(event) => void create(event)} className="space-y-3">
        <label className="block text-sm text-zinc-500">
          기간 (초) · 3일 = 259200
          <input
            type="text"
            inputMode="numeric"
            name="durationSeconds"
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:text-zinc-50"
          />
        </label>
        <label className="block text-sm text-zinc-500">
          상금 금액
          <input
            type="text"
            inputMode="decimal"
            name="prizeAmount"
            value={prizeAmount}
            onChange={(event) => setPrizeAmount(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:text-zinc-50"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              pending ||
              !canCreate ||
              durationSeconds.trim().length === 0 ||
              prizeAmount.trim().length === 0
            }
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {pending
              ? "생성 중…"
              : canCreate
                ? "라운드 열기"
                : "현재 라운드가 진행 중"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || pending}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            새로고침
          </button>
        </div>
      </form>
    </section>
  );
}
