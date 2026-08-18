import { NextResponse } from "next/server";
import { getCurrentUser, toMeResponse } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(toMeResponse(user));
}
