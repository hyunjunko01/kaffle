"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicChainConfig } from "@/lib/chain/config";
import type { entryOperationResponse } from "@/lib/raffle/entry-recovery";

import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import type { CurrentRaffle, RaffleView } from "./types";
import { toView } from "./types";

type EntryResult = ReturnType<typeof entryOperationResponse>;
type EntryRequest = { requestId: string; ticketCount: number };

type ActionSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
  successMessage: string;
  pending?: boolean;
};

type EnterRaffleFlowProps = {
  view: RaffleView;
  current: CurrentRaffle;
  explorerBaseUrl: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onViewUpdate: (view: RaffleView) => void;
  onPageError: (message: string | null) => void;
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
      return "티켓 사용 확인";
    case "loading":
      return "래플 참여 중";
    case "success":
      return "참여 완료";
    case "error":
      return "참여 실패";
  }
}

export function EnterRaffleFlow({
  view,
  current,
  explorerBaseUrl,
  disabled,
  onBusyChange,
  onViewUpdate,
  onPageError,
}: EnterRaffleFlowProps) {
  const router = useRouter();
  const [ticketCount, setTicketCount] = useState("1");
  const [sheet, setSheet] = useState<ActionSheetState | null>(null);

  const [awaitingResult, setAwaitingResult] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const requestRef = useRef<EntryRequest | null>(null);
  const inFlight = useRef(false);
  const storageKey = `kaffle:entry:${getPublicChainConfig().chainId}:${view.wallet}`;

  const refreshView = useCallback(async () => {
    try {
      const response = await fetch("/api/raffle");
      if (!response.ok) throw new Error("refresh failed");
      onViewUpdate(toView(await response.json(), null));
      router.refresh();
    } catch {
      onPageError("참여 결과는 저장되었습니다. 최신 티켓과 라운드 정보는 새로고침해 주세요.");
    }
  }, [onViewUpdate, onPageError, router]);

  const applyResult = useCallback((result: EntryResult) => {
    const pending = result.state === "pending";
    if (pending) {
      requestRef.current = { requestId: result.requestId, ticketCount: result.ticketCount };
      try { localStorage.setItem(storageKey, JSON.stringify(requestRef.current)); } catch { /* DB recovery remains available. */ }
    } else {
      requestRef.current = null;
      try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    }
    setAwaitingResult(pending);
    onBusyChange(false);
    setSheet({
      step: result.state === "failed" ? "error" : "success",
      pending,
      loadingMessage: "",
      txHash: result.hash,
      successMessage: pending
        ? "참여 결과를 확인하고 있습니다. 티켓은 임시 차감되었으며, 창을 닫아도 확인을 계속합니다."
        : "래플 참여가 완료되었습니다.",
      errorMessage: result.state === "failed" ? "참여가 완료되지 않아 티켓을 돌려드렸습니다." : null,
    });
    if (!pending) void refreshView();
  }, [onBusyChange, refreshView, storageKey]);

  useEffect(() => {
    let cancelled = false;
    async function resume() {
      let saved: EntryRequest | null = null;
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) ?? "null") as EntryRequest | null;
        if (value && typeof value.requestId === "string" && Number.isInteger(value.ticketCount)) saved = value;
      } catch { /* Fall back to the server's active operation. */ }
      const query = saved ? `?requestId=${encodeURIComponent(saved.requestId)}` : "";
      try {
        const response = await fetch(`/api/raffle/enter${query}`);
        if (cancelled) return;
        if (saved) requestRef.current = saved;
        if (!response.ok) {
          if (saved) setAwaitingResult(true);
          return;
        }
        const result = await response.json();
        if (!cancelled && result.operationId) applyResult(result);
      } catch {
        if (!cancelled && saved) {
          requestRef.current = saved;
          setAwaitingResult(true);
        }
      } finally {
        if (!cancelled) setRecovering(false);
      }
    }
    void resume();
    return () => { cancelled = true; };
  }, [storageKey, applyResult]);

  useEffect(() => {
    if (!awaitingResult) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const request = requestRef.current;
      if (!request) return;
      try {
        const response = await fetch(`/api/raffle/enter?requestId=${encodeURIComponent(request.requestId)}`);
        if (response.ok) {
          const result = await response.json();
          if (!cancelled && result.operationId) {
            if (result.state !== "pending") {
              applyResult(result);
              return;
            }
          }
        }
      } catch { /* Keep the same operation and retry status checks. */ }
      if (!cancelled) timer = setTimeout(() => void poll(), 3_000);
    }
    timer = setTimeout(() => void poll(), 3_000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [awaitingResult, applyResult]);

  const canEnter = Boolean(current.isOpen && view.ticketBalance > 0 && !awaitingResult && !recovering);
  const enterBusy = sheet?.step === "loading";
  const sheetOpen = sheet !== null;
  const sheetStep = sheet?.step ?? "confirm";
  const parsedTicketCount = Number(ticketCount);
  const txUrl =
    sheet?.txHash && explorerBaseUrl
      ? `${explorerBaseUrl}/tx/${sheet.txHash}`
      : null;

  function closeSheet() {
    if (sheet?.step === "loading") {
      return;
    }
    setSheet(null);
    onBusyChange(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current.isOpen || view.ticketBalance <= 0 || awaitingResult || recovering || inFlight.current) return;

    const count = Number(ticketCount);
    const maxTickets = view.maxTicketsPerEnter;
    if (!Number.isInteger(count) || count <= 0 || count > maxTickets) {
      onPageError(`티켓은 1~${maxTickets}장까지 사용할 수 있습니다.`);
      return;
    }
    if (count > view.ticketBalance) {
      onPageError("티켓이 부족합니다.");
      return;
    }

    requestRef.current = { requestId: crypto.randomUUID(), ticketCount: count };
    onPageError(null);
    setSheet({
      step: "confirm",
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
      successMessage: "래플 참여가 완료되었습니다.",
    });
  }

  function handleRetry() {
    requestRef.current = { requestId: crypto.randomUUID(), ticketCount: Number(ticketCount) };
    setSheet({ step: "confirm", loadingMessage: "", errorMessage: null, txHash: null, successMessage: "" });
  }

  async function executeEnter() {
    if (inFlight.current) return;
    const request = requestRef.current;
    if (!request) return;
    inFlight.current = true;
    try { localStorage.setItem(storageKey, JSON.stringify(request)); } catch { /* Server operation is durable. */ }
    onBusyChange(true);
    setAwaitingResult(true);
    setSheet({ step: "loading", loadingMessage: "래플 참여 처리 중…", errorMessage: null, txHash: null, successMessage: "" });

    try {
      const response = await fetch("/api/raffle/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json();
      if (requestRef.current?.requestId !== request.requestId) return;
      if (body.operationId) {
        applyResult(body);
        return;
      }
      if (body.error === "entry already pending") {
        const active = await fetch("/api/raffle/enter");
        const result = await active.json();
        if (active.ok && result.operationId) {
          applyResult(result);
          return;
        }
      }
      if (response.status >= 400 && response.status < 500 && body.error !== "entry already pending") {
        requestRef.current = null;
        try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
        setAwaitingResult(false);
        setSheet({ step: "error", loadingMessage: "", errorMessage: enterErrorMessage(body.error), txHash: null, successMessage: "" });
        return;
      }
      // A server/transport error does not prove the transaction failed.
      throw new Error("entry status unknown");
    } catch {
      if (requestRef.current?.requestId !== request.requestId) return;
      setSheet({
        step: "error", pending: true, loadingMessage: "", txHash: null, successMessage: "",
        errorMessage: "참여 결과를 아직 확인할 수 없습니다. 상태 확인을 다시 시도해 주세요. 티켓은 중복 차감되지 않습니다.",
      });
    } finally {
      inFlight.current = false;
      onBusyChange(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-center text-sm text-muted">
          참여{" "}
          <span className="font-mono font-medium tabular-nums text-foreground">
            {current.userTickets}장
          </span>
          {" / "}
          보유{" "}
          <span className="font-mono font-medium tabular-nums text-foreground">
            {view.ticketBalance}장
          </span>
        </p>

        <div className="flex h-11 items-stretch justify-center gap-2">
          <label className="relative block w-44 shrink-0">
            <span className="sr-only">사용할 티켓 수</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-xs text-muted">
              최대 {view.maxTicketsPerEnter}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={view.maxTicketsPerEnter}
              name="ticketCount"
              value={ticketCount}
              onChange={(event) => setTicketCount(event.target.value)}
              disabled={enterBusy}
              placeholder="0"
              className="ticket-count-input box-border h-full w-full rounded-[var(--kaffle-radius-sm)] border border-border bg-transparent py-0 pl-[3.75rem] pr-2 text-right text-sm leading-none tabular-nums text-foreground outline-none focus:border-border-strong disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={disabled || !canEnter || ticketCount.trim().length === 0}
            className="inline-flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
          >
            {canEnter ? "티켓 사용" : "참여 불가"}
          </button>
        </div>
      </form>

      {awaitingResult ? (
        <p role="status" className="mt-3 text-center text-sm text-muted">
          이전 참여 결과를 확인하고 있습니다.{" "}
          <button type="button" disabled={enterBusy} className="underline" onClick={() => void executeEnter()}>
            상태 확인
          </button>
        </p>
      ) : null}

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={sheet?.pending ? "참여 확인 중" : enterSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeEnter()}
        onRetry={() => {
          if (requestRef.current) {
            void executeEnter();
          } else {
            handleRetry();
          }
        }}
        retryLabel={awaitingResult ? "상태 확인" : "다시 시도"}
        dismissible={sheetStep !== "loading"}
        loadingMessage={sheet?.loadingMessage}
        successMessage={sheet?.successMessage}
        errorMessage={sheet?.errorMessage ?? undefined}
        confirmLabel="티켓 사용"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={txUrl}
        actionLabel="온체인 트랜잭션 확인"
      >
        {Number.isInteger(parsedTicketCount) ? (
          <>
            <div className="rounded-[var(--kaffle-radius-sm)] bg-surface px-4 py-5 text-center">
              <p className="text-xs text-muted">사용할 티켓</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {parsedTicketCount}
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">보유 티켓</dt>
                <dd className="text-right font-medium tabular-nums">
                  {view.ticketBalance}장
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">사용 후 잔여 티켓</dt>
                <dd className="text-right font-medium tabular-nums">
                  {Math.max(view.ticketBalance - parsedTicketCount, 0)}장
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">상금</dt>
                <dd className="text-right font-medium">
                  {current.prizeAmount} {view.symbol}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-5 text-muted">
              참여에 사용한 티켓은 취소할 수 없습니다. 티켓 수가 맞는지 확인해
              주세요.
            </p>
          </>
        ) : null}
      </ActionSheet>
    </>
  );
}
