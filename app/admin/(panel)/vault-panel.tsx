"use client";

import { useCallback, useEffect, useState } from "react";

type VaultStatus = {
  vault: string;
  token: string;
  symbol: string;
  decimals: number;
  balance: string;
  reserved: string;
  unallocated: string;
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function VaultPanel() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/vault");
    const body = (await res.json()) as VaultStatus & { error?: string };
    if (!res.ok) {
      setStatus(null);
      setError(
        body.error?.includes("is not set")
          ? "체인 컨트랙트 주소가 .env에 없습니다. CHAIN에 맞는 VAULT / PRIZE_TOKEN을 설정하세요."
          : (body.error ??
              "Vault 상태를 읽지 못했습니다. RPC와 배포 주소를 확인하세요."),
      );
      setLoading(false);
      return;
    }
    setStatus(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function fund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setTxHash(null);

    const res = await fetch("/api/admin/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const body = (await res.json()) as VaultStatus & {
      error?: string;
      hash?: string;
    };

    if (!res.ok) {
      setError(
        body.error === "insufficient owner token balance"
          ? "owner 지갑의 토큰 잔액이 부족합니다. USDC를 owner에 먼저 넣어 주세요."
          : (body.error ?? "입금에 실패했습니다."),
      );
      setPending(false);
      return;
    }

    setStatus(body);
    setTxHash(body.hash ?? null);
    setPending(false);
  }

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Vault</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          상금 토큰을 vault에 넣습니다. Anvil은 mint, 테스트넷은 owner 지갑에서
          transfer합니다.
        </p>
      </div>

      {error ? (
        <p className="rounded-[var(--kaffle-radius-md)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {txHash ? (
        <p className="rounded-[var(--kaffle-radius-md)] bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          입금 완료 · {shortAddress(txHash)}
        </p>
      ) : null}

      {loading && !status ? (
        <p className="text-sm text-muted">Vault 읽는 중…</p>
      ) : status ? (
        <div className="rounded-[var(--kaffle-radius-md)] border border-border p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">잔액</dt>
              <dd className="mt-1 font-medium">
                {status.balance} {status.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-muted">사용 가능</dt>
              <dd className="mt-1 font-medium">
                {status.unallocated} {status.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-muted">예약됨</dt>
              <dd className="mt-1 font-medium">
                {status.reserved} {status.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-muted">토큰</dt>
              <dd className="mt-1 font-mono text-xs">
                {shortAddress(status.token)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 font-mono text-xs text-muted">
            vault {shortAddress(status.vault)}
          </p>
        </div>
      ) : null}

      <form onSubmit={(event) => void fund(event)} className="space-y-3">
        <label className="block text-sm text-muted">
          입금 금액
          <input
            type="text"
            inputMode="decimal"
            name="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 h-12 w-full rounded-[var(--kaffle-radius-md)] border border-border bg-transparent px-4 text-sm text-foreground outline-none focus:border-border-strong"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || amount.trim().length === 0}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "입금 중…" : "Vault에 넣기"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || pending}
            className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] border border-border px-4 text-sm font-medium transition hover:bg-surface disabled:opacity-60"
          >
            새로고침
          </button>
        </div>
      </form>
    </section>
  );
}
