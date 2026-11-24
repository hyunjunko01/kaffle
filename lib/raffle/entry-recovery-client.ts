import type { EntryRecoveryBatch, EntryRecoveryProgress, EntryRecoveryStatus } from "@/lib/raffle/entry-recovery-types";

export async function readEntryRecoveryStatus(endpoint: string, signal?: AbortSignal): Promise<EntryRecoveryStatus> {
  const response = await fetch(endpoint, { cache: "no-store", signal });
  if (!response.ok) throw new Error("미확정 참여 내역을 불러오지 못했습니다. 다시 시도해 주세요.");
  return response.json();
}

export async function runEntryRecovery(
  endpoint: string,
  onProgress: (progress: EntryRecoveryProgress) => void,
  signal?: AbortSignal,
) {
  const progress: EntryRecoveryProgress = { checked: 0, confirmed: 0, refunded: 0, pending: 0, unavailable: 0 };
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  do {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cursor }),
      signal,
    });
    if (!response.ok) throw new Error("일부 내역을 확인하지 못했습니다. 처리된 결과는 저장되었으며 다시 확인할 수 있습니다.");
    const batch = await response.json() as EntryRecoveryBatch;
    for (const result of batch.results) {
      progress.checked++;
      if (result.state === "confirmed") progress.confirmed++;
      else if (result.state === "failed") progress.refunded++;
      else if (result.state === "pending") progress.pending++;
      else progress.unavailable++;
    }
    onProgress({ ...progress });
    cursor = batch.nextCursor;
    if (cursor && seenCursors.has(cursor)) throw new Error("확인이 중단되었습니다. 내역을 새로고침한 뒤 다시 시도해 주세요.");
    if (cursor) seenCursors.add(cursor);
    // Pending entries are revisited only on another user/admin action, never in an endless loop.
  } while (cursor);
  return progress;
}
