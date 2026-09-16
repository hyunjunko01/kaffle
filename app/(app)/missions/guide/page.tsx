import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview, KAFFLE_GUIDE_TICKETS } from "@/lib/missions";
import { MissionDetailLayout } from "../mission-detail-header";
import { GuideClaimButton } from "./guide-claim-button";

export default async function KaffleGuideMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);
  const mission = missions.find((item) => item.id === "kaffle-guide");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <div className="space-y-4 text-sm leading-6 text-muted">
        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <h2 className="text-base font-semibold text-foreground">
            Kaffle이란
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              미션을 통해 티켓을 얻고, 래플에 참여해 상금을 얻을 수 있는 web3
              온체인 플랫폼입니다.
            </li>
            <li>카카오 로그인을 통해 Kaffle 지갑이 생성됩니다.</li>
          </ul>
        </div>

        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <h2 className="text-base font-semibold text-foreground">티켓</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              미션 페이지에서 출석, 친구 초대 등의 미션을 완료하면 티켓을
              얻습니다.
            </li>
            <li>
              한 번 참여할 때 1~100장까지 넣을 수 있고, 라운드가 끝날 때까지
              여러 번 참여할 수 있습니다.
            </li>
          </ul>
        </div>

        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <h2 className="text-base font-semibold text-foreground">래플</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              래플 페이지에서 티켓을 사용해 현재 라운드에 참여할 수 있습니다.
            </li>
            <li>
              넣은 티켓이 많을수록 당첨 확률이 높아집니다. 추첨은 전체 티켓을
              기준으로 난수를 뽑아 당첨자 한 명을 고릅니다.
            </li>
          </ul>
        </div>

        <div className="rounded-[var(--kaffle-radius-sm)] border border-border p-5">
          <h2 className="text-base font-semibold text-foreground">
            작동 방식
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              티켓은 오프체인에서 관리되고, 각 라운드는 온체인에서 작동합니다.
            </li>
            <li>추첨 난수는 Chainlink VRF를 통해 받습니다.</li>
            <li>
              플랫폼 내에서의 트랜잭션 가스비는 플랫폼에서 부담합니다.
            </li>
            <li>
              더 자세한 설명은{" "}
              <a
                href="https://github.com/hyunjunko01/kaffle"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-ink underline underline-offset-2"
              >
                GitHub
              </a>
              에서 확인할 수 있습니다.
            </li>
          </ul>
        </div>
      </div>

      <section className="mt-8 rounded-[var(--kaffle-radius-sm)] border border-accent p-5">
        <h2 className="text-base font-semibold text-foreground">티켓 받기</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          가이드를 확인했다면 아래에서 티켓 {KAFFLE_GUIDE_TICKETS}장을 받을 수
          있습니다. 계정당 한 번만 가능합니다.
        </p>
        <GuideClaimButton disabled={mission.completed} />
      </section>
    </MissionDetailLayout>
  );
}
