import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-surface/95">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <Link href="/admin" className="inline-flex items-center gap-2">
          <BrandMark className="text-left" />
          <span className="text-xs font-medium tracking-[0.14em] text-muted">
            ADMIN
          </span>
        </Link>
        <Link
          href="/raffle"
          className="inline-flex h-9 items-center rounded-[var(--kaffle-radius-sm)] border border-accent px-3 text-sm font-medium text-accent-ink transition hover:bg-accent-soft"
        >
          앱으로
        </Link>
      </div>
    </header>
  );
}
