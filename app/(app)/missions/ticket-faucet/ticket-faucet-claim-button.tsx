"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TicketFaucetClaimButton({ tickets }: { tickets: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/missions/ticket-faucet", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 403
          ? "Base Sepolia에서만 사용할 수 있습니다."
          : "티켓 받기에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={pending}
        className="h-11 w-full rounded-[var(--kaffle-radius-md)] bg-foreground px-4 text-sm font-medium text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "받는 중…" : `티켓 ${tickets}장 받기`}
      </button>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
