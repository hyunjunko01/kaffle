import { FaucetPanel } from "../../faucet/faucet-panel";
import { MissionBackLink } from "../mission-back-link";

export default function OnchainMissionPage() {
  return (
    <main>
      <MissionBackLink />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">온체인 미션</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          내 지갑으로 테스트 USDC를 받고 트랜잭션을 확인합니다.
        </p>
      </header>
      <FaucetPanel />
    </main>
  );
}
