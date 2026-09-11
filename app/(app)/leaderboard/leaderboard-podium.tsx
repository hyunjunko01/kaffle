import { ChessQueen } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/raffle/leaderboard";

const PODIUM_ORDER = [2, 1, 3] as const;

const TONE = {
  1: {
    card: "border-accent bg-gradient-to-b from-accent-soft to-[#1a1610] text-accent-ink",
    badge: "border-accent bg-accent/15 text-accent",
    icon: "text-accent",
    prize: "text-accent",
  },
  2: {
    card: "border-[#9aa0a6]/45 bg-gradient-to-b from-[#2c2e32] to-[#1a1b1d] text-[#d7dbe0]",
    badge: "border-[#c5c9ce]/70 bg-[#c5c9ce]/10 text-[#e8eaed]",
    icon: "",
    prize: "text-[#e8eaed]",
  },
  3: {
    card: "border-[#b07d4f]/50 bg-gradient-to-b from-[#2f2418] to-[#1a1510] text-[#e0b892]",
    badge: "border-[#c9956c]/70 bg-[#c9956c]/10 text-[#e8c4a0]",
    icon: "",
    prize: "text-[#e8c4a0]",
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

            <p
              className={`mt-10 font-mono font-semibold leading-tight tabular-nums ${isFirst
                ? `text-base sm:text-lg ${tone.prize}`
                : `text-sm sm:text-base ${tone.prize}`
                }`}
            >
              {entry ? `${entry.prizeTotal} ${entry.symbol}` : "—"}
            </p>
          </article>
        );
      })}
    </section>
  );
}
