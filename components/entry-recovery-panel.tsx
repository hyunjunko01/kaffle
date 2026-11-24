"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { readEntryRecoveryStatus, runEntryRecovery } from "@/lib/raffle/entry-recovery-client";
import type { EntryRecoveryProgress, EntryRecoveryStatus } from "@/lib/raffle/entry-recovery-types";

type Props = {
  admin?: boolean;
  collapsible?: boolean;
  refreshKey?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onComplete?: () => Promise<void>;
};

function createdTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function EntryRecoveryPanel({ admin = false, collapsible = false, refreshKey = "", disabled = false, onBusyChange, onComplete }: Props) {
  const endpoint = admin ? "/api/admin/raffle/entries" : "/api/raffle/entries";
  const [status, setStatus] = useState<EntryRecoveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<EntryRecoveryProgress | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    const version = ++generation.current;
    void readEntryRecoveryStatus(endpoint, abort.signal).then(value => {
      if (version === generation.current && !abort.signal.aborted) {
        setStatus(value);
        setError(null);
      }
    }).catch(() => {
      if (!abort.signal.aborted && version === generation.current) setError("미확정 참여 내역을 불러오지 못했습니다.");
    }).finally(() => {
      if (!abort.signal.aborted && version === generation.current) setLoading(false);
    });
    return () => abort.abort();
  }, [endpoint, refreshKey]);

  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    const version = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const value = await readEntryRecoveryStatus(endpoint);
      if (version === generation.current) setStatus(value);
    } catch {
      if (version === generation.current) setError("내역을 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }

  async function recover() {
    if (inFlight.current) return;
    inFlight.current = true;
    generation.current++;
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setError(null);
    setProgress(null);
    onBusyChange?.(true);
    try {
      await runEntryRecovery(endpoint, value => {
        if (!abort.signal.aborted) setProgress(value);
      }, abort.signal);
      const value = await readEntryRecoveryStatus(endpoint, abort.signal);
      if (!abort.signal.aborted) setStatus(value);
      if (!abort.signal.aborted) await onComplete?.();
    } catch {
      if (!abort.signal.aborted) setError("일부 내역을 확인하지 못했습니다. 처리된 결과는 저장되었으며 다시 확인할 수 있습니다.");
    } finally {
      inFlight.current = false;
      onBusyChange?.(false);
      if (!abort.signal.aborted) {
        setRunning(false);
        setLoading(false);
      }
    }
  }

  const title = admin ? "미확정 참여 일괄 확인" : "내 참여 내역 확인";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          {!collapsible ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
          <p className="mt-1 text-sm leading-6 text-muted">
            {admin ? "현재 네트워크의 이전 회차를 포함한 미확정 참여를 확인합니다." : "이전 회차를 포함해 참여 완료 여부와 티켓 환불 상태를 확인합니다."}
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading || running || disabled}
          className="h-9 shrink-0 rounded-[var(--kaffle-radius-sm)] border border-border px-3 text-sm disabled:opacity-60">
          새로고침
        </button>
      </div>

      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <p className="text-sm text-muted">
        {status ? `미확정 참여 ${status.total}건` : loading ? "내역 확인 중…" : "내역을 새로고침해 주세요."}
      </p>
      {status?.entries.length ? (
        <ul className="space-y-2 text-sm">
          {status.entries.map(entry => (
            <li key={entry.operationId} className="rounded-[var(--kaffle-radius-sm)] bg-surface p-3">
              <p className="font-medium">
                {admin ? `${entry.nickname} · ` : ""}
                {entry.roundNumber ? `${entry.roundNumber}회차` : `래플 ${entry.raffleAddress.slice(0, 8)}…`} · {entry.ticketCount}장
              </p>
              <p className="mt-1 text-xs text-muted">{createdTime(entry.createdAt)} · {entry.state === "preparing" ? "참여 준비 중" : "참여 결과 확인 중"}</p>
              {entry.hash && status.explorerBaseUrl ? (
                <a href={`${status.explorerBaseUrl}/tx/${entry.hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs underline">
                  트랜잭션 확인
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {status && status.total > status.entries.length ? <p className="text-xs text-muted">오래된 내역 {status.entries.length}건을 표시합니다. 확인 버튼은 전체 미확정 내역을 순서대로 검사합니다.</p> : null}

      <button type="button" onClick={() => void recover()} disabled={running || loading || disabled || !status?.total}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--kaffle-radius-sm)] bg-accent px-4 font-medium text-ink-inverse disabled:opacity-60">
        {running ? "참여 내역 확인 중…" : admin ? "미확정 참여 전체 확인" : "미확정 참여 확인"}
      </button>
      {progress ? (
        <p role="status" aria-live="polite" className="text-sm leading-6 text-muted">
          {running ? "확인 중" : "확인 결과"} · {progress.checked}건 검사 · 참여 완료 {progress.confirmed}건 · 환불 완료 {progress.refunded}건 · 대기 {progress.pending}건 · 조회 실패 {progress.unavailable}건
        </p>
      ) : null}
      <p className="text-xs leading-5 text-muted">결과가 확정되지 않은 내역은 대기로 유지됩니다. 잠시 후 다시 확인할 수 있습니다.</p>
    </>
  );

  if (collapsible) {
    return (
      <details className="group rounded-[var(--kaffle-radius-sm)] border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--kaffle-radius-sm)] p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <h2 className="text-sm font-medium">{title}</h2>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
            <span>{running ? "확인 중…" : status ? `${status.total}건` : loading ? "불러오는 중…" : "확인 필요"}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="space-y-3 border-t border-border p-4">{content}</div>
      </details>
    );
  }

  return (
    <section className={admin ? "mt-10 space-y-4" : "space-y-3 rounded-[var(--kaffle-radius-sm)] border border-border p-4"}>
      {content}
    </section>
  );
}
