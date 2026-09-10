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
        <p className="text-sm font-medium tracking-[0.2em] text-muted">
          KAFFLE
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">관리자</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          라운드를 여는 관리자만 들어올 수 있습니다.
        </p>

        {error ? (
          <p className="mt-6 rounded-[var(--kaffle-radius-lg)] bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form
          onSubmit={(event) => void login(event)}
          className="mt-8 space-y-3 text-left"
        >
          <label className="block text-sm text-muted">
            비밀번호
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-12 w-full rounded-[var(--kaffle-radius-lg)] border border-border bg-transparent px-4 text-sm text-foreground outline-none focus:border-border-strong"
            />
          </label>
          <button
            type="submit"
            disabled={pending || password.length === 0}
            className="inline-flex h-12 w-full items-center justify-center rounded-[var(--kaffle-radius-lg)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "확인 중…" : "관리자 로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
