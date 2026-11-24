export type PendingEntrySummary = {
  operationId: string;
  raffleAddress: string;
  roundNumber: number | null;
  ticketCount: number;
  state: "preparing" | "pending";
  nickname: string;
  hash: string | null;
  createdAt: string;
};

export type EntryRecoveryStatus = {
  total: number;
  entries: PendingEntrySummary[];
  explorerBaseUrl: string;
};

export type EntryRecoveryResult = {
  operationId: string;
  state: "confirmed" | "failed" | "pending" | "unavailable";
};

export type EntryRecoveryBatch = {
  results: EntryRecoveryResult[];
  nextCursor: string | null;
};

export type EntryRecoveryProgress = {
  checked: number;
  confirmed: number;
  refunded: number;
  pending: number;
  unavailable: number;
};
