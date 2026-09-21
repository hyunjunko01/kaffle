import { OpsWalletsPanel } from "./ops-wallets-panel";
import { RafflePanel } from "./raffle-panel";
import { VaultPanel } from "./vault-panel";

export default function AdminPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">관리자</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        라운드를 열고 상금을 붙입니다. 허용된 카카오 계정만 들어올 수 있습니다.
      </p>
      <OpsWalletsPanel />
      <VaultPanel />
      <RafflePanel />
    </main>
  );
}
