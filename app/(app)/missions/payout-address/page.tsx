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
          <li>출금 주소 등록 페이지에서 본인 지갑을 연결합니다.</li>
          <li>서명으로 주소 소유를 확인하면 등록이 완료됩니다.</li>
          <li>등록이 끝나면 이 페이지로 돌아와 보상을 받습니다.</li>
          <li>계정당 한 번만 받을 수 있습니다.</li>
        </ol>
      </section>

      <section className="mt-8 rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <h2 className="text-base font-semibold text-foreground">보상</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
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
