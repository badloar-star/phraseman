export type LobbyArrival = {
  id: string;
  joinAtMs?: number;
};

function arrivalTime(player: LobbyArrival): number {
  return typeof player.joinAtMs === 'number' && Number.isFinite(player.joinAtMs)
    ? player.joinAtMs
    : Number.MIN_SAFE_INTEGER;
}

/** Visible seats are always an arrival-time prefix, so a new player appends. */
export function orderVisibleLobbyPlayers<T extends LobbyArrival>(
  players: readonly T[],
  nowMs: number,
): T[] {
  return players
    .map((player, inputIndex) => ({ player, inputIndex }))
    .filter(({ player }) => arrivalTime(player) <= nowMs)
    .sort((left, right) => (
      arrivalTime(left.player) - arrivalTime(right.player)
      || left.inputIndex - right.inputIndex
    ))
    .map(({ player }) => player);
}
