import { ChessQueen } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/raffle/leaderboard";

const PODIUM_ORDER = [2, 1, 3] as const;

const TONE = {
  1: {
    card: "border-accent bg-gradient-to-b from-accent-soft to-accent-deep text-accent-ink",
    badge: "border-accent text-accent",
    icon: "text-accent",
    prize: "text-accent",
  },
  2: {
    card: "border-rank-silver-border/45 bg-gradient-to-b from-rank-silver-soft to-background text-rank-silver-ink",
    badge: "border-rank-silver/70 text-rank-silver-ink",
    icon: "",
    prize: "text-rank-silver-ink",
  },
  3: {
    card: "border-rank-bronze-border/50 bg-gradient-to-b from-rank-bronze-soft to-accent-deep text-rank-bronze-ink",
    badge: "border-rank-bronze/70 text-rank-bronze-ink",
    icon: "",
    prize: "text-rank-bronze-ink",
  },
} as const;

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  const byRank = new Map(entries.map((entry) => [entry.rank, entry]));

  return (
    <section
      aria-label="상위 3명"
      className="grid grid-cols-3 items-end gap-2 sm:gap-3"
    >
      {PODIUM_ORDER.map((rank) => {
        const entry = byRank.get(rank);
        const tone = TONE[rank];
        const isFirst = rank === 1;
        const addressLabel = entry ? shortAddress(entry.winnerAddress) : "—";

        return (
          <article
            key={rank}
            className={`flex flex-col items-center overflow-hidden rounded-[var(--kaffle-radius-sm)] border px-2.5 text-center sm:px-3 ${isFirst
              ? "h-[16.5rem] gap-2.5 px-3 pb-4 pt-5 sm:h-[18rem] sm:pt-6"
              : "h-[12.5rem] gap-2 pb-3.5 pt-4 sm:h-[13.5rem]"
              } ${tone.card}`}
          >
            {isFirst ? (
              <ChessQueen
                size={28}
                strokeWidth={1.75}
                className={`shrink-0 ${tone.icon}`}
                aria-hidden="true"
              />
            ) : null}

            <span
              className={`inline-flex shrink-0 aspect-square items-center justify-center rounded-full border font-mono font-semibold leading-none tabular-nums ${isFirst
                ? `h-12 w-12 text-xl ${tone.badge}`
                : `h-10 w-10 text-base ${tone.badge}`
                }`}
            >
              {rank}
            </span>

            <div className="w-full min-w-0">
              {entry?.nickname ? (
                <>
                  <p
                    className={`truncate font-semibold leading-tight text-foreground ${isFirst ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                      }`}
                  >
                    {entry.nickname}
                  </p>
                  <p
                    className={`mt-1 truncate font-mono leading-tight tabular-nums text-muted ${isFirst ? "text-sm" : "text-xs sm:text-sm"
                      }`}
                  >
                    ({addressLabel})
                  </p>
                </>
              ) : (
                <p
                  className={`truncate font-mono font-semibold leading-tight tabular-nums text-foreground ${isFirst ? "text-base sm:text-lg" : "text-sm sm:text-base"
                    }`}
                >
                  {addressLabel}
                </p>
              )}
            </div>

            <div className={`mt-auto w-full min-w-0 ${tone.prize}`}>
              {entry ? (
                <p className="inline-flex max-w-full items-baseline justify-center gap-1">
                  <span
                    className={`font-prize font-normal leading-none tracking-[0.02em] ${
                      isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                    }`}
                  >
                    {entry.prizeTotal}
                  </span>
                  <span className="shrink-0 font-mono text-xs tracking-[0.08em]">
                    {entry.symbol}
                  </span>
                </p>
              ) : (
                <p
                  className={`font-prize font-normal leading-none ${
                    isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                  }`}
                >
                  —
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
