"use client";

import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

type WinnerEntry = {
  roundNumber: number;
  winnerLabel: string;
  prizeAmount: string;
  symbol: string;
};

const INTERVAL_MS = 4000;

const BANNER_CLASS =
  "relative overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-accent bg-gradient-to-r from-background via-[#1c170f] to-background px-5 py-4";

export function WinnerCarousel({ winners }: { winners: WinnerEntry[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (winners.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % winners.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [winners.length]);

  if (winners.length === 0) {
    return (
      <div className={`${BANNER_CLASS} text-center`}>
        <div className="inline-flex items-center justify-center gap-2 text-sm text-accent-ink/70">
          <Trophy
            size={16}
            strokeWidth={1.75}
            className="shrink-0 text-accent"
            aria-hidden="true"
          />
          <span>아직 당첨자가 없습니다.</span>
        </div>
      </div>
    );
  }

  const winner = winners[index];

  return (
    <div className={BANNER_CLASS}>
      <p
        key={winner.roundNumber}
        className="animate-[fadeSlide_0.4s_ease-out] inline-flex w-full items-center justify-center gap-2 text-center font-mono text-sm text-accent-ink"
      >
        <Trophy
          size={16}
          strokeWidth={1.75}
          className="shrink-0 text-accent"
          aria-hidden="true"
        />
        <span>
          {winner.roundNumber}회차 Kaffle{" "}
          <span className="font-semibold text-foreground">
            {winner.winnerLabel}
          </span>{" "}
          {winner.prizeAmount} {winner.symbol} 당첨을 축하드립니다
        </span>
      </p>
    </div>
  );
}
