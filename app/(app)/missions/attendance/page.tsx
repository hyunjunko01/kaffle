import { getCurrentUser } from "@/lib/auth/user";
import { hasAttendanceToday, seoulDateKey } from "@/lib/missions";
import { BackLink } from "@/components/back-link";
import { AttendanceStampCard } from "../attendance-stamp-card";

export default async function AttendanceMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const attendanceDone = await hasAttendanceToday(user.id);
  const dateLabel = seoulDateKey().replaceAll("-", "/");

  return (
    <main>
      <BackLink href="/missions" label="미션 목록으로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">출석 미션</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          하루 한 번 출석하고 티켓을 받습니다.
        </p>
      </header>

      <AttendanceStampCard stamped={attendanceDone} dateLabel={dateLabel} />
    </main>
  );
}
