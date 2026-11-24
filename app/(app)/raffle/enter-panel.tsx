"use client";

import { useCallback, useState } from "react";
import { getPublicChainConfig, NETWORKS } from "@/lib/chain/config";
import { EntryRecoveryPanel } from "@/components/entry-recovery-panel";
import { EnterRaffleFlow } from "./enter-raffle-flow";
import { RaffleRoundBoard, RaffleRoundHeader } from "./raffle-round-header";
import { SettleWinnerFlow } from "./settle-winner-flow";
import { useRaffleView } from "./use-raffle-view";

function RoundStatusSpinner() {
  return (
    <div
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4"
      role="status"
      aria-label="라운드 확인 중"
    >
      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground"
      />
      <p className="text-sm text-muted">라운드 확인 중…</p>
    </div>
  );
}

export function RaffleEnterPanel() {
  const explorerBaseUrl =
    NETWORKS[getPublicChainConfig().slug].blockExplorerUrl;
  const { view, setView, loading, pageError, setPageError, reload } =
    useRaffleView();
  const [enterBusy, setEnterBusy] = useState(false);
  const [settleBusy, setSettleBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [revealState, setRevealState] = useState<{ key: string; seen: boolean } | null>(null);

  const current = view?.current ?? null;
  const busy = enterBusy || settleBusy || claimBusy || recoveryBusy;
  const canRequestWinner = Boolean(current?.canRequestWinner);
  const canClaim = Boolean(current?.canClaim);
  const isWinner =
    Boolean(current?.winner) &&
    Boolean(view?.wallet) &&
    current!.winner!.toLowerCase() === view!.wallet!.toLowerCase();

  // SettleWinnerFlow already restores the saved reveal state and reports changes.
  // Scope that state to the round/wallet so a recovery refresh cannot reuse an old result.
  const revealKey = `${current?.address.toLowerCase() ?? ""}:${view?.wallet?.toLowerCase() ?? ""}`;
  const revealSeen = revealState?.key === revealKey && revealState.seen;
  const handleRevealSeenChange = useCallback((seen: boolean) => {
    setRevealState({ key: revealKey, seen });
  }, [revealKey]);

  async function refreshRound() {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && !view) {
    return <RoundStatusSpinner />;
  }

  return (
    <main>
      <section className="space-y-8">
        {current && view ? (
          <>
            <RaffleRoundHeader
              current={current}
              view={view}
              showWinner={Boolean(current.winner) && revealSeen}
            />

            {canRequestWinner ||
            settleBusy ||
            Boolean(current.winner) ? (
              <SettleWinnerFlow
                view={view}
                current={current}
                explorerBaseUrl={explorerBaseUrl}
                disabled={busy}
                onBusyChange={setSettleBusy}
                onViewUpdate={setView}
                onRevealSeenChange={handleRevealSeenChange}
                canClaim={canClaim && isWinner}
                onClaimBusyChange={setClaimBusy}
              />
            ) : (
              <EnterRaffleFlow
                view={view}
                current={current}
                explorerBaseUrl={explorerBaseUrl}
                disabled={busy}
                onBusyChange={setEnterBusy}
                onViewUpdate={setView}
                onPageError={setPageError}
              />
            )}

            {pageError ? (
              <p className="rounded-[var(--kaffle-radius-sm)] bg-danger-soft px-4 py-3 text-sm text-danger">
                {pageError}
              </p>
            ) : null}

            <RaffleRoundBoard
              current={current}
              participants={view.participants}
              refreshing={refreshing}
              onRefresh={() => void refreshRound()}
            />
          </>
        ) : (
          <>
            {pageError ? (
              <p className="rounded-[var(--kaffle-radius-sm)] bg-danger-soft px-4 py-3 text-sm text-danger">
                {pageError}
              </p>
            ) : null}
            {view && !current ? (
              <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5 text-center">
                <p className="text-sm text-muted">열린 라운드가 없습니다.</p>
              </div>
            ) : null}
          </>
        )}
        <EntryRecoveryPanel
          collapsible
          refreshKey={`${enterBusy}:${view?.ticketBalance}:${current?.userTickets}`}
          disabled={enterBusy || settleBusy || claimBusy}
          onBusyChange={setRecoveryBusy}
          onComplete={reload}
        />
      </section>
    </main>
  );
}
