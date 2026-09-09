"use client";

import { useEffect, useState } from "react";

type WinnerEntry = {
  roundNumber: number;
  winnerLabel: string;
  prizeAmount: string;
  symbol: string;
};

const INTERVAL_MS = 4000;

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
      <div className="overflow-hidden rounded-sm border border-accent/25 bg-accent-soft px-5 py-3 text-center text-sm text-accent-ink/70">
        아직 당첨자가 없습니다.
      </div>
    );
  }

  const winner = winners[index];

  return (
    <div className="relative overflow-hidden rounded-sm border border-accent/25 bg-accent-soft px-5 py-4 text-center">
      <p
        key={winner.roundNumber}
        className="animate-[fadeSlide_0.4s_ease-out] font-mono text-sm text-accent-ink"
      >
        {winner.roundNumber}회차 Kaffle{" "}
        <span className="font-semibold text-foreground">{winner.winnerLabel}</span>
        {" "}
        {winner.prizeAmount} {winner.symbol} 당첨을 축하드립니다
      </p>
    </div>
  );
}
