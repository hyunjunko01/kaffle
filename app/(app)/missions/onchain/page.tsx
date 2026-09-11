import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview } from "@/lib/missions";
import { FaucetPanel } from "../../faucet/faucet-panel";
import { MissionDetailLayout } from "../mission-detail-header";

export default async function OnchainMissionPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const missions = await getMissionsOverview(user.id);
  const mission = missions.find((item) => item.id === "on-chain");
  if (!mission) {
    notFound();
  }

  return (
    <MissionDetailLayout mission={mission}>
      <FaucetPanel />
    </MissionDetailLayout>
  );
}
