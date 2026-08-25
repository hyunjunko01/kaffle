import { VaultPanel } from "./vault-panel";

export default function AdminPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">관리자</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        라운드를 열고 상금을 붙입니다. 사용자 래플 페이지와는 권한이 다릅니다.
      </p>
      <VaultPanel />
      <p className="mt-8 rounded-2xl border border-zinc-200 p-5 text-sm leading-6 text-zinc-500 dark:border-zinc-800">
        라운드 생성은 다음 단계에서 붙입니다.
      </p>
    </main>
  );
}
