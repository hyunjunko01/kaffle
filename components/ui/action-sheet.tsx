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
};

function Spinner() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-950 dark:border-zinc-700 dark:border-t-zinc-50"
    />
  );
}

export function ActionSheet({
  open,
  step,
  title,
  onClose,
  children,
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
}: ActionSheetProps) {
  if (!open) {
    return null;
  }

  function handleBackdropClick() {
    if (dismissible) {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
        disabled={!dismissible}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-title"
        className="relative w-full max-w-lg rounded-t-2xl border border-zinc-200 bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <h2 id="action-sheet-title" className="text-lg font-semibold tracking-tight">
          {title}
        </h2>

        {step === "confirm" ? (
          <>
            <div className="mt-4 space-y-4">{children}</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {confirmLabel}
              </button>
            </div>
          </>
        ) : null}

        {step === "loading" ? (
          <div className="mt-8 flex flex-col items-center gap-4 pb-4 text-center">
            <Spinner />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{loadingMessage}</p>
          </div>
        ) : null}

        {step === "success" ? (
          <>
            <p className="mt-4 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
              {successMessage}
            </p>
            {actionHref ? (
              <Link
                href={actionHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
              >
                {actionLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {closeLabel}
            </button>
          </>
        ) : null}

        {step === "error" ? (
          <>
            <p className="mt-4 text-sm leading-6 text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
            <div className={`mt-6 grid gap-3 ${onRetry ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-200 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {closeLabel}
              </button>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
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
