"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import type { CurrentRaffle, RaffleView } from "./types";
import { toView } from "./types";
import { RaffleWheel } from "./raffle-wheel";
import { formatWinnerLabel } from "./utils";
import {
  hasSeenWinnerReveal,
  markWinnerRevealSeen,
} from "./winner-reveal-seen";
import {
  buildTicketSlots,
  findWinnerSlotIndex,
} from "./wheel-slots";
import { wheelSound } from "./wheel-sound";

const MIN_SPIN_MS = 2800;
const REPLAY_SPIN_MS = 3200;
const PREPARE_MS = 700;
const VRF_POLL_MS = 1500;
const VRF_WAIT_MS = 90_000;

const MSG_PREPARING = "돌림판 준비 중...";
const MSG_CHECKING = "온체인 추첨 결과 확인 중...";

function congratulateWinner(
  winner: string | null | undefined,
  winnerNickname?: string | null,
) {
  if (!winner) {
    return "추첨이 완료되었습니다.";
  }
  return `축하드립니다. ${formatWinnerLabel(winner, winnerNickname)}`;
}

type ConfirmSheetState = {
  step: Extract<ActionSheetStep, "confirm" | "error">;
  errorMessage: string | null;
};

type DrawPhase = "preparing" | "spinning" | "stopping" | "success" | "error";

