import { redirect } from "next/navigation";
import { getCurrentUser, toMeResponse } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.wallet) {
    redirect("/login?wallet=1");
  }

  const me = toMeResponse(user);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-zinc-500">KAFFLE</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">로그인됨</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        v0 로그인 루프가 끝나면 이 화면에 계정과 매핑된 주소가 보입니다.
      </p>

      <dl className="mt-8 space-y-4 rounded-2xl border border-zinc-200 p-5 text-sm dark:border-zinc-800">
        <div>
          <dt className="text-zinc-500">Kakao ID</dt>
          <dd className="mt-1 font-mono">{me.user.kakaoId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Wallet</dt>
          <dd className="mt-1 break-all font-mono">{me.wallet?.address}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Tickets</dt>
          <dd className="mt-1 font-mono">{me.ticketBalance}</dd>
        </div>
      </dl>

      <LogoutButton />
    </main>
  );
}
