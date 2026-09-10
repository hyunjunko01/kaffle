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
      <ProfileForm
        nickname={user.nickname}
        canChangeNickname={!user.postSignupNicknameChanged}
      />
      <dl className="mt-8 space-y-4 rounded-[var(--kaffle-radius-lg)] border border-border p-5 text-sm">
        <div>
          <dt className="text-muted">Wallet</dt>
          <dd className="mt-1 break-all font-mono">{me.wallet?.address}</dd>
        </div>
        <div>
          <dt className="text-muted">Tickets</dt>
          <dd className="mt-1 font-mono">{me.ticketBalance}</dd>
        </div>
      </dl>
      <Link
        href="/profile/wallet"
        className="mt-4 flex items-center justify-between rounded-[var(--kaffle-radius-lg)] border border-border px-4 py-4 text-sm font-medium transition hover:bg-surface"
      >
        <span>지갑 관리</span>
        <span aria-hidden="true" className="text-lg text-muted-soft">
          →
        </span>
      </Link>
    </main>
  );
}