type DrawModalState = {
  phase: DrawPhase;
  message: string;
  txHash: string | null;
  targetIndex: number | null;
  markSeenOnClose: boolean;
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForWinner(
  fallback: RaffleView | null,
  timeoutMs: number,
): Promise<RaffleView> {
  const started = Date.now();
  let latest = fallback;

  while (Date.now() - started < timeoutMs) {
    const res = await fetch("/api/raffle");
    if (!res.ok) {
      await sleep(VRF_POLL_MS);
      continue;
    }
    const body = (await res.json()) as RaffleView;
    latest = toView(body, latest);
    if (latest.current?.winner) {
      return latest;
    }
    await sleep(VRF_POLL_MS);
  }

  throw new Error("VRFTimeout");
}

function WheelDrawModal({
  open,
  phase,
  message,
  txUrl,
  slots,
  targetIndex,
  onStopComplete,
  onClose,
}: {
  open: boolean;
  phase: DrawPhase;
  message: string;
  txUrl: string | null;
  slots: ReturnType<typeof buildTicketSlots>;
  targetIndex: number | null;
  onStopComplete: () => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const wheelPhase =
    phase === "preparing"
      ? "idle"
      : phase === "spinning"
        ? "spinning"
        : phase === "stopping"
          ? "stopping"
          : phase === "success"
            ? "stopped"
            : "idle";

  const title =
    phase === "preparing" || phase === "spinning" || phase === "stopping"
      ? "당첨자 추첨 중"
      : phase === "success"
        ? "추첨 완료"
        : "추첨 실패";

  const displayMessage =
    phase === "stopping" ? MSG_CHECKING : message;

  const canClose = phase === "success" || phase === "error";
  const inProgress =
    phase === "preparing" || phase === "spinning" || phase === "stopping";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        disabled={!canClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wheel-draw-title"
        className="relative w-full max-w-md rounded-[var(--kaffle-radius-lg)] border border-border bg-surface-elevated px-5 py-6 shadow-2xl sm:max-w-lg sm:px-8 sm:py-8"
      >
        <h2
          id="wheel-draw-title"
          className="text-center text-lg font-semibold tracking-tight sm:text-xl"
        >
          {title}
        </h2>

        <div className="mt-6">
          <RaffleWheel
            peek
            phase={wheelPhase}
            slots={slots}
            targetIndex={targetIndex}
            label={inProgress ? "돌림판 추첨 중" : "래플 돌림판"}
            onStopComplete={onStopComplete}
          />
        </div>

        <p
          className={`mt-5 text-center text-sm leading-6 ${
            phase === "error" ? "text-danger" : "text-muted"
          }`}
        >
          {displayMessage}
        </p>

        {phase === "success" && txUrl ? (
          <div className="mt-3 flex justify-center">
            <Link
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              트랜잭션 확인
            </Link>
          </div>
        ) : null}

        {canClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90"
          >
            확인
          </button>
        ) : null}
      </div>
    </div>
  );
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
  const [confirmSheet, setConfirmSheet] = useState<ConfirmSheetState | null>(
    null,
  );
  const [drawModal, setDrawModal] = useState<DrawModalState | null>(null);
  const [seen, setSeen] = useState<boolean | null>(null);

  const slots = useMemo(
    () => buildTicketSlots(view?.participants ?? []),
    [view?.participants],
  );

  const wallet = view?.wallet ?? null;
  const canRequest = current.canRequestWinner;
  const hasWinner = Boolean(current.winner);
  const showPrimaryConfirm = hasWinner && seen === false;
  const showReplay = hasWinner && seen === true;

  useEffect(() => {
    setSeen(hasSeenWinnerReveal(current.address, wallet));
  }, [current.address, wallet, current.winner]);

  const txUrl =
    drawModal?.txHash && explorerBaseUrl
      ? `${explorerBaseUrl}/tx/${drawModal.txHash}`
      : null;

  const handleStopComplete = useCallback(() => {
    setDrawModal((prev) => {
      if (!prev || prev.phase !== "stopping") {
        return prev;
      }
      return { ...prev, phase: "success" };
    });
  }, []);

  function closeConfirm() {
    setConfirmSheet(null);
  }

  function closeDrawModal() {
    if (
      !drawModal ||
      (drawModal.phase !== "success" && drawModal.phase !== "error")
    ) {
      return;
    }
    const shouldRefresh = drawModal.phase === "success";
    if (drawModal.phase === "success" && drawModal.markSeenOnClose) {
      markWinnerRevealSeen(current.address, wallet);
      setSeen(true);
    }
    setDrawModal(null);
    onBusyChange(false);
    if (shouldRefresh) {
      router.refresh();
    }
  }

  function openRequestConfirm() {
    setConfirmSheet({
      step: "confirm",
      errorMessage: null,
    });
  }

  async function runRevealAnimation(input: {
    winner: string | null;
    winnerNickname?: string | null;
    txHash: string | null;
    spinMs: number;
    markSeenOnClose: boolean;
  }) {
    setDrawModal({
      phase: "preparing",
      message: MSG_PREPARING,
      txHash: null,
      targetIndex: null,
      markSeenOnClose: input.markSeenOnClose,
    });
    await sleep(PREPARE_MS);

    const spinStartedAt = Date.now();
    setDrawModal((prev) =>
      prev
        ? {
            ...prev,
            phase: "spinning",
            message: MSG_CHECKING,
          }
        : prev,
    );

    const elapsed = Date.now() - spinStartedAt;
    if (elapsed < input.spinMs) {
      await sleep(input.spinMs - elapsed);
    }

    const targetIndex = findWinnerSlotIndex(
      slots,
      input.winner,
      input.winnerNickname,
    );

    setDrawModal({
      phase: "stopping",
      message: congratulateWinner(input.winner, input.winnerNickname),
      txHash: input.txHash,
      targetIndex,
      markSeenOnClose: input.markSeenOnClose,
    });
  }

  async function executeReplay() {
    onBusyChange(true);
    try {
      await wheelSound.unlock();
      await runRevealAnimation({
        winner: current.winner,
        winnerNickname: current.winnerNickname,
        txHash: null,
        spinMs: REPLAY_SPIN_MS,
        markSeenOnClose: true,
      });
    } catch {
      setDrawModal({
        phase: "error",
        message: "추첨 연출을 재생하지 못했습니다.",
        txHash: null,
        targetIndex: null,
        markSeenOnClose: false,
      });
      onBusyChange(false);
    }
  }

  async function executeSettleWinner() {
    setConfirmSheet(null);
    onBusyChange(true);
    await wheelSound.unlock();
    setDrawModal({
      phase: "preparing",
      message: MSG_PREPARING,
      txHash: null,
      targetIndex: null,
      markSeenOnClose: true,
    });

    try {
      const res = await fetch("/api/raffle/request-winner", { method: "POST" });
      const body = (await res.json()) as RaffleView & {
        error?: string;
        requestHash?: string;
        fulfillHash?: string;
      };

      if (!res.ok) {
        // Someone else may have already settled — continue as reveal replay.
        if (
          body.error === "AlreadySettled" ||
          body.error === "AlreadyRequested"
        ) {
          const statusRes = await fetch("/api/raffle");
          if (statusRes.ok) {
            const statusBody = (await statusRes.json()) as RaffleView;
            const settledView = toView(statusBody, view);
            onViewUpdate(settledView);
            if (settledView.current?.winner) {
              const spinStartedAt = Date.now();
              setDrawModal((prev) =>
                prev
                  ? {
                      ...prev,
                      phase: "spinning",
                      message: MSG_CHECKING,
                    }
                  : prev,
              );
              const elapsed = Date.now() - spinStartedAt;
              if (elapsed < MIN_SPIN_MS) {
                await sleep(MIN_SPIN_MS - elapsed);
              }
              const winner = settledView.current.winner;
              const winnerNickname = settledView.current.winnerNickname;
              setDrawModal({
                phase: "stopping",
                message: congratulateWinner(winner, winnerNickname),
                txHash: null,
                targetIndex: findWinnerSlotIndex(
                  slots,
                  winner,
                  winnerNickname,
                ),
                markSeenOnClose: true,
              });
              return;
            }
          }
        }

        setDrawModal({
          phase: "error",
          message: settleErrorMessage(body.error),
          txHash: null,
          targetIndex: null,
          markSeenOnClose: false,
        });
        onBusyChange(false);
        return;
      }

      let nextView = toView(body, view);
      onViewUpdate(nextView);

      const spinStartedAt = Date.now();
      setDrawModal((prev) =>
        prev
          ? {
              ...prev,
              phase: "spinning",
              message: MSG_CHECKING,
            }
          : prev,
      );

      if (!nextView.current?.winner) {
        nextView = await waitForWinner(nextView, VRF_WAIT_MS);
        onViewUpdate(nextView);
      }

      const elapsed = Date.now() - spinStartedAt;
      if (elapsed < MIN_SPIN_MS) {
        await sleep(MIN_SPIN_MS - elapsed);
      }

      const winner = nextView.current?.winner ?? null;
      const winnerNickname = nextView.current?.winnerNickname ?? null;
      const targetIndex = findWinnerSlotIndex(slots, winner, winnerNickname);

      setDrawModal({
        phase: "stopping",
        message: congratulateWinner(winner, winnerNickname),
        txHash: body.fulfillHash ?? body.requestHash ?? null,
        targetIndex,
        markSeenOnClose: true,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "VRFTimeout"
          ? "추첨 요청은 전송됐지만 결과 확인이 지연되고 있습니다. 잠시 후 새로고침 해주세요."
          : settleErrorMessage(
              error instanceof Error ? error.message : undefined,
            );
      setDrawModal({
        phase: "error",
        message,
        txHash: null,
        targetIndex: null,
        markSeenOnClose: false,
      });
      onBusyChange(false);
    }
  }

  return (
    <>
      {canRequest ? (
        <button
          type="button"
          onClick={openRequestConfirm}
          disabled={disabled}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
        >
          당첨자 요청
        </button>
      ) : null}

      {showPrimaryConfirm ? (
        <button
          type="button"
          onClick={() => void executeReplay()}
          disabled={disabled}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
        >
          당첨자 확인
        </button>
      ) : null}

      {showReplay ? (
        <button
          type="button"
          onClick={() => void executeReplay()}
          disabled={disabled}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] border border-border text-sm font-medium transition hover:bg-surface disabled:opacity-60"
        >
          추첨 다시보기
        </button>
      ) : null}

      <ActionSheet
        open={confirmSheet !== null}
        step={confirmSheet?.step ?? "confirm"}
        title={
          confirmSheet?.step === "error" ? "추첨 실패" : "당첨자 추첨 확인"
        }
        onClose={closeConfirm}
        onConfirm={() => void executeSettleWinner()}
        onRetry={() =>
          setConfirmSheet({
            step: "confirm",
            errorMessage: null,
          })
        }
        dismissible
        errorMessage={confirmSheet?.errorMessage ?? undefined}
        confirmLabel="추첨하기"
        cancelLabel="취소"
        closeLabel="확인"
      >
        <div className="rounded-[var(--kaffle-radius-md)] bg-surface px-4 py-5 text-center">
          <p className="text-xs text-muted">회차</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {current.roundNumber ?? "—"}회차
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">상금</dt>
            <dd className="mt-1 font-medium">
              {current.prizeAmount} {view?.symbol}
            </dd>
          </div>
          <div>
            <dt className="text-muted">전체 티켓</dt>
            <dd className="mt-1 font-medium">{current.totalTickets}장</dd>
          </div>
          <div>
            <dt className="text-muted">참여자</dt>
            <dd className="mt-1 font-medium">
              {view?.participants.length ?? 0}명
            </dd>
          </div>
        </dl>
        <p className="text-xs leading-5 text-muted">
          확인 후 가운데 돌림판에서 추첨이 진행됩니다. 추첨 결과는 온체인
          확정 후 돌림판이 멈춥니다.
        </p>
      </ActionSheet>

      <WheelDrawModal
        open={drawModal !== null}
        phase={drawModal?.phase ?? "spinning"}
        message={drawModal?.message ?? ""}
        txUrl={txUrl}
        slots={slots}
        targetIndex={drawModal?.targetIndex ?? null}
        onStopComplete={handleStopComplete}
        onClose={closeDrawModal}
      />
    </>
  );
}
