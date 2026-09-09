"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionSheet, type ActionSheetStep } from "@/components/ui/action-sheet";
import type { CurrentRaffle, RaffleView } from "./types";
import { toView } from "./types";
import { shortAddress } from "./utils";

type ActionSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
  successMessage: string;
};

type SettleWinnerFlowProps = {
  view: RaffleView | null;
  current: CurrentRaffle;
  explorerBaseUrl: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onViewUpdate: (view: RaffleView) => void;
};

function settleErrorMessage(bodyError?: string) {
  if (bodyError === "RoundOpen") {
    return "아직 라운드가 끝나지 않았습니다.";
  }
  if (bodyError === "NoEntries") {
    return "참여자가 없어 당첨자를 뽑을 수 없습니다.";
  }
  if (bodyError === "AlreadySettled") {
    return "이미 당첨자가 정해졌습니다.";
  }
  if (bodyError === "AlreadyRequested") {
    return "이미 당첨자 요청이 들어갔습니다.";
  }
  return bodyError ?? "당첨자 요청에 실패했습니다.";
}

function settleSheetTitle(step: ActionSheetStep) {
  switch (step) {
    case "confirm":
      return "당첨자 추첨 확인";
    case "loading":
      return "당첨자 추첨 중";
    case "success":
      return "추첨 완료";
    case "error":
      return "추첨 실패";
  }
}

export function SettleWinnerFlow({
  view,
  current,
  explorerBaseUrl,
  disabled,
  onBusyChange,
  onViewUpdate,
}: SettleWinnerFlowProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<ActionSheetState | null>(null);

  const sheetOpen = sheet !== null;
  const sheetStep = sheet?.step ?? "confirm";
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

  function openSheet() {
    setSheet({
      step: "confirm",
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
      successMessage: "",
    });
  }

  async function executeSettleWinner() {
    onBusyChange(true);
    setSheet({
      step: "loading",
      loadingMessage: "당첨자 추첨 처리 중…",
      errorMessage: null,
      txHash: null,
      successMessage: "",
    });

    const res = await fetch("/api/raffle/request-winner", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      requestHash?: string;
      fulfillHash?: string;
    };

    if (!res.ok) {
      onBusyChange(false);
      setSheet({
        step: "error",
        loadingMessage: "",
        errorMessage: settleErrorMessage(body.error),
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
      txHash: body.fulfillHash ?? body.requestHash ?? null,
      successMessage: body.current?.winner
        ? `당첨자가 확정되었습니다 (${shortAddress(body.current.winner)}).`
        : "당첨자 요청이 완료되었습니다.",
    });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        당첨자 요청
      </button>

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={settleSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeSettleWinner()}
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
        confirmLabel="추첨하기"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={txUrl}
        actionLabel="트랜잭션 확인"
      >
        <div className="rounded-[var(--kaffle-radius-md)] bg-zinc-50 px-4 py-5 text-center dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">회차</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {current.roundNumber ?? "—"}회차
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">상금</dt>
            <dd className="mt-1 font-medium">
              {current.prizeAmount} {view?.symbol}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">전체 티켓</dt>
            <dd className="mt-1 font-medium">{current.totalTickets}장</dd>
          </div>
        </dl>
        <p className="text-xs leading-5 text-zinc-500">
          라운드가 종료된 뒤 당첨자를 추첨합니다. 추첨 후에는 되돌릴 수 없습니다.
        </p>
      </ActionSheet>
    </>
  );
}
