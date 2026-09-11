import type { ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import type { MissionOverviewItem } from "@/lib/missions";

export function MissionDetailHeader({
  mission,
}: {
  mission: Pick<
    MissionOverviewItem,
    "title" | "description" | "tickets" | "statusLabel" | "completed"
  >;
}) {
  return (
    <>
      <BackLink href="/missions" label="미션 목록으로 돌아가기" />
      <header className="text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {mission.title}
          </h1>
          <span
            className={
              mission.completed
                ? "rounded-[var(--kaffle-radius-sm)] border border-border px-2.5 py-1.5 text-sm font-medium leading-none text-muted-soft"
                : "rounded-[var(--kaffle-radius-sm)] border border-accent px-2.5 py-1.5 text-sm font-medium leading-none text-accent-ink"
            }
          >
            {mission.statusLabel}
          </span>
        </div>
        <p className="mt-2 font-mono text-sm tabular-nums text-accent-ink">
          티켓 +{mission.tickets}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">{mission.description}</p>
      </header>
    </>
  );
}

export function MissionDetailLayout({
  mission,
  children,
}: {
  mission: Pick<
    MissionOverviewItem,
    "title" | "description" | "tickets" | "statusLabel" | "completed"
  >;
  children: ReactNode;
}) {
  return (
    <main>
      <MissionDetailHeader mission={mission} />
      <div className="mt-8">{children}</div>
    </main>
  );
}
