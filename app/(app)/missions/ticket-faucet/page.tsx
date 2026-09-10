import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  isTicketFaucetEnabled,
  TICKET_FAUCET_TICKETS,
} from "@/lib/missions";
import { BackLink } from "@/components/back-link";
import { TicketFaucetClaimButton } from "./ticket-faucet-claim-button";

export default async function TicketFaucetMissionPage() {
  if (!isTicketFaucetEnabled()) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return (
    <main>
      <BackLink href="/missions" label="미션 목록으로 돌아가기" />
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          티켓 faucet
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Base Sepolia 테스트 전용입니다. 래플 돌림판처럼 칸이 많은 연출을
          확인할 때 사용하세요.
        </p>
      </header>

      <section className="mt-8 rounded-[var(--kaffle-radius-md)] border border-border p-5">
        <h2 className="text-base font-semibold text-foreground">테스트 티켓</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          한 번에 티켓 {TICKET_FAUCET_TICKETS}장을 받습니다. 필요할 때마다 다시
          받을 수 있습니다.
        </p>
        <TicketFaucetClaimButton tickets={TICKET_FAUCET_TICKETS} />
      </section>
    </main>
  );
}
