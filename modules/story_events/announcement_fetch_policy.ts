// announcement_fetch_policy.ts — когда ходить за объявлениями администратора и как хранить ответ на телефоне.
// зачем (Ревизор 24.10, правило Firebase-экономии): хук опрашивал storyAnnouncementsGet каждые 60 с и на каждое возвращение в приложение — у всех пользователей, без кэша.
// Теперь: ответ сохраняется на телефоне (показ с первого кадра, stale-while-revalidate), в сеть идём только при входе и при возвращении в приложение
// (с 28.10 — каждый раз, кроме повтора в пределах минуты; раньше — раз в 6 ч); таймера-опросника нет. Истечение объявлений считается локально
// (по времени сервера из ответа), сетевой запрос для этого не нужен.

/**
 * Сколько не ходить в сеть повторно после успешного ответа: 1 минута — только защита от быстрых переключений между приложениями.
 * зачем (владелец 28.10: «истории при отправке должны уходить СРАЗУ, а не через много часов»): прежние 6 часов (решение 24.10) значили, что
 * опубликованная история доходила до человека до 6 ч спустя — даже если он заново открывал приложение. Теперь история приходит при следующем
 * входе или возвращении в приложение. Опросника по-прежнему нет: запрос только на вход/возврат, 1 документ ленты на запрос
 * (story_announcement_feed/current, до 20 историй разом). Смета: ≈ число открытий приложения в день × 1 чтение + 1 вызов функции.
 */
export const ANNOUNCEMENTS_REFRESH_TTL_MS = 60 * 1000;

/** Нужно ли сходить за свежим ответом: кэша нет, часы ушли назад или прошло не меньше TTL. */
export function announcementRefreshDue(lastFetchedAtMs: number | null, nowMs: number, ttlMs: number = ANNOUNCEMENTS_REFRESH_TTL_MS): boolean {
  if (lastFetchedAtMs === null || !Number.isFinite(lastFetchedAtMs)) return true;
  const age = nowMs - lastFetchedAtMs;
  return age < 0 || age >= ttlMs;
}

export type AnnouncementsCache = Readonly<{
  /** Когда (по часам телефона) ответ получен. */
  fetchedAtMs: number;
  /** Время сервера из ответа — от него считается сдвиг часов и истечение. */
  serverNowMs: number;
  items: readonly unknown[];
}>;

/** Разбор кэша из памяти телефона; повреждённое или чужой формы — null (тогда идём в сеть). */
export function parseAnnouncementsCache(raw: string | null): AnnouncementsCache | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AnnouncementsCache> | null;
    if (!value || typeof value !== 'object') return null;
    if (!Number.isFinite(value.fetchedAtMs) || !Number.isFinite(value.serverNowMs) || !Array.isArray(value.items)) return null;
    return Object.freeze({ fetchedAtMs: value.fetchedAtMs as number, serverNowMs: value.serverNowMs as number, items: Object.freeze([...(value.items as unknown[])]) });
  } catch (error) {
    // зачем: повреждённый кэш не ломает экран — идём в сеть, но причина остаётся в журнале
    console.warn('[STORY-ANNOUNCE] кэш: JSON не разобран', String(error));
    return null;
  }
}

export function serializeAnnouncementsCache(cache: AnnouncementsCache): string {
  return JSON.stringify({ fetchedAtMs: cache.fetchedAtMs, serverNowMs: cache.serverNowMs, items: cache.items });
}
