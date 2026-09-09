"use client";

import { TransferFlow } from "./transfer-flow";
import { useWalletView } from "./use-wallet-view";
import { WalletBalanceCard } from "./wallet-balance-card";

export function WalletPanel() {
  const { view, setView, loading, pageError, setPageError } = useWalletView();

  return (
    <section className="mt-8 space-y-4">
      {pageError ? (
        <p className="rounded-[var(--kaffle-radius-md)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {pageError}
        </p>
      ) : null}

      {loading && !view ? (
        <p className="text-center text-sm text-muted">
          지갑 정보를 불러오는 중…
        </p>
      ) : view ? (
        <>
          <WalletBalanceCard view={view} />
          <TransferFlow
            view={view}
            disabled={loading}
            onBusyChange={() => {}}
            onViewUpdate={setView}
            onPageError={setPageError}
          />
        </>
      ) : null}
    </section>
  );
}
