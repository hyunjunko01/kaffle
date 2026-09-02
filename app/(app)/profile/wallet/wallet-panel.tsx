"use client";

import { useState } from "react";
import { TransferFlow } from "./transfer-flow";
import { useWalletView } from "./use-wallet-view";
import { WalletBalanceCard } from "./wallet-balance-card";

export function WalletPanel() {
  const { view, setView, loading, pageError, setPageError, reload } =
    useWalletView();
  const [transferBusy, setTransferBusy] = useState(false);

  return (
    <section className="mt-8 space-y-4">
      {pageError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {pageError}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-sm text-zinc-500">지갑 정보를 불러오는 중…</p>
      ) : view ? (
        <>
          <WalletBalanceCard view={view} />
          <TransferFlow
            view={view}
            disabled={loading}
            onBusyChange={setTransferBusy}
            onViewUpdate={setView}
            onPageError={setPageError}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={() => void reload()}
        disabled={loading || transferBusy}
        className="h-12 w-full rounded-xl border border-zinc-200 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        새로고침
      </button>
    </section>
  );
}
