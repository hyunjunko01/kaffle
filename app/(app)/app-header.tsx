"use client";

import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function AppHeader({ nickname }: { nickname: string }) {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <Link
          href="/raffle"
          className="font-display text-sm font-bold tracking-[0.22em] text-foreground"
        >
          KAFFLE
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="truncate max-w-[5rem] text-sm font-medium text-foreground transition hover:text-accent-ink"
          >
            {nickname}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
