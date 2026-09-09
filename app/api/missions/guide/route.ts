import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { grantKaffleGuide } from "@/lib/missions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completion = await grantKaffleGuide(user.id);
  if (!completion) {
    return NextResponse.json(
      { error: "Kaffle guide already claimed" },
      { status: 409 },
    );
  }

  return NextResponse.json(await toMePayload(user));
}
