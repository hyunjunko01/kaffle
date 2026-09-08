import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";

export default async function LandingLayout({
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
      {children}
    </div>
  );
}
