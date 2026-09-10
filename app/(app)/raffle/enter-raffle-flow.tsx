"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import type { CurrentRaffle, RaffleView } from "./types";
import { toView } from "./types";

type ActionSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
  successMessage: string;
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
      return "참여 내용 확인";
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

  const canEnter = Boolean(current.isOpen && view.ticketBalance > 0);
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
    if (!current.isOpen || view.ticketBalance <= 0) return;

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

    onPageError(null);
    setSheet({
      step: "confirm",
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
      successMessage: "래플 참여가 완료되었습니다.",
    });
  }

  async function executeEnter() {
    const count = Number(ticketCount);
    onBusyChange(true);
    setSheet({
      step: "loading",
      loadingMessage: "래플 참여 처리 중…",
      errorMessage: null,
      txHash: null,
      successMessage: "",
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
      onBusyChange(false);
      setSheet({
        step: "error",
        loadingMessage: "",
        errorMessage: enterErrorMessage(
          body.error === "invalid ticket count"
            ? `티켓은 1~${view.maxTicketsPerEnter}장까지 사용할 수 있습니다.`
            : body.error,
        ),
        txHash: null,
        successMessage: "",
      });
      return;
    }

    onViewUpdate(toView(body, view));
    onBusyChange(false);
    setSheet({
      step: "success",
      loadingMessage: "",
      errorMessage: null,
      txHash: body.hash ?? null,
      successMessage: "래플 참여가 완료되었습니다.",
    });
    router.refresh();
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
              className="ticket-count-input box-border h-full w-full rounded-[var(--kaffle-radius-lg)] border border-border bg-transparent py-0 pl-[3.75rem] pr-2 text-right text-sm leading-none tabular-nums text-foreground outline-none focus:border-border-strong disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={disabled || !canEnter || ticketCount.trim().length === 0}
            className="inline-flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--kaffle-radius-lg)] bg-foreground px-5 text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
          >
            {canEnter ? "티켓 사용" : "참여 불가"}
          </button>
        </div>
      </form>

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={enterSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeEnter()}
        onRetry={() =>
          setSheet({
            step: "confirm",
            loadingMessage: "",
            errorMessage: null,
            txHash: null,
            successMessage: "",
          })
        }
        dismissible={sheetStep !== "loading"}
        loadingMessage={sheet?.loadingMessage}
        successMessage={sheet?.successMessage}
        errorMessage={sheet?.errorMessage ?? undefined}
        confirmLabel="참여하기"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={txUrl}
        actionLabel="트랜잭션 확인"
      >
        {Number.isInteger(parsedTicketCount) ? (
          <>
            <div className="rounded-[var(--kaffle-radius-lg)] bg-surface px-4 py-5 text-center">
              <p className="text-xs text-muted">사용할 티켓</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {parsedTicketCount}장
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-muted">보유 티켓</dt>
                  <dd className="mt-1 font-medium">{view.ticketBalance}장</dd>
                </div>
                <div>
                  <dt className="text-muted">참여 후 잔여</dt>
                  <dd className="mt-1 font-medium">
                    {Math.max(view.ticketBalance - parsedTicketCount, 0)}장
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-muted">상금</dt>
                <dd className="mt-1 font-medium">
                  {current.prizeAmount} {view.symbol}
                </dd>
              </div>
              <div>
                <dt className="text-muted">이번 회차 내 참여</dt>
                <dd className="mt-1 font-medium">{current.userTickets}장</dd>
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
