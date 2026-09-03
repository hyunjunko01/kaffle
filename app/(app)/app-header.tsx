"use client";

import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function AppHeader({
  ticketBalance,
  chainLabel,
}: {
  ticketBalance: number;
  chainLabel: string;
}) {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-2">
          <Link
            href="/"
            className="font-display text-sm font-bold tracking-[0.22em] text-foreground"
          >
            KAFFLE
          </Link>
          <span className="font-mono text-xs text-muted-soft">{chainLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-xs font-medium text-accent-ink">
            {ticketBalance} 티켓
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
