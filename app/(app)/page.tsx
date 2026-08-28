import Link from "next/link";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user?.wallet) {
    return null;
  }

  const me = await toMePayload(user);

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">홈</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        {me.user.nickname}님, 미션으로 티켓을 모으고 래플에 참여하세요.
      </p>

      <dl className="mt-8 space-y-4 rounded-2xl border border-zinc-200 p-5 text-sm dark:border-zinc-800">
        <div>
          <dt className="text-zinc-500">Wallet</dt>
          <dd className="mt-1 break-all font-mono">{me.wallet?.address}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Tickets</dt>
          <dd className="mt-1 font-mono">{me.ticketBalance}</dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-3">
        <Link
          href="/raffle"
          className="rounded-2xl border border-zinc-200 p-5 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <p className="text-base font-semibold">래플 참여</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            현재 라운드에 티켓을 사용합니다.
          </p>
        </Link>
        <Link
          href="/missions"
          className="rounded-2xl border border-zinc-200 p-5 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <p className="text-base font-semibold">미션</p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            출석과 미션으로 티켓을 받습니다.
          </p>
        </Link>
      </div>
    </main>
  );
}
