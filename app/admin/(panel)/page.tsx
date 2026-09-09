import { RafflePanel } from "./raffle-panel";
import { VaultPanel } from "./vault-panel";

export default function AdminPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">관리자</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        라운드를 열고 상금을 붙입니다. 사용자 래플 페이지와는 권한이 다릅니다.
      </p>
      <VaultPanel />
      <RafflePanel />
    </main>
  );
}
