import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { grantFirstEnterMission } from "@/lib/missions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const completion = await grantFirstEnterMission(user.id);
    if (!completion) {
      return NextResponse.json(
        { error: "first enter already claimed" },
        { status: 409 },
      );
    }
    return NextResponse.json(await toMePayload(user));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "first enter claim failed";
    if (message === "raffle not entered") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
