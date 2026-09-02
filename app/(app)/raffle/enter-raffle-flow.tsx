"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionSheet, type ActionSheetStep } from "@/components/ui/action-sheet";
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
  loading: boolean;
  onBusyChange: (busy: boolean) => void;
  onViewUpdate: (view: RaffleView) => void;
  onPageError: (message: string | null) => void;
  onReload: () => void;
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
  loading,
  onBusyChange,
  onViewUpdate,
  onPageError,
  onReload,
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
        <label className="block text-sm text-zinc-500">
          사용할 티켓 수 (최대 {view.maxTicketsPerEnter})
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={view.maxTicketsPerEnter}
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
            disabled={disabled || !canEnter || ticketCount.trim().length === 0}
            className="inline-flex h-14 flex-1 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {canEnter ? "래플 참여" : "지금은 참여할 수 없습니다"}
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading || disabled}
            className="inline-flex h-14 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-zinc-200 px-5 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            새로고침
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
    </>
  );
}
