import { getPrizeLeaderboard } from "@/lib/raffle/leaderboard";
import { getRecentWinners } from "@/lib/raffle/recent-winner";
import { WinnerCarousel } from "@/components/winner-carousel";

export default async function LeaderboardPage() {
  const [recentWinners, leaderboard] = await Promise.all([
    getRecentWinners(3),
    getPrizeLeaderboard(3),
  ]);

  return (
    <main className="space-y-10">
      <section aria-label="최근 당첨자">
        <WinnerCarousel winners={recentWinners} />
      </section>

      <section aria-labelledby="leaderboard-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2
              id="leaderboard-heading"
              className="text-base font-semibold text-foreground"
            >
              누적 상금 리더보드
            </h2>
            <p className="mt-1 text-xs text-muted">래플에서 받은 누적 상금이에요.</p>
          </div>
        </div>
        <ol className="overflow-hidden rounded-sm border border-border bg-surface text-sm">
          <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-3 text-xs text-muted">
            <span>순위</span>
            <span>사용자</span>
            <span>누적 상금</span>
          </li>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry) => (
              <li
                key={entry.winnerAddress}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-4 last:border-b-0"
              >
                <span className="font-mono text-muted">{entry.rank}</span>
                <span className="truncate font-medium">{entry.winnerLabel}</span>
                <span className="font-mono text-accent-ink">
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
      </section>
    </main>
  );
}
