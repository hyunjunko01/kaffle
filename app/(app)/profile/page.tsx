import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import Link from "next/link";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }
  const me = await toMePayload(user);

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">프로필</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        서비스에서 사용할 닉네임을 확인할 수 있습니다.
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
      <Link
        href="/profile/wallet"
        className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-4 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <span>지갑 관리</span>
        <span aria-hidden="true" className="text-lg text-zinc-400">
          →
        </span>
      </Link>
      <ProfileForm
        nickname={user.nickname}
        canChangeNickname={!user.postSignupNicknameChanged}
      />
    </main>
  );
}
