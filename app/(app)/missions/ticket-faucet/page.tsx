import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getMissionsOverview,
  isTicketFaucetEnabled,
  TICKET_FAUCET_TICKETS,
} from "@/lib/missions";
import { MissionDetailLayout } from "../mission-detail-header";
import { TicketFaucetClaimButton } from "./ticket-faucet-claim-button";

export default async function TicketFaucetMissionPage() {
  if (!isTicketFaucetEnabled()) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);
  const mission = missions.find((item) => item.id === "ticket-faucet");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <section className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
        <h2 className="text-base font-semibold text-foreground">테스트 티켓</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          한 번에 티켓 {TICKET_FAUCET_TICKETS}장을 받습니다. 필요할 때마다 다시
          받을 수 있습니다.
        </p>
        <TicketFaucetClaimButton tickets={TICKET_FAUCET_TICKETS} />
      </section>
    </MissionDetailLayout>
  );
}
