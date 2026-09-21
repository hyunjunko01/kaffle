"use client";

import { useCallback, useEffect, useState } from "react";

type OpsWalletStatus = {
  network: string;
  symbol: string;
  owner: {
    address: string;
    eth: string;
    token: string;
  };
  relayer: {
    address: string;
    eth: string;
  };
};

export function OpsWalletsPanel() {
  const [status, setStatus] = useState<OpsWalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/ops-wallets");
    const body = (await res.json()) as OpsWalletStatus & { error?: string };
    if (!res.ok) {
      setStatus(null);
      setError(
        body.error?.includes("is not set")
          ? "owner / relayer 키가 .env에 없습니다."
          : (body.error ?? "운영 지갑 잔액을 읽지 못했습니다."),
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

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">운영 지갑</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            owner / relayer 주소는 env 개인키에서 계산합니다. owner에는 admin
            가스(ETH)와 vault 입금용 {status?.symbol ?? "토큰"}, relayer에는
            출금 대납용 ETH가 필요합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--kaffle-radius-sm)] border border-border px-3 text-sm font-medium transition hover:bg-surface disabled:opacity-60"
        >
          새로고침
        </button>
      </div>

      {error ? (
        <p className="rounded-[var(--kaffle-radius-sm)] bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {loading && !status ? (
        <p className="text-sm text-muted">잔액 읽는 중…</p>
      ) : status ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">{status.network}</p>
          <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
            <h3 className="text-sm font-semibold">Owner</h3>
            <p className="mt-1 break-all font-mono text-xs text-muted">
              {status.owner.address}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted">ETH</dt>
                <dd className="mt-1 font-medium">{status.owner.eth}</dd>
              </div>
              <div>
                <dt className="text-muted">{status.symbol}</dt>
                <dd className="mt-1 font-medium">{status.owner.token}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
            <h3 className="text-sm font-semibold">Relayer</h3>
            <p className="mt-1 break-all font-mono text-xs text-muted">
              {status.relayer.address}
            </p>
            <dl className="mt-3 text-sm">
              <div>
                <dt className="text-muted">ETH</dt>
                <dd className="mt-1 font-medium">{status.relayer.eth}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}
