import type { WalletView } from "./types";

type WalletBalanceCardProps = {
  view: WalletView;
};

export function WalletBalanceCard({ view }: WalletBalanceCardProps) {
  return (
    <div className="rounded-[var(--kaffle-radius-md)] border border-zinc-200 p-5 dark:border-zinc-800">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">네트워크</dt>
          <dd className="mt-1 font-medium">{view.network}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">잔액</dt>
          <dd className="mt-1 font-medium">
            {view.balance} {view.symbol}
          </dd>
        </div>
      </dl>
      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">내 지갑</p>
        <p className="mt-1 break-all font-mono text-xs">{view.wallet}</p>
      </div>
    </div>
  );
}
