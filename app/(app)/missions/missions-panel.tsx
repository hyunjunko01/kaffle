"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MissionOverviewItem } from "@/lib/missions";

type FilterId = "all" | "available" | "done";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "전체 미션" },
  { id: "available", label: "참여 가능" },
  { id: "done", label: "참여 완료" },
];

/** Fixed viewport for the reel — short filters leave empty space below. */
const LIST_FRAME_CLASS =
  "h-[min(22rem,48vh)] divide-y divide-border overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function MissionsPanel({ missions }: { missions: MissionOverviewItem[] }) {
  const [filter, setFilter] = useState<FilterId>("available");

  const visible = useMemo(() => {
    if (filter === "available") {
      return missions.filter((m) => !m.completed);
    }
    if (filter === "done") {
      return missions.filter((m) => m.completed);
    }
    return missions;
  }, [filter, missions]);

  const availableCount = missions.filter((m) => !m.completed).length;
  const doneCount = missions.filter((m) => m.completed).length;

  return (
    <div className="overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-border bg-surface">
      <div
        role="tablist"
        aria-label="미션 상태"
        className="grid grid-cols-3 gap-1 border-b border-border p-1.5"
      >
        {FILTERS.map((item) => {
          const active = filter === item.id;
          const count =
            item.id === "available"
              ? availableCount
              : item.id === "done"
                ? doneCount
                : missions.length;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.id)}
              className={`rounded-[var(--kaffle-radius-sm)] px-2 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              {item.label}
              <span
                className={`ml-1 font-mono tabular-nums ${
                  active ? "text-accent" : "text-muted-soft"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ul className={LIST_FRAME_CLASS} aria-label="미션 목록">
        {visible.map((mission) => (
          <li key={mission.id}>
            <Link
              href={mission.href}
              className="flex items-center justify-between gap-3 px-3.5 py-3 transition hover:bg-surface-elevated/50"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {mission.title}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-accent-ink">
                    +{mission.tickets}
                  </span>
                </span>
                <span className="mt-1 block text-sm leading-5 text-muted">
                  {mission.description}
                </span>
              </span>
                <span
                  className={
                    mission.completed
                      ? "shrink-0 rounded-[var(--kaffle-radius-sm)] border border-border px-2 py-1 text-xs font-medium leading-none text-muted-soft"
                      : "shrink-0 rounded-[var(--kaffle-radius-sm)] border border-accent px-2 py-1 text-xs font-medium leading-none text-accent-ink"
                  }
                >
                {mission.statusLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
