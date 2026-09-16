import { notFound, redirect } from "next/navigation";
import { isOnchainMissionEnabled } from "@/lib/missions";

export default function FaucetPage() {
  if (!isOnchainMissionEnabled()) {
    notFound();
  }
  redirect("/missions/onchain");
}
