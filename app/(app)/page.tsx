import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { getRecentWinner } from "@/lib/raffle/recent-winner";

const sampleLeaderboard = [
  { rank: 1, username: "user_xxxxxxx", prize: "0 USDC" },
  { rank: 2, username: "user_xxxxxxx", prize: "0 USDC" },
  { rank: 3, username: "user_xxxxxxx", prize: "0 USDC" },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (!user?.wallet) {
    return null;
  }

  const [me, recentWinner] = await Promise.all([
    toMePayload(user),
    getRecentWinner().catch(() => null),
  ]);

  return (
    <main className="space-y-10">
      <section className="pt-8 text-center sm:pt-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          행운의 주인공이 되어보세요
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-500">
          {me.user.nickname}님, 미션으로 티켓을 모아 래플에 참여해보세요.
        </p>
      </section>

      <section aria-labelledby="recent-winner-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-winner-heading" className="text-base font-semibold">
            최근 당첨자
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl bg-zinc-950 px-5 py-5 text-center text-sm text-white dark:bg-zinc-100 dark:text-zinc-950">
          {recentWinner ? (
            <>
              <p className="font-mono">
                {recentWinner.roundNumber}회차 래플 당첨자{" "}
                <span className="font-semibold text-amber-300 dark:text-amber-700">
                  {recentWinner.winnerLabel}
                </span>
              </p>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                상금 {recentWinner.prizeAmount} {recentWinner.symbol}
                {recentWinner.claimed ? " · 수령 완료" : " · 수령 대기"}
              </p>
            </>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-600">
              아직 당첨자가 없습니다.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="leaderboard-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="leaderboard-heading" className="text-base font-semibold">
              누적 상금 리더보드
            </h2>
            <p className="mt-1 text-xs text-zinc-500">래플에서 받은 누적 상금이에요.</p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-900">
            예시 데이터
          </span>
        </div>
        <ol className="overflow-hidden rounded-2xl border border-zinc-200 text-sm dark:border-zinc-800">
          <li className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800">
            <span>순위</span>
            <span>사용자</span>
            <span>누적 상금</span>
          </li>
          {sampleLeaderboard.map((entry) => (
            <li
              key={entry.rank}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-3 border-b border-zinc-200 px-4 py-4 last:border-b-0 dark:border-zinc-800"
            >
              <span className="font-mono text-zinc-500">{entry.rank}</span>
              <span className="truncate font-mono">{entry.username}</span>
              <span className="font-mono">{entry.prize}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
