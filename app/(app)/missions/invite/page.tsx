import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
  countSuccessfulReferrals,
} from "@/lib/referrals";
import { BackLink } from "@/components/back-link";
import { InviteLinkPanel } from "../invite-link-panel";

export default async function InviteMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const inviteCount = await countSuccessfulReferrals(user.id);
  const inviteLink = `${getAppUrl()}/login?ref=${user.referralCode}`;

  return (
    <main>
      <BackLink href="/missions" label="미션 목록으로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          친구 초대 미션
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          친구를 초대하고 함께 티켓을 받습니다.
        </p>
      </header>

      <section className="mt-8 rounded-[var(--kaffle-radius-md)] border border-border p-5">
        <h2 className="text-base font-semibold">초대 링크 공유</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          친구가 링크로 처음 가입하면 당신과 친구 모두 티켓을 받습니다.
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
