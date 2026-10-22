/**
 * Лента «Итоги недели» (идея 6, docs/design/v2-app/friends-full.html #week) — кого и как показать. Чистая функция над снапшотом
 * пар (together_store): без сети и без новых чтений.
 *
 * зачем (макет и закон владельца «телефон решает»): карточка с занятиями — у друга была активность на прошлой неделе (его запись
 * friends_week_v1); «без занятий · Позвать» — друг раньше занимался, а прошлую неделю пропустил (по его дням активности, которые
 * и так видны в «Вместе»). Друзей без записи (старая сборка, неделя скрыта) и новичков без прошлых дней не показываем — ничего не
 * выдумываем. Итоги «выходят» в понедельник в 9:00 по местному времени (макет «пн · 9:00»).
 */
import { getLocalDayKey } from '../local_date';
import { addWeekDays, friendWeekToShow, weekDayKeys, weekStartOf, type FriendWeekSummary } from './friend_week';
import { decodeActiveDays } from './together_days';
import type { FriendTogetherPairState } from './together_store';

export const FRIEND_WEEK_RAIL_HOUR = 9;

export type FriendWeekRailFriend = Readonly<{
  uid: string;
  name: string;
  coinRank: number | null;
  isPlus: boolean;
}>;

export type FriendWeekCard =
  | (FriendWeekRailFriend & Readonly<{ kind: 'active'; week: FriendWeekSummary }>)
  | (FriendWeekRailFriend & Readonly<{ kind: 'rested'; week: null }>);

export type FriendWeekRail = Readonly<{
  /** До понедельника 9:00 итогов ещё нет — ни ленты, ни пустой плашки. */
  open: boolean;
  /** Понедельник показываемой (прошлой) недели. */
  week: string;
  cards: readonly FriendWeekCard[];
}>;

export function buildFriendWeekRail(
  friends: readonly FriendWeekRailFriend[],
  pairs: Readonly<Record<string, FriendTogetherPairState | undefined>>,
  now: Date,
): FriendWeekRail {
  const todayKey = getLocalDayKey(now);
  const thisWeek = weekStartOf(todayKey);
  const week = addWeekDays(thisWeek, -7);
  const open = !(todayKey === thisWeek && now.getHours() < FRIEND_WEEK_RAIL_HOUR);
  if (!open) return { open, week, cards: [] };
  const lastWeekDays = weekDayKeys(week);
  const cards: FriendWeekCard[] = [];
  for (const friend of friends) {
    const pair = pairs[friend.uid];
    const record = pair?.week ?? null;
    const shown = friendWeekToShow(record, todayKey);
    if (shown && (shown.days > 0 || shown.lessons > 0)) {
      cards.push({ ...friend, kind: 'active', week: shown });
      continue;
    }
    if (!record) continue;
    const days = decodeActiveDays(pair?.friendActiveDays ?? null);
    const restedLastWeek = !lastWeekDays.some((day) => days.has(day));
    const activeBefore = [...days].some((day) => day < week);
    if (restedLastWeek && activeBefore) cards.push({ ...friend, kind: 'rested', week: null });
  }
  return { open, week, cards };
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
