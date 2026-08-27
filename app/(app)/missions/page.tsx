import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import { hasAttendanceToday } from "@/lib/missions";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
  countSuccessfulReferrals,
} from "@/lib/referrals";
import { AttendanceButton } from "./attendance-button";
import { InviteLinkPanel } from "./invite-link-panel";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const [attendanceDone, inviteCount] = await Promise.all([
    hasAttendanceToday(user.id),
    countSuccessfulReferrals(user.id),
  ]);
  const inviteLink = `${getAppUrl()}/login?ref=${user.referralCode}`;

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">미션</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        미션을 완료하면 티켓을 받습니다.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-base font-semibold">출석</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          하루 한 번 출석하면 티켓을 받습니다.
        </p>
        <AttendanceButton disabled={attendanceDone} />
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-base font-semibold">친구 초대</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          친구가 링크로 첫 가입하면 양쪽 모두 티켓을 받습니다.
        </p>
        <InviteLinkPanel
          inviteLink={inviteLink}
          referralCode={user.referralCode}
          ticketsPerInvite={REFERRAL_TICKETS}
          inviteCount={inviteCount}
          inviteCap={REFERRAL_SUCCESS_CAP}
        />
      </section>
    </main>
  );
}
