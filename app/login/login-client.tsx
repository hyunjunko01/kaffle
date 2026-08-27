"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MeResponse } from "@/lib/auth/user";
import { connectMappedWallet, isWeb3AuthConfigured } from "@/lib/auth/web3auth";

type Status = "checking" | "ready" | "connecting-wallet";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connecting = useRef(false);
  const queryError = searchParams.get("error");
  const queryErrorMessage =
    queryError === "kakao-config"
      ? "카카오 앱 키가 설정되지 않았습니다."
      : queryError === "kakao"
        ? "카카오 로그인에 실패했습니다. 다시 시도해 주세요."
        : null;
  const [status, setStatus] = useState<Status>(
    queryError === "kakao-config" ? "ready" : "checking",
  );
  const [error, setError] = useState<string | null>(queryErrorMessage);

  useEffect(() => {
    if (queryError === "kakao-config") {
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await fetch("/api/me");
      if (cancelled) {
        return;
      }

      if (res.status === 401) {
        setStatus("ready");
        return;
      }

      if (!res.ok) {
        setError("세션을 확인하지 못했습니다.");
        setStatus("ready");
        return;
      }

      const me = (await res.json()) as MeResponse;
      if (cancelled) {
        return;
      }
      if (me.wallet) {
        router.replace("/");
        return;
      }

      if (!isWeb3AuthConfigured()) {
        setError("Web3Auth 설정이 없어 지갑을 연결할 수 없습니다.");
        setStatus("ready");
        return;
      }

      if (connecting.current) {
        return;
      }
      connecting.current = true;
      setStatus("connecting-wallet");

      try {
        const tokenRes = await fetch("/api/auth/web3auth-token");
        if (!tokenRes.ok) {
          throw new Error("token");
        }
        const { idToken } = (await tokenRes.json()) as { idToken: string };
        if (cancelled) {
          return;
        }
        const address = await connectMappedWallet(idToken);
        if (cancelled) {
          return;
        }
        const walletRes = await fetch("/api/me/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        if (!walletRes.ok) {
          throw new Error("wallet");
        }
        router.replace("/");
      } catch (err) {
        connecting.current = false;
        console.error(err);
        setError("지갑 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setStatus("ready");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [queryError, router]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-zinc-500">KAFFLE</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">카카오로 시작하기</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          카카오 로그인 후 지갑이 자동으로 연결됩니다.
          시드문구를 입력할 필요는 없습니다.
        </p>

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {status === "checking" || status === "connecting-wallet" ? (
          <p className="mt-8 text-sm text-zinc-500">
            {status === "connecting-wallet"
              ? "지갑을 연결하는 중입니다…"
              : "확인 중입니다…"}
          </p>
        ) : (
          <a
            href={
              searchParams.get("ref")
                ? `/auth/kakao?ref=${encodeURIComponent(searchParams.get("ref")!)}`
                : "/auth/kakao"
            }
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-semibold text-[#191919] transition hover:bg-[#f5dc00]"
          >
            <KakaoMark />
            카카오 로그인
          </a>
        )}
      </div>
    </main>
  );
}

function KakaoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#191919"
        d="M9 1.5C4.86 1.5 1.5 4.24 1.5 7.61c0 2.16 1.41 4.06 3.54 5.16l-.9 3.3c-.08.3.26.54.51.36l3.93-2.61c.14.01.28.02.42.02 4.14 0 7.5-2.74 7.5-6.11S13.14 1.5 9 1.5Z"
      />
    </svg>
  );
}
