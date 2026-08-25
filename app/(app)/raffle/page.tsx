import { RaffleEnterPanel } from "./enter-panel";

export default function RafflePage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">래플</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        현재 라운드에 티켓을 사용해 참여합니다. 가스비는 플랫폼이 대신 냅니다.
      </p>
      <RaffleEnterPanel />
    </main>
  );
}
