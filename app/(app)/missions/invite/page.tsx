import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import { getMissionsOverview } from "@/lib/missions";
import { REFERRAL_SUCCESS_CAP } from "@/lib/referrals";
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
      <section className="rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <h2 className="text-base font-semibold text-foreground">
          초대 링크 공유
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          초대 코드를 입력하거나 초대 링크를 통해 가입하면 모두 티켓을 받습니다.
        </p>
        <InviteLinkPanel
          inviteLink={inviteLink}
          referralCode={user.referralCode}
          inviteCount={inviteCount}
          inviteCap={inviteCap}
        />
      </section>
    </MissionDetailLayout>
  );
}
