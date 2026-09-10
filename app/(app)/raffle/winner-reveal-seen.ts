const STORAGE_PREFIX = "kaffle-seen-winner";

function storageKey(raffleAddress: string, wallet: string | null) {
  const who = wallet?.toLowerCase() ?? "anon";
  return `${STORAGE_PREFIX}:${who}:${raffleAddress.toLowerCase()}`;
}

export function hasSeenWinnerReveal(
  raffleAddress: string,
  wallet: string | null,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(storageKey(raffleAddress, wallet)) === "1";
  } catch {
    return false;
  }
}

export function markWinnerRevealSeen(
  raffleAddress: string,
  wallet: string | null,
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(raffleAddress, wallet), "1");
  } catch {
    // ignore quota / private mode
  }
}
