"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/raffle", label: "래플" },
  { href: "/missions", label: "미션" },
  { href: "/leaderboard", label: "리더보드" },
  { href: "/profile", label: "프로필" },
];

export function AppFooter() {
  const pathname = usePathname();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur">
      <nav className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-[var(--kaffle-radius-sm)] px-3 py-1.5 text-center text-sm font-medium transition ${
                active
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:bg-accent-soft/60 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
