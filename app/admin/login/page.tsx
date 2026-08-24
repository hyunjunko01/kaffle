"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 500
          ? "관리자 비밀번호가 설정되지 않았습니다."
          : "비밀번호가 올바르지 않습니다.",
      );
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-zinc-500">KAFFLE</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">관리자</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          라운드를 여는 관리자만 들어올 수 있습니다.
        </p>

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <form onSubmit={(event) => void login(event)} className="mt-8 space-y-3 text-left">
          <label className="block text-sm text-zinc-500">
            비밀번호
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-12 w-full rounded-xl border border-zinc-200 bg-transparent px-4 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            disabled={pending || password.length === 0}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {pending ? "확인 중…" : "관리자 로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
