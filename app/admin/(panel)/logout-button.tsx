"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={pending}
      className="h-9 rounded-[var(--kaffle-radius-md)] border border-zinc-200 px-3 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
