import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { WinnerCarousel } from "@/components/winner-carousel";
import { getLeaderboardPage } from "@/lib/raffle/leaderboard";
import { getRecentWinners } from "@/lib/raffle/recent-winner";
import { LeaderboardPodium } from "./leaderboard-podium";

const RANK_ROW_CLASS: Record<number, string> = {
  1: "bg-gradient-to-r from-accent-soft via-[#2a210f]/80 to-transparent",
  2: "bg-gradient-to-r from-[#2c2e32] via-[#242628]/70 to-transparent",
  3: "bg-gradient-to-r from-[#2f2418] via-[#241c14]/70 to-transparent",
};

const RANK_PRIZE_CLASS: Record<number, string> = {
  1: "text-accent",
  2: "text-[#e8eaed]",
  3: "text-[#e8c4a0]",
};

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? "1");
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedPage = parsePage(params.page);

  const [recentWinners, board] = await Promise.all([
    getRecentWinners(3),
    getLeaderboardPage(requestedPage),
  ]);

  const { podium, entries, page, totalPages } = board;

  return (
    <main className="space-y-8">
      <header className="text-center">
        <BrandMark />
        <h2
          id="leaderboard-heading"
          className="mt-2 text-3xl font-semibold tracking-tight text-foreground"
        >
          누적 상금 리더보드
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Kaffle에서 받은 누적 상금이에요.
        </p>
      </header>

      <section aria-label="최근 당첨자">
        <WinnerCarousel winners={recentWinners} />
      </section>

      <LeaderboardPodium entries={podium} />

      <section aria-labelledby="leaderboard-heading" className="space-y-4">
        <ol className="overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-border bg-surface text-sm">
          <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-3 text-xs text-muted">
            <span>순위</span>
            <span>사용자</span>
            <span>누적 상금</span>
          </li>
          {entries.length > 0 ? (
            entries.map((entry) => (
              <li
                key={entry.winnerAddress}
                className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-4 last:border-b-0 ${
                  RANK_ROW_CLASS[entry.rank] ?? ""
                }`}
              >
                <span className="font-mono text-muted">{entry.rank}</span>
                <span className="truncate font-medium">{entry.winnerLabel}</span>
                <span
                  className={`font-mono ${
                    RANK_PRIZE_CLASS[entry.rank] ?? "text-accent-ink"
                  }`}
                >
                  {entry.prizeTotal} {entry.symbol}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-5 text-center text-sm text-muted">
              아직 수령한 상금이 없습니다.
            </li>
          )}
        </ol>

        {totalPages > 1 ? (
          <nav
            aria-label="리더보드 페이지"
            className="flex items-center justify-center gap-4"
          >
            {page > 1 ? (
              <Link
                href={page === 2 ? "/leaderboard" : `/leaderboard?page=${page - 1}`}
                className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
              >
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                이전
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-muted-soft">
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
                이전
              </span>
            )}

            <span className="font-mono text-sm tabular-nums text-muted">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={`/leaderboard?page=${page + 1}`}
                className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
              >
                다음
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-muted-soft">
                다음
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
            )}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
