import type { RoundParticipant } from "./types";

export type WheelSlot = {
  nickname: string;
  walletAddress: string | null;
};

const MAX_WHEEL_SLOTS = 96;

/** Expand participants into one slot per ticket (optionally downsampled). */
export function buildTicketSlots(
  participants: RoundParticipant[],
  maxSlots = MAX_WHEEL_SLOTS,
): WheelSlot[] {
  const expanded: WheelSlot[] = [];
  for (const entry of participants) {
    const count = Math.max(0, entry.ticketCount);
    for (let i = 0; i < count; i += 1) {
      expanded.push({
        nickname: entry.nickname,
        walletAddress: entry.walletAddress ?? null,
      });
    }
  }

  if (expanded.length <= maxSlots) {
    return expanded;
  }

  // Keep ticket weighting while capping DOM nodes.
  const totalTickets = expanded.length;
  const scaled = participants.map((entry) => {
    const exact = (entry.ticketCount / totalTickets) * maxSlots;
    const base = Math.max(1, Math.floor(exact));
    return { entry, base, frac: exact - Math.floor(exact) };
  });

  let used = scaled.reduce((sum, row) => sum + row.base, 0);
  const byFrac = [...scaled].sort((a, b) => b.frac - a.frac);
  let idx = 0;
  while (used < maxSlots && byFrac.length > 0) {
    byFrac[idx % byFrac.length].base += 1;
    used += 1;
    idx += 1;
  }
  while (used > maxSlots) {
    const richest = scaled
      .filter((row) => row.base > 1)
      .sort((a, b) => b.base - a.base)[0];
    if (!richest) break;
    richest.base -= 1;
    used -= 1;
  }

  const slots: WheelSlot[] = [];
  for (const row of scaled) {
    for (let i = 0; i < row.base; i += 1) {
      slots.push({
        nickname: row.entry.nickname,
        walletAddress: row.entry.walletAddress ?? null,
      });
    }
  }
  return slots;
}

export function findWinnerSlotIndex(
  slots: WheelSlot[],
  winnerAddress: string | null | undefined,
  winnerNickname?: string | null,
): number {
  if (slots.length === 0) return 0;

  if (winnerAddress) {
    const needle = winnerAddress.toLowerCase();
    const byWallet = slots.findIndex(
      (slot) => slot.walletAddress?.toLowerCase() === needle,
    );
    if (byWallet >= 0) return byWallet;
  }

  if (winnerNickname && winnerNickname.trim().length > 0) {
    const name = winnerNickname.trim();
    const matches = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slot.nickname === name);
    if (matches.length > 0) {
      return matches[Math.floor(matches.length / 2)].index;
    }
  }

  return 0;
}

/** Degrees to rotate so slot index sits under the top pointer. */
export function targetRotationForSlot(
  slotIndex: number,
  slotCount: number,
  currentRotation: number,
  extraTurns = 4,
): number {
  if (slotCount <= 0) {
    return currentRotation + extraTurns * 360;
  }
  const slice = 360 / slotCount;
  // Segment centers are at index * slice with conic from -slice/2.
  const targetMod = ((-(slotIndex * slice)) % 360 + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;
  return currentRotation + extraTurns * 360 + delta;
}
