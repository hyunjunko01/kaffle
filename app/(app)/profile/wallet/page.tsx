import { BackLink } from "../../back-link";
import { WalletPanel } from "./wallet-panel";

export default function WalletPage() {
  return (
    <main>
      <BackLink href="/profile" label="프로필로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">지갑 관리</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          내 지갑의 자산을 개인지갑이나 거래소 지갑으로 전송합니다.
        </p>
      </header>
      <WalletPanel />
    </main>
  );
}
