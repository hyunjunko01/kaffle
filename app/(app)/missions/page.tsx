import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview } from "@/lib/missions";
import { getTicketBalance } from "@/lib/tickets";
import { MissionsPanel } from "./missions-panel";
import { MissionsShell } from "./missions-shell";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const [missions, ticketBalance] = await Promise.all([
    getMissionsOverview(user.id),
    getTicketBalance(user.id),
  ]);

  return (
    <main>
      <MissionsShell ticketBalance={ticketBalance}>
        <MissionsPanel missions={missions} />
      </MissionsShell>
    </main>
  );
}
