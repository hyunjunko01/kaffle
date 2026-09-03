import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { getPrizeLeaderboard } from "@/lib/raffle/leaderboard";
import { getRecentWinner } from "@/lib/raffle/recent-winner";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user?.wallet) {
    return null;
  }

  const [me, recentWinner, leaderboard] = await Promise.all([
    toMePayload(user),
    getRecentWinner(),
    getPrizeLeaderboard(3),
  ]);

  return (
    <main className="space-y-10">
      <section className="pt-8 text-center sm:pt-12">
        <p className="font-display text-xs font-bold tracking-[0.22em] text-accent-ink">
          KAFFLE
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          행운의 주인공이 되어보세요
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">
          {me.user.nickname}님, 미션으로 티켓을 모아 래플에 참여해보세요.
        </p>
      </section>

      <section aria-labelledby="recent-winner-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="recent-winner-heading"
            className="text-base font-semibold text-foreground"
          >
            최근 당첨자
          </h2>
        </div>
        <div className="overflow-hidden rounded-[var(--kaffle-radius-lg)] border border-accent/25 bg-accent-soft px-5 py-5 text-center text-sm text-accent-ink">
          {recentWinner ? (
            <>
              <p className="font-mono">
                {recentWinner.roundNumber}회차 래플 당첨자{" "}
                <span className="font-semibold text-foreground">
                  {recentWinner.winnerLabel}
                </span>
              </p>
              <p className="mt-2 text-xs text-accent-ink/75">
                상금 {recentWinner.prizeAmount} {recentWinner.symbol}
                {recentWinner.claimed ? " · 수령 완료" : " · 수령 대기"}
              </p>
            </>
          ) : (
            <p className="text-accent-ink/70">아직 당첨자가 없습니다.</p>
          )}
        </div>
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
        <ol className="overflow-hidden rounded-[var(--kaffle-radius-lg)] border border-border bg-surface text-sm">
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
