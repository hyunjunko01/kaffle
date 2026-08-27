import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import { ATTENDANCE_TICKETS, hasAttendanceToday } from "@/lib/missions";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
  countSuccessfulReferrals,
} from "@/lib/referrals";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [attendanceDone, inviteCount] = await Promise.all([
    hasAttendanceToday(user.id),
    countSuccessfulReferrals(user.id),
  ]);
  const inviteLink = `${getAppUrl()}/login?ref=${user.referralCode}`;

  return NextResponse.json({
    missions: [
      {
        id: "attendance",
        tickets: ATTENDANCE_TICKETS,
        completed: attendanceDone,
        available: !attendanceDone,
      },
      {
        id: "referral",
        tickets: REFERRAL_TICKETS,
        completed: inviteCount >= REFERRAL_SUCCESS_CAP,
        available: inviteCount < REFERRAL_SUCCESS_CAP,
        referralCode: user.referralCode,
        inviteLink,
        inviteCount,
        inviteCap: REFERRAL_SUCCESS_CAP,
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
