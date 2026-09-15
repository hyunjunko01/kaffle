import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/auth/user";
import { RegisterPersonalWalletForm } from "./register-personal-wallet-form";

export default async function RegisterExternalWalletPage() {
  const user = await getCurrentUser();

  return (
    <main>
      <BackLink href="/profile" label="프로필로 돌아가기" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          개인 지갑 주소 등록
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          출금에 사용할 개인 지갑 주소를 등록합니다. (이더리움 기반 지갑)
        </p>
      </header>

      <RegisterPersonalWalletForm
        initialAddress={user?.personalWallet?.address ?? null}
      />
    </main>
  );
}
