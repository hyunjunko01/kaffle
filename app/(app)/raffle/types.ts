export type CurrentRaffle = {
  address: string;
  roundNumber: number | null;
  startTime: number;
  endTime: number;
  isFinished: boolean;
  isOpen: boolean;
  canRequestWinner: boolean;
  canClaim: boolean;
  userTickets: number;
  totalTickets: number;
  winner: string | null;
  prizeAmount: string;
  prizeClaimed: boolean;
  prizeAttached: boolean;
};

export type RoundParticipant = {
  userId: string;
  nickname: string;
  ticketCount: number;
};

export type RaffleView = {
  symbol: string;
  ticketBalance: number;
  wallet: string | null;
  maxTicketsPerEnter: number;
  current: CurrentRaffle | null;
  participants: RoundParticipant[];
};

export function toView(
  body: Partial<RaffleView> & { current?: CurrentRaffle | null },
  fallback: RaffleView | null,
): RaffleView {
  const mergedCurrent =
    body.current === undefined
      ? (fallback?.current ?? null)
      : body.current === null
        ? null
        : {
            ...(fallback?.current ?? {}),
            ...body.current,
          };

  return {
    symbol: body.symbol ?? fallback?.symbol ?? "",
    ticketBalance: body.ticketBalance ?? fallback?.ticketBalance ?? 0,
    wallet: body.wallet ?? fallback?.wallet ?? null,
    maxTicketsPerEnter:
      body.maxTicketsPerEnter ?? fallback?.maxTicketsPerEnter ?? 100,
    current: mergedCurrent as CurrentRaffle | null,
    participants:
      body.participants !== undefined
        ? body.participants
        : (fallback?.participants ?? []),
  };
}
