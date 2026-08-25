"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CurrentRaffle = {
  address: string;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  isOpen: boolean;
  canRequestWinner: boolean;
  canClaim: boolean;
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

function toView(
  body: Partial<RaffleView> & { current?: CurrentRaffle | null },
  fallback: RaffleView | null,
): RaffleView {
  return {
    symbol: body.symbol ?? fallback?.symbol ?? "",
    ticketBalance: body.ticketBalance ?? fallback?.ticketBalance ?? 0,
    wallet: body.wallet ?? fallback?.wallet ?? null,
    maxTicketsPerEnter:
      body.maxTicketsPerEnter ?? fallback?.maxTicketsPerEnter ?? 100,
    current: body.current ?? fallback?.current ?? null,
  };
}

export function RaffleEnterPanel() {
  const router = useRouter();
  const [view, setView] = useState<RaffleView | null>(null);
  const [ticketCount, setTicketCount] = useState("1");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [settling, setSettling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);
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

    setView(toView(body, view));
    setTxHash(body.hash ?? null);
    setSuccess("참여 완료");
    setPending(false);
    router.refresh();
  }

  async function settleWinner() {
    setSettling(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    const res = await fetch("/api/raffle/request-winner", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      requestHash?: string;
      fulfillHash?: string;
    };

    if (!res.ok) {
      setError(
        body.error === "RoundOpen"
          ? "아직 라운드가 끝나지 않았습니다."
          : body.error === "NoEntries"
            ? "참여자가 없어 당첨자를 뽑을 수 없습니다."
            : body.error === "AlreadySettled"
              ? "이미 당첨자가 정해졌습니다."
              : body.error === "AlreadyRequested"
                ? "이미 당첨자 요청이 들어갔습니다."
                : (body.error ?? "당첨자 요청에 실패했습니다."),
      );
      setSettling(false);
      return;
    }

    setView(toView(body, view));
    setTxHash(body.fulfillHash ?? body.requestHash ?? null);
    setSuccess(
      body.current?.winner
        ? `당첨자 확정 · ${shortAddress(body.current.winner)}`
        : "당첨자 요청 완료",
    );
    setSettling(false);
    router.refresh();
  }

  async function claimPrize() {
    setClaiming(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    const res = await fetch("/api/raffle/claim", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      hash?: string;
      winner?: string;
    };

    if (!res.ok) {
      setError(
        body.error === "NoWinner"
          ? "아직 당첨자가 없습니다."
          : body.error === "AlreadyClaimed"
            ? "이미 상금을 지급했습니다."
            : body.error === "PrizeNotAttached"
              ? "이 라운드에 상금이 없습니다."
              : (body.error ?? "상금 수령에 실패했습니다."),
      );
      setClaiming(false);
      return;
    }

    setView(toView(body, view));
    setTxHash(body.hash ?? null);
    setSuccess(
      body.winner
        ? `상금 지급 완료 · ${shortAddress(body.winner)}`
        : "상금 지급 완료",
    );
    setClaiming(false);
    router.refresh();
  }

  const current = view?.current ?? null;
  const canEnter = Boolean(current?.isOpen && view && view.ticketBalance > 0);
  const canRequestWinner = Boolean(current?.canRequestWinner);
  const canClaim = Boolean(current?.canClaim);
  const isWinner =
    Boolean(current?.winner) &&
    Boolean(view?.wallet) &&
    current!.winner!.toLowerCase() === view!.wallet!.toLowerCase();
  const busy = pending || settling || claiming;

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
          {txHash ? ` · ${shortAddress(txHash)}` : null}
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
                    : current.prizeClaimed
                      ? "상금 지급 완료"
                      : current.winner
                        ? "당첨자 확정"
                        : current.isFinished
                          ? "종료"
                          : current.canRequestWinner
                            ? "당첨자 요청 가능"
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
                    {isWinner ? " · 나" : null}
                    {current.prizeClaimed ? " · 지급됨" : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">열린 라운드가 없습니다.</p>
          )}
        </div>
      ) : null}

      {canRequestWinner ? (
        <button
          type="button"
          onClick={() => void settleWinner()}
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {settling ? "당첨자 추첨 중…" : "당첨자 요청"}
        </button>
      ) : null}

      {canClaim ? (
        <button
          type="button"
          onClick={() => void claimPrize()}
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {claiming
            ? "지급 중…"
            : isWinner
              ? "상금 받기"
              : "당첨자에게 상금 보내기"}
        </button>
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
            disabled={busy || !canEnter || ticketCount.trim().length === 0}
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
            disabled={loading || busy}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            새로고침
          </button>
        </div>
      </form>
    </section>
  );
}
