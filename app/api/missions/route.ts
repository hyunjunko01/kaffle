import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ATTENDANCE_TICKETS, hasAttendanceToday } from "@/lib/missions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attendanceDone = await hasAttendanceToday(user.id);

  return NextResponse.json({
    missions: [
      {
        id: "attendance",
        tickets: ATTENDANCE_TICKETS,
        completed: attendanceDone,
        available: !attendanceDone,
      },
      {
        id: "on-chain",
        tickets: 0,
        completed: false,
        available: false,
      },
      {
        id: "sns",
        tickets: 0,
        completed: false,
        available: false,
      },
    ],
  });
}
