"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CurrentRaffle = {
  address: string;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  isOpen: boolean;
  totalTickets: number;
  winner: string | null;
  prizeAmount: string;
  prizeClaimed: boolean;
  prizeAttached: boolean;
};

type RaffleView = {
  symbol: string;
  ticketBalance: number;
  wallet: string | null;
  maxTicketsPerEnter: number;
  current: CurrentRaffle | null;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatLocal(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

export function RaffleEnterPanel() {
  const router = useRouter();
  const [view, setView] = useState<RaffleView | null>(null);
  const [ticketCount, setTicketCount] = useState("1");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/raffle");
    const body = (await res.json()) as RaffleView & { error?: string };
    if (!res.ok) {
      setView(null);
      setError(
        body.error?.includes("is not set")
          ? "온체인 설정이 없습니다. Anvil 주소가 .env에 있는지 확인하세요."
          : (body.error ?? "래플 상태를 읽지 못했습니다."),
      );
      setLoading(false);
      return;
    }
    setView(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setTxHash(null);

    const count = Number(ticketCount);
    const res = await fetch("/api/raffle/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketCount: count }),
    });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      hash?: string;
    };

    if (!res.ok) {
      setError(
        body.error === "insufficient tickets"
          ? "티켓이 부족합니다."
          : body.error === "RoundClosed" || body.error === "no raffle"
            ? "지금은 참여할 수 있는 라운드가 없습니다."
            : body.error === "invalid ticket count"
              ? `티켓은 1~${view?.maxTicketsPerEnter ?? 100}장까지 사용할 수 있습니다.`
              : (body.error ?? "참여에 실패했습니다."),
      );
      setPending(false);
      return;
    }

    setView({
      symbol: body.symbol,
      ticketBalance: body.ticketBalance,
      wallet: body.wallet ?? view?.wallet ?? null,
      maxTicketsPerEnter:
        body.maxTicketsPerEnter ?? view?.maxTicketsPerEnter ?? 100,
      current: body.current,
    });
    setTxHash(body.hash ?? null);
    setPending(false);
    router.refresh();
  }

  const current = view?.current ?? null;
  const canEnter = Boolean(current?.isOpen && view && view.ticketBalance > 0);

  return (
    <section className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {txHash ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          참여 완료 · {shortAddress(txHash)}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-sm text-zinc-500">라운드 확인 중…</p>
      ) : view ? (
        <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            내 티켓{" "}
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
              {view.ticketBalance}
            </span>
          </p>
          {current ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">상태</dt>
                <dd className="mt-1 font-medium">
                  {current.isOpen
                    ? "참여 가능"
                    : current.isFinished
                      ? "종료"
                      : "참여 마감"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">상금</dt>
                <dd className="mt-1 font-medium">
                  {current.prizeAmount} {view.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">참여 티켓 합</dt>
                <dd className="mt-1 font-medium">{current.totalTickets}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">종료</dt>
                <dd className="mt-1 text-xs">{formatLocal(current.endTime)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-zinc-500">라운드</dt>
                <dd className="mt-1 font-mono text-xs">
                  {shortAddress(current.address)}
                </dd>
              </div>
              {current.winner ? (
                <div className="col-span-2">
                  <dt className="text-zinc-500">당첨자</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {shortAddress(current.winner)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">열린 라운드가 없습니다.</p>
          )}
        </div>
      ) : null}

      <form onSubmit={(event) => void enter(event)} className="space-y-3">
        <label className="block text-sm text-zinc-500">
          사용할 티켓 수 (최대 {view?.maxTicketsPerEnter ?? 100})
          <input
            type="text"
            inputMode="numeric"
            name="ticketCount"
            value={ticketCount}
            onChange={(event) => setTicketCount(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:text-zinc-50"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !canEnter || ticketCount.trim().length === 0}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {pending
              ? "참여 중…"
              : canEnter
                ? "래플 참여"
                : "지금은 참여할 수 없습니다"}
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
