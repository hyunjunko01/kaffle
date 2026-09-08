import { redirect } from "next/navigation";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { AppFooter } from "./app-footer";
import { AppHeader } from "./app-header";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.wallet) {
    redirect("/onboarding");
  }

  const me = await toMePayload(user);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <AppHeader nickname={me.user.nickname} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-10 pb-32">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
