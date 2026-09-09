import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LANDING_SEEN_COOKIE } from "@/lib/auth/landing";
import { getCurrentUser } from "@/lib/auth/user";
import { getRecentWinners } from "@/lib/raffle/recent-winner";
import { WinnerCarousel } from "@/components/winner-carousel";
import { enterFromLanding } from "./actions";

export default async function LandingPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(LANDING_SEEN_COOKIE)?.value === "1") {
    redirect("/raffle");
  }

  const [user, recentWinners] = await Promise.all([
    getCurrentUser(),
    getRecentWinners(3),
  ]);

  if (!user?.wallet) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <section className="text-center">
        <p className="font-display text-xs font-bold tracking-[0.22em] text-accent-ink">
          KAFFLE
        </p>
        <p className="mt-4 text-base font-medium text-muted sm:text-lg">
          {user.nickname} 님, 환영합니다
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          행운의 주인공이 되어보세요
        </h1>
      </section>

      <section className="mt-10" aria-label="최근 당첨자">
        <WinnerCarousel winners={recentWinners} />
      </section>

      <form action={enterFromLanding} className="mt-10 flex justify-center">
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-[var(--kaffle-radius-md)] border border-zinc-200 bg-white px-8 text-base font-medium transition hover:bg-zinc-50 active:translate-y-px dark:border-zinc-800 dark:bg-transparent dark:hover:bg-zinc-900"
        >
          Join Kaffle
        </button>
      </form>
    </main>
  );
}
