import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AdminLogoutButton } from "./logout-button";

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
        <AdminLogoutButton />
      </div>
    </header>
  );
}
