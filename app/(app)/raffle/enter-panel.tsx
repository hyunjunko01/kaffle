"use client";

import { useState } from "react";
import { getPublicChainConfig, NETWORKS } from "@/lib/chain/config";
import { ClaimPrizeFlow } from "./claim-prize-flow";
import { EnterRaffleFlow } from "./enter-raffle-flow";
import { RaffleRoundStats, RaffleRoundSummary } from "./raffle-round-header";
import { RaffleWheel } from "./raffle-wheel";
import { SettleWinnerFlow } from "./settle-winner-flow";
import { useRaffleView } from "./use-raffle-view";

export function RaffleEnterPanel() {
  const explorerBaseUrl = NETWORKS[getPublicChainConfig().slug].blockExplorerUrl;
  const { view, setView, loading, pageError, setPageError, reload } =
    useRaffleView();
  const [enterBusy, setEnterBusy] = useState(false);
  const [settleBusy, setSettleBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);

  const current = view?.current ?? null;
  const busy = enterBusy || settleBusy || claimBusy;
  const canRequestWinner = Boolean(current?.canRequestWinner);
  const canClaim = Boolean(current?.canClaim);
  const isWinner =
    Boolean(current?.winner) &&
    Boolean(view?.wallet) &&
    current!.winner!.toLowerCase() === view!.wallet!.toLowerCase();

  return (
    <section className="space-y-4">
      {current && view ? (
        <div className="space-y-5">
          <RaffleRoundSummary
            current={current}
            view={view}
            isWinner={isWinner}
          />
          <RaffleWheel />
          <RaffleRoundStats current={current} />
        </div>
      ) : (
        <RaffleWheel />
      )}

      {pageError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {pageError}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-sm text-zinc-500">라운드 확인 중…</p>
      ) : view && !current ? (
        <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">열린 라운드가 없습니다.</p>
        </div>
      ) : null}

      {current && canRequestWinner ? (
        <SettleWinnerFlow
          view={view}
          current={current}
          explorerBaseUrl={explorerBaseUrl}
          disabled={busy}
          onBusyChange={setSettleBusy}
          onViewUpdate={setView}
        />
      ) : null}

      {current && view && canClaim ? (
        <ClaimPrizeFlow
          view={view}
          current={current}
          isWinner={isWinner}
          explorerBaseUrl={explorerBaseUrl}
          disabled={busy}
          onBusyChange={setClaimBusy}
          onViewUpdate={setView}
        />
      ) : null}

      {current && view ? (
        <EnterRaffleFlow
          view={view}
          current={current}
          explorerBaseUrl={explorerBaseUrl}
          disabled={busy}
          loading={loading}
          onBusyChange={setEnterBusy}
          onViewUpdate={setView}
          onPageError={setPageError}
          onReload={() => void reload()}
        />
      ) : null}
    </section>
  );
}
