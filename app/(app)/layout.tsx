import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { AppFooter } from "./app-footer";

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pt-10 pb-32">
        {children}
      </div>
      <AppFooter />
    </div>
  );
}
