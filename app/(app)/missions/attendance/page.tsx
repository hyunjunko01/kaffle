import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  ATTENDANCE_STREAK_BONUS_TICKETS,
  ATTENDANCE_STREAK_DAYS,
  attendanceStreakProgress,
  getAttendanceDatesForMonth,
  getAttendanceStreak,
  getMissionsOverview,
  seoulDateKey,
} from "@/lib/missions";
import { AttendanceCalendar } from "../attendance-calendar";
import { MissionDetailLayout } from "../mission-detail-header";

export default async function AttendanceMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const todayKey = seoulDateKey();
  const monthKey = todayKey.slice(0, 7);
  const [missions, stampedDates, streak] = await Promise.all([
    getMissionsOverview(user.id),
    getAttendanceDatesForMonth(user.id, monthKey),
    getAttendanceStreak(user.id, todayKey),
  ]);
  const mission = missions.find((item) => item.id === "attendance");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <AttendanceCalendar
        monthKey={monthKey}
        todayKey={todayKey}
        stampedDates={stampedDates}
        streakProgress={attendanceStreakProgress(streak)}
        streakDays={ATTENDANCE_STREAK_DAYS}
        streakBonusTickets={ATTENDANCE_STREAK_BONUS_TICKETS}
      />
    </MissionDetailLayout>
  );
}
