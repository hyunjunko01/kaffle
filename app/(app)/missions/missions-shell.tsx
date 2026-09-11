import type { ReactNode } from "react";

/** Gold-rim machine shell for the missions hub. */
export function MissionsShell({
  ticketBalance,
  children,
}: {
  ticketBalance: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="미션"
      className="overflow-hidden rounded-t-[10rem] rounded-b-[var(--kaffle-radius-sm)] border-[3px] border-accent/40 bg-surface sm:rounded-t-[12rem]"
    >
      <header className="bg-surface px-6 pb-5 pt-7 text-center">
        <p className="text-xs font-medium tracking-[0.18em] text-muted">
          보유 티켓
        </p>
        <div className="mt-1 inline-flex flex-col items-stretch">
          <p className="font-prize text-6xl font-normal leading-none tracking-[0.02em] text-accent sm:text-7xl">
            {ticketBalance}
            <span className="ml-1 text-[0.45em] tracking-[0.08em]">장</span>
          </p>
          <div aria-hidden="true" className="mt-1 h-px w-full bg-border" />
        </div>
        <p className="mt-2 text-sm text-muted">
          티켓을 모아 래플에 참여하세요
        </p>
      </header>

      <div className="bg-accent/40 p-px">{children}</div>
    </section>
  );
}
