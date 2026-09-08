import type { CurrentRaffle, RaffleView, RoundParticipant } from "./types";
import { RaffleWheel } from "./raffle-wheel";
import {
  formatLocal,
  raffleStatusLabel,
  raffleStatusTone,
  shortAddress,
} from "./utils";

const statusToneClass = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  closed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  other: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
} as const;

type RaffleRoundHeaderProps = {
  current: CurrentRaffle;
  view: RaffleView;
  isWinner: boolean;
};

export function RaffleRoundHeader({
  current,
  view,
  isWinner,
}: RaffleRoundHeaderProps) {
  const tone = raffleStatusTone(current);

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {current.roundNumber ?? "—"}회차
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusToneClass[tone]}`}
        >
          {raffleStatusLabel(current)}
        </span>
      </div>

      <p className="mt-4 text-sm text-zinc-500">상금</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
        {current.prizeAmount}{" "}
        <span className="text-xl font-semibold sm:text-2xl">{view.symbol}</span>
      </p>

      <p className="mt-3 text-sm text-zinc-500">
        마감 {formatLocal(current.endTime)}
      </p>

      {current.winner ? (
        <p className="mt-3 text-sm text-zinc-500">
          당첨자{" "}
          <span className="font-mono font-medium text-zinc-950 dark:text-zinc-50">
            {shortAddress(current.winner)}
            {isWinner ? " · 나" : null}
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
}: {
  current: CurrentRaffle;
  participants: RoundParticipant[];
}) {
  return (
    <div className="rounded-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          이번 회차 참여자
        </h3>
        <p className="font-mono text-xs text-zinc-500">
          전체 {current.totalTickets}장 · {participants.length}명
        </p>
      </div>
      {participants.length > 0 ? (
        <ol className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {participants.map((entry, index) => (
            <li
              key={entry.userId}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-3"
            >
              <span className="font-mono text-zinc-500">{index + 1}</span>
              <span className="truncate font-medium">{entry.nickname}</span>
              <span className="font-mono tabular-nums text-zinc-500">
                {entry.ticketCount}장
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-zinc-500">
          아직 참여자가 없습니다.
        </p>
      )}
    </div>
  );
}
