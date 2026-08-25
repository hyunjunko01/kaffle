"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AttendanceButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/missions/attendance", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 409
          ? "오늘은 이미 출석했습니다."
          : "출석에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void checkIn()}
        disabled={disabled || pending}
        className="h-11 w-full rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {disabled ? "오늘 출석 완료" : pending ? "출석 중…" : "출석하고 티켓 받기"}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
