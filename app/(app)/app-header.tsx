"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";

const links = [
  { href: "/", label: "홈" },
  { href: "/raffle", label: "래플" },
  { href: "/missions", label: "미션" },
];

export function AppHeader({
  ticketBalance,
  chainLabel,
}: {
  ticketBalance: number;
  chainLabel: string;
}) {
  const pathname = usePathname();

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
      <nav className="mx-auto flex w-full max-w-lg gap-1 px-6 pb-3">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
