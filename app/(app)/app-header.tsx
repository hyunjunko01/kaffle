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
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-2">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.2em] text-zinc-500"
          >
            KAFFLE
          </Link>
          <span className="font-mono text-xs text-zinc-400">{chainLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">{ticketBalance} 티켓</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
