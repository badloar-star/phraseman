import { arenaRankView, type ArenaTierKey } from './rank_engine';
import { arenaDailyGoals, type ArenaDailyGoals } from './daily_goals';
import { arenaHistoryRows, arenaHistorySummary, type ArenaHistoryRow } from './history_view';

/**
 * Главный экран Арены.
 *
 * Владелец (D-31): экран должен быть живым и информативным — топы, цели,
 * что-то содержательное. Не список ссылок, как сейчас.
 *
 * Список ссылок плох тем, что не меняется. Игрок открывает его в понедельник и
 * в пятницу и видит одно и то же, поэтому перестаёт открывать. Живой экран
 * отвечает на «что у меня сейчас»: где я стою, что осталось сделать сегодня,
 * чем кончился прошлый матч, кто рядом.
 *
 * Здесь только сборка модели. Ни сети, ни часов, ни отрисовки.
 */

export type ArenaHubRankCard = Readonly<{
  rp: number;
  tierIndex: number;
  tierKey: ArenaTierKey;
  division: 1 | 2 | 3;
  progress: number;
  rpToNextRank: number;
  top: boolean;
}>;

export type ArenaHubFriend = Readonly<{
  stableUid: string;
  you: boolean;
  rating: number;
  place: number;
}>;

export type ArenaHubModel = Readonly<{
  rank: ArenaHubRankCard;
  goals: ArenaDailyGoals;
  /** Последний матч. `null`, пока их не было. */
  lastMatch: ArenaHistoryRow | null;
  /** Серия побед с последнего матча. */
  streak: number;
  /** Верхушка таблицы друзей вокруг себя. Пусто, если сравнивать не с кем. */
  friends: readonly ArenaHubFriend[];
  /** Сколько живых игроков ищет матч. `null` — неизвестно. */
  searchingNow: number | null;
}>;

/** Сколько строк друзей влезает на главный экран, не превращая его в список. */
export const ARENA_HUB_FRIENDS_LIMIT = 3;

/**
 * Кусок таблицы друзей ВОКРУГ СЕБЯ, а не первые строки.
 *
 * Первые три строки полезны только тому, кто в них есть. Всем остальным они
 * говорят «ты не здесь» — и это единственное, что они говорят. Окно вокруг
 * своей строки показывает тех, кого реально можно догнать.
 */
export function arenaHubFriends(
  rows: readonly Readonly<{ stableUid: string; you: boolean; rating: number }>[],
  limit = ARENA_HUB_FRIENDS_LIMIT,
): readonly ArenaHubFriend[] {
  if (rows.length <= 1) return [];
  const sorted = [...rows].sort((left, right) => right.rating - left.rating
    || left.stableUid.localeCompare(right.stableUid));
  const placed = sorted.map((row, index) => ({ ...row, place: index + 1 }));
  const size = Math.max(1, Math.trunc(limit));
  if (placed.length <= size) return placed;

  const ownIndex = placed.findIndex((row) => row.you);
  if (ownIndex < 0) return placed.slice(0, size);
  // Своя строка по центру окна; у краёв окно прижимается, а не обрезается.
  const half = Math.floor(size / 2);
  const start = Math.max(0, Math.min(placed.length - size, ownIndex - half));
  return placed.slice(start, start + size);
}

export function arenaHubModel(input: Readonly<{
  rating?: unknown;
  dailyDayKey?: string | null;
  todayKey?: string | null;
  dailyMatches?: unknown;
  dailyFirstAnswers?: unknown;
  dailyWins?: unknown;
  historyRaw?: readonly unknown[];
  friendsRaw?: readonly Readonly<{ stableUid: string; you: boolean; rating: number }>[];
  searchingNow?: unknown;
}>): ArenaHubModel {
  const view = arenaRankView(Number(input.rating) || 0);
  const history = arenaHistoryRows(input.historyRaw ?? []);
  const summary = arenaHistorySummary(history);
  const searching = Math.trunc(Number(input.searchingNow));

  return {
    rank: {
      rp: view.rp,
      tierIndex: view.tierIndex,
      tierKey: view.tierKey,
      division: view.division,
      progress: view.rpForRank > 0 ? Math.max(0, Math.min(1, view.rpInRank / view.rpForRank)) : 1,
      rpToNextRank: view.top ? 0 : Math.max(0, view.rpForRank - view.rpInRank),
      top: view.top,
    },
    goals: arenaDailyGoals({
      storedDayKey: input.dailyDayKey,
      todayKey: String(input.todayKey ?? ''),
      matchesToday: input.dailyMatches,
      firstAnswersToday: input.dailyFirstAnswers,
      winsToday: input.dailyWins,
    }),
    lastMatch: history[0] ?? null,
    streak: summary.currentStreak,
    friends: arenaHubFriends(input.friendsRaw ?? []),
    // Ноль ищущих — это тоже сведение, и его надо показать честно; неизвестно
    // — совсем другое дело, и путать их нельзя.
    searchingNow: Number.isFinite(searching) && searching >= 0 ? searching : null,
  };
}
