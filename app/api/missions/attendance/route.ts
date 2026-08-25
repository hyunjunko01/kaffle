import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { grantAttendance } from "@/lib/missions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completion = await grantAttendance(user.id);
  if (!completion) {
    return NextResponse.json(
      { error: "Attendance already granted today" },
      { status: 409 },
    );
  }

  return NextResponse.json(await toMePayload(user));
}
