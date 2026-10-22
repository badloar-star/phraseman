/**
 * «Кто дал пять» на экране «Моя неделя» (идея 6, макет friends-full.html #week `wMine`) — из уже загруженных уведомлений колокольчика.
 *
 * зачем (Firebase-экономия, закон владельца «телефон решает»): пятёрки приходят уведомлением activity_like и лежат в кэше центра
 * уведомлений (readCachedUserNotifications) — отдельного запроса нет, 0 новых чтений. Берём пятёрки этой недели (с понедельника
 * 00:00 по часам телефона), по одной на друга, самые ранние первыми.
 */
import type { UserNotification } from '../user_notifications';

export type FriendWeekFive = Readonly<{ uid: string; name: string; atMs: number }>;

/** Понедельник текущей недели, 00:00 по местному времени. */
export function weekStartMs(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
}

export function fivesThisWeek(rows: readonly Pick<UserNotification, 'type' | 'fromUid' | 'fromName' | 'createdAt'>[], now: Date): readonly FriendWeekFive[] {
  const from = weekStartMs(now);
  // часы телефона и сервера расходятся — запас минута
  const to = now.getTime() + 60_000;
  const seen = new Set<string>();
  const out: FriendWeekFive[] = [];
  for (const row of [...rows].sort((a, b) => a.createdAt - b.createdAt)) {
    if (row.type !== 'activity_like' || !row.fromUid || row.createdAt < from || row.createdAt > to || seen.has(row.fromUid)) continue;
    seen.add(row.fromUid);
    out.push({ uid: row.fromUid, name: (row.fromName || '').trim(), atMs: row.createdAt });
  }
  return out;
}

/** Обе первые пятёрки — сегодня (тогда показываем время, как в макете «сегодня в 9:12 и 9:40»). */
export function bothFivesToday(fives: readonly FriendWeekFive[], now: Date): boolean {
  if (fives.length < 2) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return fives[0]!.atMs >= today && fives[1]!.atMs >= today;
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
