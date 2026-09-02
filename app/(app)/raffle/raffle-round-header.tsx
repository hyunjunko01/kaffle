import type { CurrentRaffle, RaffleView } from "./types";
import { formatLocal, raffleStatusLabel, shortAddress } from "./utils";

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
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {current.roundNumber ?? "—"}회차 Kaffle
        </h2>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-900">
          {raffleStatusLabel(current)}
        </span>
      </div>
      <p className="mt-2 font-mono text-xs text-zinc-500">
        {formatLocal(current.startTime)}{" "}
        <span aria-hidden="true">—</span>{" "}
        {formatLocal(current.endTime)}
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        상금{" "}
        <span className="font-semibold text-zinc-950 dark:text-zinc-50">
          {current.prizeAmount} {view.symbol}
        </span>
      </p>
      {current.winner ? (
        <p className="mt-2 text-sm text-zinc-500">
          당첨자{" "}
          <span className="font-mono font-medium text-zinc-950 dark:text-zinc-50">
            {shortAddress(current.winner)}
            {isWinner ? " · 나" : null}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function RaffleRoundStats({ current }: { current: CurrentRaffle }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">이번 회차 참여 티켓</dt>
          <dd className="mt-1 font-medium">{current.userTickets}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">전체 티켓</dt>
          <dd className="mt-1 font-medium">{current.totalTickets}</dd>
        </div>
      </dl>
    </div>
  );
}
