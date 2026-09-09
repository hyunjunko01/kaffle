"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectMappedWallet, isWeb3AuthConfigured } from "@/lib/auth/web3auth";

type OnboardingData = {
  user: {
    nickname: string;
    canChangeNickname: boolean;
    wallet: string | null;
  };
  referralCode: string | null;
};

function errorMessage(value: string | undefined) {
  switch (value) {
    case "invalid nickname":
      return "닉네임을 확인해 주세요.";
    case "invalid referral":
      return "추천 코드를 확인해 주세요.";
    case "wallet already mapped":
      return "이미 다른 계정에 연결된 지갑입니다.";
    case "nickname change exhausted":
      return "닉네임은 한 번만 변경할 수 있습니다.";
    default:
      return value ?? "가입을 완료하지 못했습니다. 다시 시도해 주세요.";
  }
}

export function OnboardingClient() {
  const router = useRouter();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [nickname, setNickname] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/onboarding");
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const body = (await response.json()) as OnboardingData & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(body.error);
        }
        if (cancelled) {
          return;
        }
        if (body.user.wallet) {
          router.replace("/");
          return;
        }
        setData(body);
        setNickname(body.user.nickname);
        setReferralCode(body.referralCode ?? "");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error ? errorMessage(caught.message) : null,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConnecting(true);
    setError(null);

    try {
      if (!isWeb3AuthConfigured()) {
        throw new Error("Web3Auth 설정이 없습니다.");
      }

      const tokenResponse = await fetch("/api/auth/web3auth-token");
      if (!tokenResponse.ok) {
        throw new Error("지갑 연결용 토큰을 만들지 못했습니다.");
      }
      const { idToken } = (await tokenResponse.json()) as { idToken: string };
      const address = await connectMappedWallet(idToken);

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          referralCode: referralCode || undefined,
          walletAddress: address,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error);
      }

      router.replace("/");
    } catch (caught) {
      console.error(caught);
      setError(
        caught instanceof Error
          ? errorMessage(caught.message)
          : "가입을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center px-6">
        <p className="text-sm text-muted">가입 정보 확인 중…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
      <form
        onSubmit={(event) => void complete(event)}
        className="w-full max-w-sm"
      >
        <p className="text-center text-sm font-medium tracking-[0.2em] text-muted">
          KAFFLE
        </p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight">
          가입을 완료해 주세요
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted">
          간단한 정보를 확인한 뒤 지갑을 만들고 시작합니다.
        </p>

        {error ? (
          <p className="mt-6 rounded-[var(--kaffle-radius-md)] bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <label className="mt-8 block text-sm font-medium">
          닉네임
          <input
            type="text"
            value={nickname}
            maxLength={20}
            onChange={(event) => setNickname(event.target.value)}
            disabled={!data?.user.canChangeNickname || connecting}
            className="mt-2 h-12 w-full rounded-[var(--kaffle-radius-md)] border border-border bg-transparent px-4 outline-none focus:border-border-strong disabled:bg-surface"
          />
          <span className="mt-2 block text-xs font-normal leading-5 text-muted">
            기본 닉네임으로 바로 시작하거나, 지금 한 번 변경할 수 있습니다.
          </span>
        </label>

        <label className="mt-5 block text-sm font-medium">
          추천 코드 <span className="font-normal text-muted-soft">(선택)</span>
          <input
            type="text"
            value={referralCode}
            maxLength={8}
            onChange={(event) => setReferralCode(event.target.value)}
            readOnly={Boolean(data?.referralCode)}
            disabled={connecting}
            placeholder="초대 링크가 있다면 자동으로 적용됩니다"
            className="mt-2 h-12 w-full rounded-[var(--kaffle-radius-md)] border border-border bg-transparent px-4 font-mono outline-none focus:border-border-strong read-only:bg-surface disabled:bg-surface"
          />
          <span className="mt-2 block text-xs font-normal leading-5 text-muted">
            {data?.referralCode
              ? "초대 링크의 추천 코드가 자동으로 적용되었습니다."
              : "추천 링크 없이 가입하는 경우 입력하지 않아도 됩니다."}
          </span>
        </label>

        <button
          type="submit"
          disabled={connecting || nickname.trim().length === 0}
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-[var(--kaffle-radius-md)] bg-foreground text-sm font-semibold text-ink-inverse transition hover:opacity-90 disabled:opacity-60"
        >
          {connecting ? "지갑을 만드는 중…" : "지갑 만들고 시작하기"}
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-muted">
          시드문구를 직접 입력하지 않는 지갑입니다. 지갑 생성 중에는 창을 닫지
          마세요.
        </p>
      </form>
    </main>
  );
}
