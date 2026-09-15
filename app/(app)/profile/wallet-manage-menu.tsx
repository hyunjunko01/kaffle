"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

export function WalletManageMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-full items-center justify-between rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90"
      >
        <span>지갑 관리</span>
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-manage-sheet-title"
            className="relative w-full max-w-lg rounded-t-[var(--kaffle-radius-xl)] border border-border bg-surface-elevated px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
            <h2
              id="wallet-manage-sheet-title"
              className="text-lg font-semibold tracking-tight"
            >
              지갑 관리
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              출금용 개인지갑을 등록하거나 USDC를 전송합니다.
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/profile/wallet/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 w-full items-center justify-between rounded-[var(--kaffle-radius-sm)] border border-accent px-4 text-base font-semibold text-accent-ink transition hover:bg-accent-soft"
              >
                <span>개인 지갑 주소 등록</span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/profile/wallet"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 w-full items-center justify-between rounded-[var(--kaffle-radius-sm)] bg-accent px-4 text-base font-semibold text-ink-inverse transition hover:opacity-90"
              >
                <span>USDC 출금</span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] text-base font-medium text-muted transition hover:bg-surface hover:text-foreground"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
