import { RaffleEnterPanel } from "./enter-panel";

export default function RafflePage() {
  return (
    <main>
      <RaffleEnterPanel />
      <details className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
          래플 안내
        </summary>
        <div className="border-t border-zinc-200 px-5 py-4 text-sm leading-6 text-zinc-500 dark:border-zinc-800">
          <p>현재 라운드에 티켓을 사용해 참여합니다. 가스비는 플랫폼이 대신 냅니다.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>사용한 티켓 수가 많을수록 당첨 확률이 높아집니다.</li>
            <li>라운드가 종료되면 참여자 중 한 명이 당첨자로 선정됩니다.</li>
            <li>당첨자는 래플 페이지에서 상금을 받을 수 있습니다.</li>
          </ul>
        </div>
      </details>
    </main>
  );
}
