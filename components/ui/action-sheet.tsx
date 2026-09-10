"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type ActionSheetStep = "confirm" | "loading" | "success" | "error";

type ActionSheetProps = {
  open: boolean;
  step: ActionSheetStep;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  /** Shown during loading and success so media (e.g. a wheel) can keep mounting. */
  media?: ReactNode;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  closeLabel?: string;
  retryLabel?: string;
  actionHref?: string | null;
  actionLabel?: string;
  onConfirm?: () => void;
  onRetry?: () => void;
  dismissible?: boolean;
  /** When false, success close actions stay disabled (e.g. while an outro plays). */
  actionsReady?: boolean;
};

function Spinner() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground"
    />
  );
}

export function ActionSheet({
  open,
  step,
  title,
  onClose,
  children,
  media,
  loadingMessage = "처리 중…",
  successMessage,
  errorMessage,
  confirmLabel = "확인",
  cancelLabel = "취소",
  closeLabel = "닫기",
  retryLabel = "다시 시도",
  actionHref,
  actionLabel = "자세히 보기",
  onConfirm,
  onRetry,
  dismissible = step !== "loading",
  actionsReady = true,
}: ActionSheetProps) {
  if (!open) {
    return null;
  }

  function handleBackdropClick() {
    if (dismissible && actionsReady) {
      onClose();
    }
  }

  const showMedia = step === "loading" || step === "success";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
        disabled={!dismissible || !actionsReady}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-title"
        className="relative w-full max-w-lg rounded-t-[var(--kaffle-radius-md)] border border-border bg-surface-elevated px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        <h2
          id="action-sheet-title"
          className="text-lg font-semibold tracking-tight"
        >
          {title}
        </h2>

        {step === "confirm" ? (
          <>
            <div className="mt-4 space-y-4">{children}</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] border border-border text-sm font-medium transition hover:bg-surface"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90"
              >
                {confirmLabel}
              </button>
            </div>
          </>
        ) : null}

        {showMedia && media ? (
          <div className="mt-6 flex flex-col items-center">{media}</div>
        ) : null}

        {step === "loading" ? (
          <div
            className={`flex flex-col items-center gap-4 pb-4 text-center ${media ? "mt-4" : "mt-8"}`}
          >
            {media ? null : <Spinner />}
            <p className="text-sm text-muted">{loadingMessage}</p>
          </div>
        ) : null}

        {step === "success" ? (
          <>
            <p className="mt-4 text-sm leading-6 text-accent-ink">
              {successMessage}
            </p>
            {actionHref ? (
              <Link
                href={actionHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-foreground underline underline-offset-4"
              >
                {actionLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={!actionsReady}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
            >
              {actionsReady ? closeLabel : "결과 확인 중…"}
            </button>
          </>
        ) : null}

        {step === "error" ? (
          <>
            <p className="mt-4 text-sm leading-6 text-danger">{errorMessage}</p>
            <div
              className={`mt-6 grid gap-3 ${onRetry ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] border border-border text-sm font-medium transition hover:bg-surface"
              >
                {closeLabel}
              </button>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90"
                >
                  {retryLabel}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
