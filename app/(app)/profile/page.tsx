import { getCurrentUser } from "@/lib/auth/user";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">프로필</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        서비스에서 사용할 닉네임을 확인할 수 있습니다.
      </p>
      <ProfileForm
        nickname={user.nickname}
        canChangeNickname={user.nicknameChangeCount === 0}
      />
    </main>
  );
}
