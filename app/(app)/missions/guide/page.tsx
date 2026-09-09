import { getCurrentUser } from "@/lib/auth/user";
import { hasKaffleGuideCompleted, KAFFLE_GUIDE_TICKETS } from "@/lib/missions";
import { MissionBackLink } from "../mission-back-link";
import { GuideClaimButton } from "./guide-claim-button";

export default async function KaffleGuideMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const claimed = await hasKaffleGuideCompleted(user.id);

  return (
    <main>
      <MissionBackLink />
      <header className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Kaffle 가이드
        </h1>
      </header>

      <section className="mt-8 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <div className="rounded-sm border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Kaffle이란
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>미션으로 티켓을 모으고, 래플에 참여해 상금을 노리는 서비스입니다.</li>
            <li>카카오 로그인 후 지갑이 연결되면 바로 시작할 수 있습니다.</li>
            <li>온체인 참여와 상금 정산은 플랫폼이 도와줍니다.</li>
          </ul>
        </div>

        <div className="rounded-sm border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            티켓 모으기
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>미션 페이지에서 출석, 초대, 온체인 미션 등을 완료하면 티켓을 받습니다.</li>
            <li>모은 티켓으로 래플에 참여할 수 있습니다.</li>
          </ul>
        </div>

        <div className="rounded-sm border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            래플 참여
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>래플 페이지에서 티켓을 사용해 현재 라운드에 참여합니다.</li>
            <li>가스비는 플랫폼이 대신 내므로 따로 낼 필요가 없습니다.</li>
            <li>넣은 티켓이 많을수록 당첨 확률이 높아집니다.</li>
            <li>라운드가 끝나면 참여자 중 한 명이 당첨되고, 당첨자는 상금을 받을 수 있습니다.</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-sm border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
          티켓 받기
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          가이드를 확인했다면 아래에서 티켓 {KAFFLE_GUIDE_TICKETS}장을 받을 수
          있습니다. 계정당 한 번만 가능합니다.
        </p>
        <GuideClaimButton disabled={claimed} />
      </section>
    </main>
  );
}
