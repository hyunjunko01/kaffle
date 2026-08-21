import { redirect } from "next/navigation";
import { getCurrentUser, toMePayload } from "@/lib/auth";
import { AppHeader } from "../app-header";

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
    redirect("/login?wallet=1");
  }

  const me = await toMePayload(user);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader ticketBalance={me.ticketBalance} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-10">{children}</div>
    </div>
  );
}
