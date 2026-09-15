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
      <section className="rounded-[var(--kaffle-radius-sm)] border border-border p-5 text-sm leading-6 text-muted">
        <h2 className="text-base font-semibold text-foreground">하는 방법</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>래플 페이지에서 티켓을 사용해 현재 라운드에 참여합니다.</li>
          <li>참여가 완료되면 이 페이지로 돌아와 보상을 받습니다.</li>
          <li>계정당 한 번만 받을 수 있습니다.</li>
        </ol>
      </section>

      <section className="mt-8 rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <h2 className="text-base font-semibold text-foreground">보상</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
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
