"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_CLASS =
  "h-9 rounded-[var(--kaffle-radius-lg)] border border-border px-3 text-sm font-medium text-muted transition hover:border-border-strong hover:bg-surface hover:text-foreground disabled:opacity-60";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className={className ?? DEFAULT_CLASS}
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
