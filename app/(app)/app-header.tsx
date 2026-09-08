"use client";

import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

export function AppHeader({
  ticketBalance,
  chainLabel,
  nickname,
}: {
  ticketBalance: number;
  chainLabel: string;
  nickname: string;
}) {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Link
            href="/raffle"
            className="font-display text-sm font-bold tracking-[0.22em] text-foreground"
          >
            KAFFLE
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="truncate max-w-[5rem] text-sm font-medium text-foreground hover:text-accent-ink transition"
          >
            {nickname}
          </Link>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-xs font-medium text-accent-ink">
            보유 티켓 {ticketBalance}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
