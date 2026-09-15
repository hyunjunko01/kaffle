import { BackLink } from "@/components/back-link";
import { UnclaimedPanel } from "./unclaimed-panel";

export default function UnclaimedPrizesPage() {
  return (
    <main>
      <BackLink href="/profile" label="프로필로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">미수령 상금</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          당첨되었지만 받지 못한 상금을 확인합니다.
        </p>
      </header>
      <UnclaimedPanel />
    </main>
  );
}
