import { Suspense } from "react";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-full flex-1 items-center justify-center">
          <p className="text-sm text-zinc-500">확인 중입니다…</p>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
