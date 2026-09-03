import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview } from "@/lib/missions";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">미션</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        미션을 완료하면 티켓을 받습니다.
      </p>
      <nav className="mt-8 space-y-3" aria-label="미션 목록">
        {missions.map((mission) => (
          <Link
            key={mission.id}
            href={mission.href}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="block text-sm font-semibold">{mission.title}</span>
                <span className="text-xs font-medium text-zinc-500">
                  +{mission.tickets} 티켓
                </span>
              </span>
              <span className="mt-1 block text-sm leading-5 text-zinc-500">
                {mission.description}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={
                  mission.completed
                    ? "text-xs font-medium text-zinc-400"
                    : "text-xs font-medium text-zinc-950 dark:text-zinc-50"
                }
              >
                {mission.statusLabel}
              </span>
              <span aria-hidden="true" className="text-lg text-zinc-400">
                →
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
