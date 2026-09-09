import Link from "next/link";
import { AdminLogoutButton } from "./logout-button";

export function AdminHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-4">
        <Link
          href="/admin"
          className="text-sm font-medium tracking-[0.2em] text-muted"
        >
          KAFFLE ADMIN
        </Link>
        <AdminLogoutButton />
      </div>
    </header>
  );
}
