import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await toMePayload(user));
}
