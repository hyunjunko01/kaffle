import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { grantPayoutAddressMission } from "@/lib/missions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const completion = await grantPayoutAddressMission(user.id);
    if (!completion) {
      return NextResponse.json(
        { error: "payout address already claimed" },
        { status: 409 },
      );
    }
    return NextResponse.json(await toMePayload(user));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "payout address claim failed";
    if (message === "payout address not registered") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
