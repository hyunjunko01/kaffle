"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionSheet,
  type ActionSheetStep,
} from "@/components/ui/action-sheet";
import type { UnclaimedPrize } from "@/lib/raffle/unclaimed";

type UnclaimedView = {
  items: UnclaimedPrize[];
  wallet: string;
  explorerBaseUrl: string;
};

type SheetState = {
  step: ActionSheetStep;
  item: UnclaimedPrize;
  loadingMessage: string;
  errorMessage: string | null;
  txHash: string | null;
  successMessage: string;
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
  if (bodyError === "NotWinner") {
    return "이 상금의 당첨자가 아닙니다.";
  }
  if (bodyError === "invalid raffle") {
    return "라운드 정보가 올바르지 않습니다.";
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

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function UnclaimedPanel() {
  const router = useRouter();
  const [view, setView] = useState<UnclaimedView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [busyAddress, setBusyAddress] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch("/api/raffle/unclaimed");
      const body = (await res.json()) as UnclaimedView & { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "미수령 상금을 불러오지 못했습니다.");
      }
      setView({
        items: body.items,
        wallet: body.wallet,
        explorerBaseUrl: body.explorerBaseUrl,
      });
    } catch (error) {
      setView(null);
      setPageError(
        error instanceof Error
          ? error.message
          : "미수령 상금을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const sheetOpen = sheet !== null;
  const sheetStep = sheet?.step ?? "confirm";
  const txUrl =
    sheet?.txHash && view?.explorerBaseUrl
      ? `${view.explorerBaseUrl}/tx/${sheet.txHash}`
      : null;

  function closeSheet() {
    if (sheet?.step === "loading") {
      return;
    }
    const claimedAddress =
      sheet?.step === "success" ? sheet.item.raffleAddress : null;
    setSheet(null);
    setBusyAddress(null);
    if (claimedAddress) {
      setView((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter(
                (item) => item.raffleAddress !== claimedAddress,
              ),
            }
          : prev,
      );
      router.refresh();
    }
  }

  function openClaim(item: UnclaimedPrize) {
    setSheet({
      step: "confirm",
      item,
      loadingMessage: "",
      errorMessage: null,
      txHash: null,
      successMessage: "",
    });
  }

  async function executeClaim() {
    if (!sheet) {
      return;
    }
    const item = sheet.item;
    setBusyAddress(item.raffleAddress);
    setSheet({
      step: "loading",
      item,
      loadingMessage: "상금 수령 처리 중…",
      errorMessage: null,
      txHash: null,
      successMessage: "",
    });

    const res = await fetch("/api/raffle/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raffleAddress: item.raffleAddress }),
    });
    const body = (await res.json()) as {
      error?: string;
      hash?: string;
      winner?: string;
    };

    if (!res.ok) {
      setBusyAddress(null);
      setSheet({
        step: "error",
        item,
        loadingMessage: "",
        errorMessage: claimErrorMessage(body.error),
        txHash: null,
        successMessage: "",
      });
      return;
    }

    setBusyAddress(null);
    setSheet({
      step: "success",
      item,
      loadingMessage: "",
      errorMessage: null,
      txHash: body.hash ?? null,
      successMessage: body.winner
        ? `상금이 ${shortAddress(body.winner)} 지갑으로 전송되었습니다.`
        : "상금 수령이 완료되었습니다.",
    });
  }

  if (loading && !view) {
    return (
      <div
        className="mt-10 flex flex-col items-center justify-center gap-4"
        role="status"
        aria-label="미수령 상금 확인 중"
      >
        <div
          aria-hidden="true"
          className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground"
        />
        <p className="text-sm text-muted">미수령 상금 확인 중…</p>
      </div>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      {pageError ? (
        <p className="rounded-[var(--kaffle-radius-sm)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {pageError}
        </p>
      ) : null}

      {view && view.items.length === 0 ? (
        <p className="rounded-[var(--kaffle-radius-sm)] border border-border px-4 py-8 text-center text-sm text-muted">
          받을 상금이 없습니다.
        </p>
      ) : null}

      {view && view.items.length > 0 ? (
        <ul className="overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-border bg-surface">
          {view.items.map((item) => (
            <li
              key={item.raffleAddress}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {item.roundNumber}회차
                </p>
                <p className="mt-1 inline-flex items-baseline gap-1.5 text-accent">
                  <span className="font-prize text-2xl font-normal leading-none tracking-[0.02em]">
                    {item.prizeAmount}
                  </span>
                  <span className="font-mono text-xs tracking-[0.08em]">
                    {item.symbol}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => openClaim(item)}
                disabled={busyAddress !== null}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-4 text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
              >
                상금 받기
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <ActionSheet
        open={sheetOpen}
        step={sheetStep}
        title={claimSheetTitle(sheetStep)}
        onClose={closeSheet}
        onConfirm={() => void executeClaim()}
        onRetry={() =>
          sheet
            ? setSheet({
                step: "confirm",
                item: sheet.item,
                loadingMessage: "",
                errorMessage: null,
                txHash: null,
                successMessage: "",
              })
            : undefined
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
        {sheet ? (
          <>
            <div className="rounded-[var(--kaffle-radius-sm)] bg-surface px-4 py-5 text-center">
              <p className="text-xs text-muted">수령 상금</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {sheet.item.prizeAmount} {sheet.item.symbol}
              </p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-muted">회차</dt>
                <dd className="text-right font-medium">
                  {sheet.item.roundNumber}회차
                </dd>
              </div>
              {view?.wallet ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted">받는 지갑</dt>
                  <dd className="max-w-[65%] break-all text-right font-mono text-xs">
                    {view.wallet}
                  </dd>
                </div>
              ) : null}
            </dl>
          </>
        ) : null}
      </ActionSheet>
    </section>
  );
}
