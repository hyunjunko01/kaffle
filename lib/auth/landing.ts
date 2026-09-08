export const LANDING_SEEN_COOKIE = "kaffle_landing_seen";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function landingSeenCookieOptions(maxAge = ONE_YEAR_SECONDS) {
  return {
    path: "/",
    maxAge,
    sameSite: "lax" as const,
    httpOnly: true,
  };
}
