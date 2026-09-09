import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview } from "@/lib/missions";
import { getTicketBalance } from "@/lib/tickets";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const [missions, ticketBalance] = await Promise.all([
    getMissionsOverview(user.id),
    getTicketBalance(user.id),
  ]);

  return (
    <main>
      <header className="text-center">
        <p className="text-sm font-medium text-muted">
          보유 티켓{" "}
          <span className="font-mono tabular-nums text-foreground">
            {ticketBalance}장
          </span>
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
          티켓을 모아 래플에 참여하세요
        </h1>
      </header>
      <nav className="mt-8 space-y-3" aria-label="미션 목록">
        {missions.map((mission) => (
          <Link
            key={mission.id}
            href={mission.href}
            className="flex items-center justify-between gap-4 rounded-[var(--kaffle-radius-md)] border border-border bg-surface px-4 py-4 transition hover:border-border-strong hover:bg-surface-elevated"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="block text-sm font-semibold text-foreground">
                  {mission.title}
                </span>
                <span className="text-xs font-medium text-accent-ink">
                  +{mission.tickets} 티켓
                </span>
              </span>
              <span className="mt-1 block text-sm leading-5 text-muted">
                {mission.description}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                className={
                  mission.completed
                    ? "text-xs font-medium text-muted-soft"
                    : "rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink"
                }
              >
                {mission.statusLabel}
              </span>
              <span aria-hidden="true" className="text-lg text-muted-soft">
                →
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
