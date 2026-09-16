import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  FIRST_ENTER_TICKETS,
  getMissionsOverview,
  hasRaffleEntered,
} from "@/lib/missions";
import { MissionDetailLayout } from "../mission-detail-header";
import { FirstEnterActionButton } from "./first-enter-action-button";

export default async function FirstEnterMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const [missions, entered] = await Promise.all([
    getMissionsOverview(user.id),
    hasRaffleEntered(user.id),
  ]);
  const mission = missions.find((item) => item.id === "first-enter");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <section className="rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <p className="text-sm leading-6 text-muted">
          첫 래플 참여를 완료하면 티켓 {FIRST_ENTER_TICKETS}장을 받을 수
          있습니다.
        </p>
        <FirstEnterActionButton
          completed={mission.completed}
          entered={entered}
        />
      </section>
    </MissionDetailLayout>
  );
}
