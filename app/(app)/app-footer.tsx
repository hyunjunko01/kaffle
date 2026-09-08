"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { HandCoins, ListChecks, Trophy, UserRound } from "lucide-react";

const NAV_ICON_SIZE = 22;
const NAV_ICON_STROKE = 1.75;

const links: {
  href: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { href: "/raffle", label: "래플", Icon: HandCoins },
  { href: "/missions", label: "미션", Icon: ListChecks },
  { href: "/leaderboard", label: "리더보드", Icon: Trophy },
  { href: "/profile", label: "프로필", Icon: UserRound },
];

export function AppFooter() {
  const pathname = usePathname();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur">
      <nav className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1 px-6 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          const { Icon } = link;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center justify-center transition ${
                active
                  ? "text-accent"
                  : "text-muted-soft hover:text-muted"
              }`}
            >
              <Icon
                size={NAV_ICON_SIZE}
                strokeWidth={NAV_ICON_STROKE}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
