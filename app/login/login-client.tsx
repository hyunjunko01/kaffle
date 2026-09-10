"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MeResponse } from "@/lib/auth/user";

type Status = "checking" | "ready";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      try {
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

        router.replace("/onboarding");
      } catch {
        if (cancelled) {
          return;
        }
        setError("세션을 확인하지 못했습니다.");
        setStatus("ready");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [queryError, router]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-sm font-bold tracking-[0.22em] text-foreground">
          KAFFLE
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
          카카오로 시작하기
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          카카오 로그인 후 가입 정보를 확인하고,
          <br />
          원하는 경우 지갑을 만들어 시작합니다.
        </p>

        {error ? (
          <p className="mt-6 rounded-[var(--kaffle-radius-lg)] bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {status === "checking" ? (
          <p className="mt-8 text-sm text-muted">확인 중입니다…</p>
        ) : (
          <a
            href={
              searchParams.get("ref")
                ? `/auth/kakao?ref=${encodeURIComponent(searchParams.get("ref")!)}`
                : "/auth/kakao"
            }
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--kaffle-radius-lg)] bg-[#FEE500] text-sm font-semibold text-[#191919] transition hover:bg-[#f5dc00]"
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
