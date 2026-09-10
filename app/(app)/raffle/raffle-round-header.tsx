import { RefreshCw } from "lucide-react";
import type { CurrentRaffle, RaffleView, RoundParticipant } from "./types";
import { RaffleWheel } from "./raffle-wheel";
import {
  formatLocal,
  formatWinnerLabel,
  raffleStatusLabel,
  raffleStatusTone,
} from "./utils";

const statusToneClass = {
  open: "bg-accent-soft text-accent-ink",
  closed: "bg-danger-soft text-danger",
  other: "bg-accent-soft text-accent-ink",
} as const;

type RaffleRoundHeaderProps = {
  current: CurrentRaffle;
  view: RaffleView;
};

export function RaffleRoundHeader({
  current,
  view,
}: RaffleRoundHeaderProps) {
  const tone = raffleStatusTone(current);

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {current.roundNumber ?? "—"}회차
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusToneClass[tone]}`}
        >
          {raffleStatusLabel(current)}
        </span>
      </div>

      <p className="mt-4 text-sm text-muted">상금</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {current.prizeAmount}{" "}
        <span className="text-xl font-semibold sm:text-2xl">{view.symbol}</span>
      </p>

      <p className="mt-3 text-sm text-muted">
        마감 {formatLocal(current.endTime)}
      </p>

      {current.winner ? (
        <p className="mt-3 text-sm text-muted">
          당첨자{" "}
          <span className="font-medium text-foreground">
            {formatWinnerLabel(current.winner, current.winnerNickname)}
          </span>
        </p>
      ) : null}

      <div className="mx-auto mt-6 w-40 opacity-80">
        <RaffleWheel />
      </div>
    </div>
  );
}

export function RaffleRoundBoard({
  current,
  participants,
  refreshing = false,
  onRefresh,
}: {
  current: CurrentRaffle;
  participants: RoundParticipant[];
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-[var(--kaffle-radius-md)] border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            이번 회차 참여자
          </h3>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="참여자 목록 새로고침"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--kaffle-radius-md)] text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          ) : null}
        </div>
        <p className="shrink-0 font-mono text-xs text-muted">
          전체 {current.totalTickets}장 · {participants.length}명
        </p>
      </div>
      {participants.length > 0 ? (
        <ol className="divide-y divide-border text-sm">
          {participants.slice(0, 20).map((entry, index) => (
            <li
              key={entry.userId}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-3"
            >
              <span className="font-mono text-muted">{index + 1}</span>
              <span className="truncate font-medium">{entry.nickname}</span>
              <span className="font-mono tabular-nums text-muted">
                {entry.ticketCount}장
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-muted">
          아직 참여자가 없습니다.
        </p>
      )}
      {participants.length > 20 ? (
        <p className="border-t border-border px-4 py-3 text-center text-xs text-muted">
          외 {participants.length - 20}명
        </p>
      ) : null}
    </div>
  );
}
