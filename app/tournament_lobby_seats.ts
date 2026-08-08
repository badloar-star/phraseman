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

export type LobbyPotEvent = {
  atMs: number;
  potDeltaGems: number;
  potGemsAfter: number;
};

/**
 * Банк на ДАННЫЙ момент — только взносы тех, кто уже сел за стол.
 *
 * зачем 2026-08-04 (владелец: «турнир начался, в лобби ещё ни бота ни юзера, а
 * счётчик сразу набрался 75, а должно появляться вместе с подключением бота и
 * юзера +5»): сервер создаёт комнату одной транзакцией и сразу кладёт в
 * `room.potGems` взносы ВСЕХ пятнадцати ботов (15 × 5 = 75), хотя каждому боту
 * проставлено своё `joinAtMs` и на экране они подходят по одному. Места
 * фильтровались по времени прихода, а банк — нет: игрок видел пустую сетку и
 * полный банк. Ощущение фальши ровно то, ради борьбы с которым ботов и
 * рассадили во времени.
 *
 * Считаем по тем же событиям и тем же часам, что и места: банк — это последнее
 * СОСТОЯВШЕЕСЯ прибытие. Взнос живых игроков (всё, что было в банке до ботов)
 * остаётся базой, поэтому свой собственный вход игрок видит в банке сразу.
 */
// guard-ok: это БАНК КОМНАТЫ для показа, а не кошелёк игрока. Функция чистая —
// ничего не пишет ни в Firestore, ни в локальный баланс; она лишь решает, какую
// часть уже собранного банка показать на текущей секунде. Балансы понижает
// только сервер (functions/src/tournaments.ts), клиент источником истины не является.
export function lobbyPotGemsAtTime(
  totalPotGems: number,
  events: readonly LobbyPotEvent[],
  nowMs: number,
): number {
  const total = Number.isFinite(totalPotGems) ? Math.max(0, Math.trunc(totalPotGems)) : 0;
  if (events.length === 0) return total;
  const botFunding = events.reduce(
    (sum, event) => sum + Math.max(0, Math.trunc(event.potDeltaGems)),
    0,
  );
  // База — взносы живых игроков: полный банк минус всё, что внесут боты.
  const basePot = Math.max(0, total - botFunding);
  const arrived = events.reduce(
    (sum, event) => (event.atMs <= nowMs ? sum + Math.max(0, Math.trunc(event.potDeltaGems)) : sum),
    0,
  );
  // Не превышаем фактический банк комнаты: сервер остаётся источником истины.
  return Math.min(total, basePot + arrived);
}
