"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionSheet, type ActionSheetStep } from "@/components/ui/action-sheet";
import { getPublicChainConfig, NETWORKS } from "@/lib/chain/config";

type CurrentRaffle = {
  address: string;
  roundNumber: number | null;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  isOpen: boolean;
  canRequestWinner: boolean;
  canClaim: boolean;
  userTickets: number;
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

type EnterSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
};

function enterErrorMessage(bodyError?: string) {
  if (bodyError === "insufficient tickets") {
    return "티켓이 부족합니다.";
  }
  if (bodyError === "RoundClosed" || bodyError === "no raffle") {
    return "지금은 참여할 수 있는 라운드가 없습니다.";
  }
  if (bodyError === "invalid ticket count") {
    return "티켓 수를 올바르게 입력해 주세요.";
  }
  return bodyError ?? "참여에 실패했습니다.";
}

function enterSheetTitle(step: ActionSheetStep) {
  switch (step) {
    case "confirm":
      return "참여 내용 확인";
    case "loading":
      return "래플 참여 중";
    case "success":
      return "참여 완료";
    case "error":
      return "참여 실패";
  }
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatLocal(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

function RaffleWheel() {
  return (
    <div
      role="img"
      aria-label="래플 돌림판 미리보기"
      className="relative mx-auto flex aspect-square w-56 items-center justify-center rounded-full bg-zinc-100 p-3 dark:bg-zinc-900"
    >
      <div
        aria-hidden="true"
        className="h-full w-full rounded-full border-8 border-white shadow-lg dark:border-zinc-800"
        style={{
          background:
            "conic-gradient(from -22.5deg, #18181b 0deg 45deg, #a1a1aa 45deg 90deg, #27272a 90deg 135deg, #d4d4d8 135deg 180deg, #18181b 180deg 225deg, #a1a1aa 225deg 270deg, #27272a 270deg 315deg, #d4d4d8 315deg 360deg)",
        }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-zinc-200 bg-white text-xs font-semibold tracking-[0.2em] text-zinc-950 shadow-md dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
            KAFFLE
          </div>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-8 border-t-[18px] border-x-transparent border-t-amber-400 drop-shadow-sm"
      />
    </div>
  );
}

function toView(
  body: Partial<RaffleView> & { current?: CurrentRaffle | null },
  fallback: RaffleView | null,
): RaffleView {
  const mergedCurrent =
    body.current === undefined
      ? (fallback?.current ?? null)
      : body.current === null
        ? null
        : {
            ...(fallback?.current ?? {}),
            ...body.current,
          };

  return {
    symbol: body.symbol ?? fallback?.symbol ?? "",
    ticketBalance: body.ticketBalance ?? fallback?.ticketBalance ?? 0,
    wallet: body.wallet ?? fallback?.wallet ?? null,
    maxTicketsPerEnter:
      body.maxTicketsPerEnter ?? fallback?.maxTicketsPerEnter ?? 100,
    current: mergedCurrent as CurrentRaffle | null,
  };
}

export function RaffleEnterPanel() {
  const router = useRouter();
  const explorerBaseUrl = NETWORKS[getPublicChainConfig().slug].blockExplorerUrl;
  const [view, setView] = useState<RaffleView | null>(null);
  const [ticketCount, setTicketCount] = useState("1");
  const [loading, setLoading] = useState(true);
  const [enterSheet, setEnterSheet] = useState<EnterSheetState | null>(null);
  const [settling, setSettling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const res = await fetch("/api/raffle");
    const body = (await res.json()) as RaffleView & { error?: string };
    if (!res.ok) {
      setView(null);
      setPageError(
        body.error?.includes("is not set")
          ? "온체인 설정이 없습니다. CHAIN과 컨트랙트 주소가 .env에 있는지 확인하세요."
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

  function closeEnterSheet() {
    if (enterSheet?.step === "loading") {
      return;
    }
    setEnterSheet(null);
  }

  function handleEnterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view?.current?.isOpen || view.ticketBalance <= 0) return;

    const count = Number(ticketCount);
    const maxTickets = view.maxTicketsPerEnter;
    if (!Number.isInteger(count) || count <= 0 || count > maxTickets) {
      setPageError(`티켓은 1~${maxTickets}장까지 사용할 수 있습니다.`);
      return;
    }
    if (count > view.ticketBalance) {
      setPageError("티켓이 부족합니다.");
      return;
    }

    setPageError(null);
    setEnterSheet({
      step: "confirm",
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
    });
  }

  async function executeEnter() {
    if (!view) return;

    const count = Number(ticketCount);
    setEnterSheet({
      step: "loading",
      loadingMessage: "래플 참여 처리 중…",
      errorMessage: null,
      txHash: null,
    });

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
      setEnterSheet({
        step: "error",
        loadingMessage: "",
        errorMessage: enterErrorMessage(
          body.error === "invalid ticket count"
            ? `티켓은 1~${view.maxTicketsPerEnter}장까지 사용할 수 있습니다.`
            : body.error,
        ),
        txHash: null,
      });
      return;
    }

    setView(toView(body, view));
    setEnterSheet({
      step: "success",
      loadingMessage: "",
      errorMessage: null,
      txHash: body.hash ?? null,
    });
    router.refresh();
  }

  async function settleWinner() {
    setSettling(true);
    setPageError(null);
    setSuccess(null);
    setTxHash(null);

    const res = await fetch("/api/raffle/request-winner", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      requestHash?: string;
      fulfillHash?: string;
    };

    if (!res.ok) {
      setPageError(
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
    setPageError(null);
    setSuccess(null);
    setTxHash(null);

    const res = await fetch("/api/raffle/claim", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      hash?: string;
      winner?: string;
    };

    if (!res.ok) {
      setPageError(
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
  const enterBusy = enterSheet?.step === "loading";
  const busy = enterBusy || settling || claiming;
  const enterSheetOpen = enterSheet !== null;
  const enterSheetStep = enterSheet?.step ?? "confirm";
  const parsedTicketCount = Number(ticketCount);
  const enterTxUrl =
    enterSheet?.txHash && explorerBaseUrl
      ? `${explorerBaseUrl}/tx/${enterSheet.txHash}`
      : null;
  const statusLabel = current
    ? current.isOpen
      ? "참여 가능"
      : current.prizeClaimed
        ? "상금 지급 완료"
        : current.winner
          ? "당첨자 확정"
          : current.isFinished
            ? "종료"
            : current.canRequestWinner
              ? "당첨자 요청 가능"
              : "참여 마감"
    : null;

  return (
    <section className="space-y-4">
      {current ? (
        <div className="space-y-5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {current.roundNumber ?? "—"}회차 Kaffle
              </h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-900">
                {statusLabel}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              {formatLocal(current.startTime)}{" "}
              <span aria-hidden="true">—</span>{" "}
              {formatLocal(current.endTime)}
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              상금{" "}
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {current.prizeAmount} {view?.symbol}
              </span>
            </p>
            {current.winner ? (
              <p className="mt-2 text-sm text-zinc-500">
                당첨자{" "}
                <span className="font-mono font-medium text-zinc-950 dark:text-zinc-50">
                  {shortAddress(current.winner)}
                  {isWinner ? " · 나" : null}
                </span>
              </p>
            ) : null}
          </div>
          <RaffleWheel />
          <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-zinc-500">이번 회차 참여 티켓</dt>
                <dd className="mt-1 font-medium">{current.userTickets}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">전체 티켓</dt>
                <dd className="mt-1 font-medium">{current.totalTickets}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <RaffleWheel />
      )}

      {pageError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {pageError}
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
      ) : view && !current ? (
        <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">열린 라운드가 없습니다.</p>
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

      <form onSubmit={handleEnterSubmit} className="space-y-3">
        <label className="block text-sm text-zinc-500">
          사용할 티켓 수 (최대 {view?.maxTicketsPerEnter ?? 100})
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={view?.maxTicketsPerEnter ?? 100}
            name="ticketCount"
            value={ticketCount}
            onChange={(event) => setTicketCount(event.target.value)}
            disabled={enterBusy}
            className="mt-2 h-14 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-base text-zinc-950 outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-50"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !canEnter || ticketCount.trim().length === 0}
            className="inline-flex h-14 flex-1 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {canEnter ? "래플 참여" : "지금은 참여할 수 없습니다"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="inline-flex h-14 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 px-5 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            새로고침
          </button>
        </div>
      </form>

      <ActionSheet
        open={enterSheetOpen}
        step={enterSheetStep}
        title={enterSheetTitle(enterSheetStep)}
        onClose={closeEnterSheet}
        onConfirm={() => void executeEnter()}
        onRetry={() =>
          setEnterSheet({
            step: "confirm",
            loadingMessage: "",
            errorMessage: null,
            txHash: null,
          })
        }
        dismissible={enterSheetStep !== "loading"}
        loadingMessage={enterSheet?.loadingMessage}
        successMessage="래플 참여가 완료되었습니다."
        errorMessage={enterSheet?.errorMessage ?? undefined}
        confirmLabel="참여하기"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={enterTxUrl}
        actionLabel="트랜잭션 확인"
      >
        {view && current && Number.isInteger(parsedTicketCount) ? (
          <>
            <div className="rounded-xl bg-zinc-50 px-4 py-5 text-center dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">사용할 티켓</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {parsedTicketCount}장
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-zinc-500">보유 티켓</dt>
                  <dd className="mt-1 font-medium">{view.ticketBalance}장</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">참여 후 잔여</dt>
                  <dd className="mt-1 font-medium">
                    {Math.max(view.ticketBalance - parsedTicketCount, 0)}장
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-zinc-500">상금</dt>
                <dd className="mt-1 font-medium">
                  {current.prizeAmount} {view.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">이번 회차 내 참여</dt>
                <dd className="mt-1 font-medium">{current.userTickets}장</dd>
              </div>
            </dl>
            <p className="text-xs leading-5 text-zinc-500">
              참여에 사용한 티켓은 취소할 수 없습니다. 티켓 수가 맞는지 확인해 주세요.
            </p>
          </>
        ) : null}
      </ActionSheet>
    </section>
  );
}
