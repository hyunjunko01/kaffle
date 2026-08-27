import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getAppUrl } from "@/lib/env";
import {
  REFERRAL_SUCCESS_CAP,
  REFERRAL_TICKETS,
  applyReferralCode,
  countSuccessfulReferrals,
} from "@/lib/referrals";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inviteCount = await countSuccessfulReferrals(user.id);

  return NextResponse.json({
    referralCode: user.referralCode,
    inviteLink: `${getAppUrl()}/login?ref=${user.referralCode}`,
    referredByUserId: user.referredByUserId,
    inviteCount,
    inviteCap: REFERRAL_SUCCESS_CAP,
    ticketsPerInvite: REFERRAL_TICKETS,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let referralCode: unknown;
  try {
    ({ referralCode } = (await request.json()) as { referralCode?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (typeof referralCode !== "string" || referralCode.trim().length === 0) {
    return NextResponse.json({ error: "invalid referral" }, { status: 400 });
  }

  try {
    await applyReferralCode(user.id, referralCode);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    if (message === "already referred") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === "invalid referral") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
