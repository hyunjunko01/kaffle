import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getMissionsOverview } from "@/lib/missions";

/** Optional JSON mirror of the /missions hub. The hub itself reads lib on the server. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const missions = await getMissionsOverview(user.id);
  return NextResponse.json({ missions });
}
