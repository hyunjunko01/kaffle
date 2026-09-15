"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FirstEnterActionButtonProps = {
  completed: boolean;
  entered: boolean;
};

export function FirstEnterActionButton({
  completed,
  entered,
}: FirstEnterActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/missions/first-enter", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 409
          ? "아직 래플에 참여하지 않았거나 이미 보상을 받았습니다."
          : "보상 받기에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    router.refresh();
  }

  if (completed) {
    return (
      <div className="mt-6">
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse opacity-60"
        >
          미션 완료
        </button>
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="mt-6">
        <Link
          href="/raffle"
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90"
        >
          래플 참여하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-5 text-base font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "받는 중…" : "참여 보상 받기"}
      </button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
