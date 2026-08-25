import { getCurrentUser } from "@/lib/auth/user";
import { hasAttendanceToday } from "@/lib/missions";
import { AttendanceButton } from "./attendance-button";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const attendanceDone = await hasAttendanceToday(user.id);

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">미션</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        미션을 완료하면 티켓을 받습니다.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-base font-semibold">출석</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">하루 한 번 출석하면 티켓을 받습니다.</p>
        <AttendanceButton disabled={attendanceDone} />
      </section>
    </main>
  );
}
