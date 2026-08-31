"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "홈" },
  { href: "/raffle", label: "래플" },
  { href: "/missions", label: "미션" },
  { href: "/profile", label: "프로필" },
];

export function AppFooter() {
  const pathname = usePathname();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex w-full max-w-lg gap-1 px-6 py-3">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/" && pathname.startsWith(`${link.href}/`));
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
    </footer>
  );
}
