"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type AttendanceCalendarProps = {
  monthKey: string;
  todayKey: string;
  stampedDates: string[];
  streakProgress: number;
  streakDays: number;
  streakBonusTickets: number;
};

function monthTitle(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function buildMonthCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(`${monthKey}-01T12:00:00+09:00`).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number | null; dateKey: string | null }> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      dateKey: `${monthKey}-${String(day).padStart(2, "0")}`,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateKey: null });
  }
  return cells;
}

export function AttendanceCalendar({
  monthKey,
  todayKey,
  stampedDates,
  streakProgress,
  streakDays,
  streakBonusTickets,
}: AttendanceCalendarProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stamped = new Set(stampedDates);
  const todayStamped = stamped.has(todayKey);
  const cells = buildMonthCells(monthKey);

  async function checkIn() {
    if (todayStamped || pending) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/missions/attendance", { method: "POST" });
    if (!res.ok) {
      setPending(false);
      setError(
        res.status === 409
          ? "오늘은 이미 출석했습니다."
          : "출석에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
      <h2 className="text-center font-mono text-base font-medium tabular-nums text-foreground">
        {monthTitle(monthKey)}
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-muted">
        {streakDays}일 연속 출석 시 티켓 보너스 +{streakBonusTickets}
      </p>
      <p className="mt-1 text-center text-sm leading-6 text-accent-ink">
        {streakProgress}일차 연속 출석
      </p>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="pb-2 text-xs font-medium text-muted-soft"
          >
            {label}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isToday = cell.dateKey === todayKey;
          const isStamped = stamped.has(cell.dateKey);
          const canCheckIn = isToday && !isStamped && !pending;

          const className = `flex aspect-square items-center justify-center rounded-[var(--kaffle-radius-sm)] text-sm tabular-nums ${
            isToday
              ? isStamped
                ? "bg-accent-soft font-semibold text-accent-ink"
                : "border border-dashed border-accent font-semibold text-accent-ink"
              : isStamped
                ? "bg-accent-soft text-accent-ink"
                : "text-muted"
          } ${pending && isToday && !isStamped ? "opacity-60" : ""}`;

          if (canCheckIn) {
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => void checkIn()}
                aria-label={`${cell.day}일 출석하고 티켓 받기`}
                className={`${className} transition hover:border-solid hover:border-border-strong`}
              >
                {cell.day}
              </button>
            );
          }

          return (
            <div
              key={cell.dateKey}
              aria-label={
                isToday && isStamped
                  ? `${cell.day}일 출석 완료`
                  : isStamped
                    ? `${cell.day}일 출석`
                    : `${cell.day}일`
              }
              className={className}
            >
              {isToday && pending && !isStamped ? "…" : cell.day}
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-center text-sm text-danger">{error}</p> : null}
    </section>
  );
}
