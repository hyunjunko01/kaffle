import { NextResponse } from "next/server";
import { getCurrentUser, toMePayload } from "@/lib/auth/user";
import { updateNickname, validateNickname } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { nickname?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  let nickname: string;
  try {
    nickname = validateNickname(body.nickname);
  } catch {
    return NextResponse.json({ error: "invalid nickname" }, { status: 400 });
  }

  try {
    const updated = await updateNickname(user.id, nickname);
    const current = await getCurrentUser();
    if (!current) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    return NextResponse.json(await toMePayload({ ...current, ...updated }));
  } catch (error) {
    if (error instanceof Error && error.message === "nickname change exhausted") {
      return NextResponse.json(
        { error: "nickname change exhausted" },
        { status: 409 },
      );
    }
    throw error;
  }
}
