"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import type { CurrentRaffle, RaffleView } from "./types";
import { toView } from "./types";
import { formatWinnerLabel, shortAddress } from "./utils";

type ActionSheetState = {
  step: ActionSheetStep;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
  successMessage: string;
};

type ClaimPrizeFlowProps = {
  view: RaffleView;
  current: CurrentRaffle;
  explorerBaseUrl: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onViewUpdate: (view: RaffleView) => void;
};

function claimErrorMessage(bodyError?: string) {
  if (bodyError === "NoWinner") {
    return "아직 당첨자가 없습니다.";
  }
  if (bodyError === "AlreadyClaimed") {
    return "이미 상금을 지급했습니다.";
  }
  if (bodyError === "PrizeNotAttached") {
    return "이 라운드에 상금이 없습니다.";
  }
  return bodyError ?? "상금 수령에 실패했습니다.";
}

function claimSheetTitle(step: ActionSheetStep) {
  switch (step) {
    case "confirm":
      return "상금 수령 확인";
    case "loading":
      return "상금 수령 중";
    case "success":
      return "수령 완료";
    case "error":
      return "수령 실패";
  }
}

export function ClaimPrizeFlow({
  view,
  current,
  explorerBaseUrl,
  disabled,
  onBusyChange,
  onViewUpdate,
}: ClaimPrizeFlowProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<ActionSheetState | null>(null);
  const [pendingView, setPendingView] = useState<RaffleView | null>(null);

  const sheetOpen = sheet !== null;
  const sheetStep = sheet?.step ?? "confirm";
  const txUrl =
    sheet?.txHash && explorerBaseUrl
      ? `${explorerBaseUrl}/tx/${sheet.txHash}`
      : null;
  const winnerLabel = formatWinnerLabel(
    current.winner,
    current.winnerNickname,
  );

  function closeSheet() {
    if (sheet?.step === "loading") {
      return;
    }
    if (pendingView) {
      onViewUpdate(pendingView);
      setPendingView(null);
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

  async function executeClaimPrize() {
    onBusyChange(true);
    setSheet({
      step: "loading",
      loadingMessage: "상금 수령 처리 중…",
      errorMessage: null,
      txHash: null,
      successMessage: "",
    });

    const res = await fetch("/api/raffle/claim", { method: "POST" });
    const body = (await res.json()) as RaffleView & {
      error?: string;
      hash?: string;
      winner?: string;
    };

    if (!res.ok) {
      onBusyChange(false);
      setSheet({
        step: "error",
        loadingMessage: "",
        errorMessage: claimErrorMessage(body.error),
        txHash: null,
        successMessage: "",
      });
      return;
    }

    // Defer parent update until the sheet closes so this flow stays mounted
    // through the success step. Force claimed flags in case the RPC read lags.
    const nextView = toView(
      {
        ...body,
        current: body.current
          ? {
              ...body.current,
              canClaim: false,
              prizeClaimed: true,
            }
          : body.current,
      },
      view,
    );
    setPendingView(nextView);
    onBusyChange(false);
    setSheet({
      step: "success",
      loadingMessage: "",
      errorMessage: null,
      txHash: body.hash ?? null,
      successMessage: body.winner
        ? `상금이 ${shortAddress(body.winner)} 지갑으로 전송되었습니다.`
        : "상금 수령이 완료되었습니다.",
    });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
      >
        상금 받기
      </button>

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={claimSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeClaimPrize()}
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
        confirmLabel="상금 받기"
        cancelLabel="취소"
        closeLabel="확인"
        actionHref={txUrl}
        actionLabel="트랜잭션 확인"
      >
        <div className="rounded-[var(--kaffle-radius-sm)] bg-surface px-4 py-5 text-center">
          <p className="text-xs text-muted">수령 상금</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {current.prizeAmount} {view.symbol}
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-muted">회차</dt>
            <dd className="text-right font-medium">
              {current.roundNumber ?? "—"}회차
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-muted">당첨자</dt>
            <dd className="text-right font-medium">{winnerLabel}</dd>
          </div>
          {current.winner ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted">받는 지갑</dt>
              <dd className="max-w-[65%] break-all text-right font-mono text-xs">
                {current.winner}
              </dd>
            </div>
          ) : null}
        </dl>
      </ActionSheet>
    </>
  );
}
