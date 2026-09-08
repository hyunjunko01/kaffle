"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  LANDING_SEEN_COOKIE,
  landingSeenCookieOptions,
} from "@/lib/auth/landing";

export async function enterFromLanding() {
  const cookieStore = await cookies();
  cookieStore.set(LANDING_SEEN_COOKIE, "1", landingSeenCookieOptions());
  redirect("/raffle");
}
