import { redirect } from "next/navigation";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { NETWORKS, getChainSlug } from "@/lib/chain/config";
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
    redirect("/login?wallet=1");
  }

  const me = await toMePayload(user);
  const chainLabel = NETWORKS[getChainSlug()].displayName;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader ticketBalance={me.ticketBalance} chainLabel={chainLabel} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-10">{children}</div>
    </div>
  );
}
