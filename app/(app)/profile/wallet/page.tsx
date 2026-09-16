import { BackLink } from "@/components/back-link";
import { WalletPanel } from "./wallet-panel";

export default function WalletPage() {
  return (
    <main>
      <BackLink href="/profile" label="프로필로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">USDC 출금</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Kaffle 지갑의 USDC를 출금 주소로 보냅니다.
        </p>
      </header>
      <WalletPanel />
    </main>
  );
}
