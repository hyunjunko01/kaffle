"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AttendanceStampCard({
  stamped,
  dateLabel,
}: {
  stamped: boolean;
  dateLabel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    if (stamped || pending) return;
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
    <section className="mt-8 flex flex-col items-center">
      <p className="font-mono text-base font-medium tabular-nums text-foreground">
        {dateLabel}
      </p>
      <button
        type="button"
        onClick={() => void checkIn()}
        disabled={stamped || pending}
        aria-label={
          stamped
            ? "오늘 출석 완료"
            : pending
              ? "출석 처리 중"
              : "출석하고 티켓 받기"
        }
        className={`mt-4 flex aspect-square w-40 items-center justify-center rounded-[var(--kaffle-radius-lg)] border-2 border-dashed transition disabled:cursor-default ${
          stamped
            ? "border-accent/50 bg-accent-soft"
            : "border-border bg-surface hover:border-border-strong"
        } ${pending ? "opacity-60" : ""}`}
      >
        {stamped ? (
          <span
            className="rotate-[-12deg] rounded-[var(--kaffle-radius-lg)] border-2 border-accent px-3 py-2 font-display text-lg font-bold tracking-wide text-accent-ink"
            aria-hidden="true"
          >
            출석 완료
          </span>
        ) : pending ? (
          <span className="text-sm text-muted">출석 중…</span>
        ) : null}
      </button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
