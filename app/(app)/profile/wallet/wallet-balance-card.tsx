import type { WalletView } from "./types";

type WalletBalanceCardProps = {
  view: WalletView;
};

export function WalletBalanceCard({ view }: WalletBalanceCardProps) {
  return (
    <div className="rounded-[var(--kaffle-radius-md)] border border-border p-5">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">네트워크</dt>
          <dd className="mt-1 font-medium">{view.network}</dd>
        </div>
        <div>
          <dt className="text-muted">잔액</dt>
          <dd className="mt-1 font-medium">
            {view.balance} {view.symbol}
          </dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-muted">내 지갑</p>
        <p className="mt-1 break-all font-mono text-xs">{view.wallet}</p>
      </div>
    </div>
  );
}
