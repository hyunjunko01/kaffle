import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import { getMissionsOverview } from "@/lib/missions";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
} from "@/lib/referrals";
import { InviteLinkPanel } from "../invite-link-panel";
import { MissionDetailLayout } from "../mission-detail-header";

export default async function InviteMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);
  const mission = missions.find((item) => item.id === "referral");
  if (!mission) {
    notFound();
  }

  const inviteLink = `${getAppUrl()}/login?ref=${user.referralCode}`;
  const inviteCount = mission.progress;
  const inviteCap = mission.cap || REFERRAL_SUCCESS_CAP;

  return (
    <MissionDetailLayout mission={mission}>
      <section className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
        <h2 className="text-base font-semibold text-foreground">
          초대 링크 공유
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          친구가 링크로 처음 가입하면 당신과 친구 모두 티켓을 받습니다.
        </p>
        <InviteLinkPanel
          inviteLink={inviteLink}
          referralCode={user.referralCode}
          ticketsPerInvite={REFERRAL_TICKETS}
          inviteCount={inviteCount}
          inviteCap={inviteCap}
        />
      </section>
    </MissionDetailLayout>
  );
}
