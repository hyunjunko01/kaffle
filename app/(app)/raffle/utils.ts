export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatWinnerLabel(
  winner: string | null | undefined,
  winnerNickname?: string | null,
) {
  if (!winner) {
    return "—";
  }
  const address = shortAddress(winner);
  if (winnerNickname && winnerNickname.trim().length > 0) {
    return `${winnerNickname}, ${address}`;
  }
  return address;
}

export function formatLocal(unix: number) {
  return new Date(unix * 1000).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

export function raffleStatusLabel(current: {
  isOpen: boolean;
  prizeClaimed: boolean;
  winner: string | null;
  isFinished: boolean;
  canRequestWinner: boolean;
}) {
  if (current.isOpen) {
    return "참여 가능";
  }
  if (current.prizeClaimed) {
    return "상금 지급 완료";
  }
  if (current.winner) {
    return "당첨자 확정";
  }
  if (current.isFinished) {
    return "종료";
  }
  if (current.canRequestWinner) {
    return "당첨자 요청 가능";
  }
  return "참여 마감";
}

export function raffleStatusTone(current: {
  isOpen: boolean;
  prizeClaimed: boolean;
  winner: string | null;
  isFinished: boolean;
  canRequestWinner: boolean;
}) {
  if (current.isOpen) {
    return "open";
  }
  if (
    current.prizeClaimed ||
    current.winner ||
    current.isFinished ||
    current.canRequestWinner
  ) {
    return "other";
  }
  return "closed";
}
