import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import {
  PAYOUT_ADDRESS_TICKETS,
  getMissionsOverview,
  hasPayoutAddressRegistered,
} from "@/lib/missions";
import { MissionDetailLayout } from "../mission-detail-header";
import { PayoutAddressActionButton } from "./payout-address-action-button";

export default async function PayoutAddressMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const [missions, registered] = await Promise.all([
    getMissionsOverview(user.id),
    hasPayoutAddressRegistered(user.id),
  ]);
  const mission = missions.find((item) => item.id === "payout-address");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <section className="rounded-[var(--kaffle-radius-sm)] border border-border p-5 text-sm leading-6 text-muted">
        <h2 className="text-base font-semibold text-foreground">하는 방법</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            이더리움 기반 지갑 앱(MetaMask 등)을 설치합니다.
          </li>
          <li>앱 안내에 따라 지갑을 생성합니다.</li>
          <li>
            지갑 앱 안의 브라우저에서 Kaffle을 연 뒤, 출금 주소 등록에서 지갑을
            연결합니다.
          </li>
          <li>서명 요청을 승인하면 등록이 완료됩니다.</li>
        </ol>
      </section>

      <section className="mt-8 rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <p className="text-sm leading-6 text-muted">
          첫 출금 주소를 등록하면 티켓 {PAYOUT_ADDRESS_TICKETS}장을 받을 수
          있습니다. 계정당 한 번만 가능합니다.
        </p>
        <PayoutAddressActionButton
          completed={mission.completed}
          registered={registered}
        />
      </section>
    </MissionDetailLayout>
  );
}
