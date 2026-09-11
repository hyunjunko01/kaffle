"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GuideClaimButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/missions/guide", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 409
          ? "이미 티켓을 받았습니다."
          : "티켓 받기에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={disabled || pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
      >
        {disabled ? "티켓 받기 완료" : pending ? "받는 중…" : "티켓 받기"}
      </button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
