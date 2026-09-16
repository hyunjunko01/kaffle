import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { getUserPrizeTotal } from "@/lib/raffle/leaderboard";
import { LogoutButton } from "../logout-button";
import { ProfileForm } from "./profile-form";
import { WalletManageMenu } from "./wallet-manage-menu";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const me = await toMePayload(user);
  const walletAddress = me.wallet?.address ?? null;
  const prize = await getUserPrizeTotal(walletAddress);

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <BrandMark />
        <ProfileForm
          nickname={user.nickname}
          canChangeNickname={!user.postSignupNicknameChanged}
          walletAddress={walletAddress}
        />
      </div>
      <section
        aria-label="프로필 요약"
        className="relative grid grid-cols-2 overflow-hidden rounded-[var(--kaffle-radius-sm)] border border-accent bg-gradient-to-b from-accent-soft to-accent-deep"
      >
        <div className="px-3 py-6 text-center sm:px-5">
          <p className="text-xs font-medium tracking-[0.18em] text-muted">
            누적 상금
          </p>
          <div className="mt-2 inline-flex max-w-full flex-col items-stretch">
            <p className="inline-flex items-baseline justify-center gap-1.5 text-accent">
              <span className="font-prize text-4xl font-normal leading-none tracking-[0.02em] sm:text-5xl">
                {prize.prizeTotal}
              </span>
              <span className="font-mono text-xs tracking-[0.08em]">
                {prize.symbol}
              </span>
            </p>
            <div aria-hidden="true" className="mt-1 h-px w-full bg-border" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-px -translate-x-1/2 -translate-y-1/2 rotate-[18deg] bg-muted-soft sm:h-16"
        />
        <div className="px-3 py-6 text-center sm:px-5">
          <p className="text-xs font-medium tracking-[0.18em] text-muted">
            보유 티켓
          </p>
          <div className="mt-2 inline-flex flex-col items-stretch">
            <p className="font-prize text-4xl font-normal leading-none tracking-[0.02em] text-accent sm:text-5xl">
              {me.ticketBalance}
            </p>
            <div aria-hidden="true" className="mt-1 h-px w-full bg-border" />
          </div>
        </div>
      </section>

      <dl className="space-y-4 rounded-[var(--kaffle-radius-sm)] border border-border p-5 text-sm">
        <div>
          <dt className="text-muted">Kaffle 지갑</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-5 text-foreground">
            {walletAddress ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">출금 주소</dt>
          <dd className="mt-1 break-all font-mono text-xs leading-5 text-foreground">
            {user.personalWallet?.address ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">추천 코드</dt>
          <dd className="mt-1 font-mono text-foreground">{user.referralCode}</dd>
        </div>
      </dl>

      <Link
        href="/profile/unclaimed"
        className="inline-flex h-11 w-full items-center justify-between rounded-[var(--kaffle-radius-sm)] border border-accent px-5 text-base font-semibold text-accent-ink transition hover:bg-accent-soft"
      >
        <span>미수령 상금 확인</span>
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
      </Link>

      <WalletManageMenu />

      <div className="flex justify-center pt-2">
        <LogoutButton />
      </div>
    </main>
  );
}
