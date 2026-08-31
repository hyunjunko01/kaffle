import Link from "next/link";

const missions = [
  {
    href: "/missions/attendance",
    title: "출석",
    description: "하루 한 번 출석하고 티켓을 받습니다.",
  },
  {
    href: "/missions/invite",
    title: "친구 초대",
    description: "친구를 초대하고 티켓을 받습니다.",
  },
  {
    href: "/missions/onchain",
    title: "온체인 미션",
    description: "테스트 토큰을 받고 지갑 트랜잭션을 확인합니다.",
  },
];

export default function MissionsPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">미션</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        미션을 완료하면 티켓을 받습니다.
      </p>
      <nav className="mt-8 space-y-3" aria-label="미션 목록">
        {missions.map((mission) => (
          <Link
            key={mission.href}
            href={mission.href}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{mission.title}</span>
              <span className="mt-1 block text-sm leading-5 text-zinc-500">
                {mission.description}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-lg text-zinc-400">
              →
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
