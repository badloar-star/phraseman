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
  /** Версия ленты из ответа (story_feed_rev); нет — сервер ещё без версии, работает правило по времени. */
  feedRev?: number;
}>;

/** Разбор кэша из памяти телефона; повреждённое или чужой формы — null (тогда идём в сеть). */
export function parseAnnouncementsCache(raw: string | null): AnnouncementsCache | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AnnouncementsCache> | null;
    if (!value || typeof value !== 'object') return null;
    if (!Number.isFinite(value.fetchedAtMs) || !Number.isFinite(value.serverNowMs) || !Array.isArray(value.items)) return null;
    const feedRev = typeof value.feedRev === 'number' && Number.isFinite(value.feedRev) && value.feedRev > 0 ? Math.floor(value.feedRev) : undefined;
    return Object.freeze({ fetchedAtMs: value.fetchedAtMs as number, serverNowMs: value.serverNowMs as number, items: Object.freeze([...(value.items as unknown[])]), ...(feedRev ? { feedRev } : {}) });
  } catch (error) {
    // зачем: повреждённый кэш не ломает экран — идём в сеть, но причина остаётся в журнале
    console.warn('[STORY-ANNOUNCE] кэш: JSON не разобран', String(error));
    return null;
  }
}

export function serializeAnnouncementsCache(cache: AnnouncementsCache): string {
  return JSON.stringify({ fetchedAtMs: cache.fetchedAtMs, serverNowMs: cache.serverNowMs, items: cache.items, ...(cache.feedRev ? { feedRev: cache.feedRev } : {}) });
}

// ── Дешёвый путь по версии ленты (координатор 28.10) ────────────────────────────────────────────────────────────────
// зачем: remote_config/app и так читается на каждом холодном старте; сервер пишет туда numbers.story_feed_rev при публикации или
// снятии истории. Версия на телефоне та же — ленту не запрашиваем (0 чтений); другая — запрашиваем сразу. Тёплое возвращение
// конфиг не перечитывает, поэтому там — правило по времени (15 мин), чтобы история не ждала холодного старта днями.
// Версии нет (сервер не выложен, старая копия) — прежнее правило «при каждом входе/возврате, кроме повтора в пределах минуты».

/** Тёплое возвращение при совпавшей версии: ленту освежаем не чаще раза в 15 мин. */
export const ANNOUNCEMENTS_WARM_RETURN_REFRESH_MS = 15 * 60 * 1000;
/** Страховка: даже при той же версии лента перечитывается не реже раза в сутки. */
export const ANNOUNCEMENTS_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Сколько на входе ждать свежего конфига, прежде чем решить по времени (кэш на экране уже показан). */
export const ANNOUNCEMENTS_CONFIG_WAIT_MS = 8000;

export type AnnouncementFetchTrigger = 'entry' | 'config' | 'return' | 'entry_timeout';
export type AnnouncementFetchReason =
  | 'no_local_copy' | 'clock_back' | 'max_age' | 'no_local_rev' | 'no_remote_rev' | 'rev_changed' | 'same_rev'
  | 'warm_time_rule' | 'warm_recent' | 'entry_wait_config' | 'entry_timeout_time_rule';
export type AnnouncementFetchDecision = Readonly<{ fetch: boolean; wait?: boolean; reason: AnnouncementFetchReason; remoteRev: number; localRev: number; ageMs: number | null }>;

/** Версия ленты из сырого кэша remote_config (JSON numbers); 0 — поля нет или кэш не разобран. */
export function storyFeedRevFromConfigRaw(raw: string | null, key: string): number {
  if (!raw) return 0;
  try {
    const numbers = (JSON.parse(raw) as { numbers?: Record<string, unknown> } | null)?.numbers;
    const value = numbers ? numbers[key] : undefined;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch (error) {
    // зачем: битый кэш конфига — версии нет, работаем по времени; причина в журнале
    console.warn('[STORY-ANNOUNCE] [STORY-POST] версия ленты: кэш конфига не разобран', String(error));
    return 0;
  }
}

/**
 * Идти ли за лентой. entry — вход (ждём свежий конфиг, если есть версия копии), config — пришёл конфиг (решаем по версии),
 * return — тёплое возвращение (версия + 15 мин), entry_timeout — конфиг не пришёл за 8 с (правило минуты).
 */
export function decideAnnouncementFetch(input: Readonly<{
  trigger: AnnouncementFetchTrigger;
  remoteRev: number;
  local: Readonly<{ fetchedAtMs: number; feedRev?: number }> | null;
  nowMs: number;
}>): AnnouncementFetchDecision {
  const remoteRev = Number.isFinite(input.remoteRev) && input.remoteRev > 0 ? Math.floor(input.remoteRev) : 0;
  const localRev = input.local?.feedRev && input.local.feedRev > 0 ? input.local.feedRev : 0;
  const ageMs = input.local ? input.nowMs - input.local.fetchedAtMs : null;
  const base = { remoteRev, localRev, ageMs };
  if (!input.local || ageMs === null || !Number.isFinite(ageMs)) return { fetch: true, reason: 'no_local_copy', ...base };
  if (ageMs < 0) return { fetch: true, reason: 'clock_back', ...base };
  if (ageMs >= ANNOUNCEMENTS_MAX_AGE_MS) return { fetch: true, reason: 'max_age', ...base };
  // копия без версии (сервер ещё без версии) — прежнее правило минуты
  if (localRev === 0) return { fetch: announcementRefreshDue(input.local.fetchedAtMs, input.nowMs), reason: 'no_local_rev', ...base };
  if (remoteRev > 0 && remoteRev !== localRev) return { fetch: true, reason: 'rev_changed', ...base };
  if (input.trigger === 'entry') return { fetch: false, wait: true, reason: 'entry_wait_config', ...base };
  if (input.trigger === 'entry_timeout') return { fetch: announcementRefreshDue(input.local.fetchedAtMs, input.nowMs), reason: 'entry_timeout_time_rule', ...base };
  if (input.trigger === 'return') {
    const due = announcementRefreshDue(input.local.fetchedAtMs, input.nowMs, ANNOUNCEMENTS_WARM_RETURN_REFRESH_MS);
    return { fetch: due, reason: due ? 'warm_time_rule' : 'warm_recent', ...base };
  }
  // trigger === 'config'
  if (remoteRev === 0) return { fetch: announcementRefreshDue(input.local.fetchedAtMs, input.nowMs), reason: 'no_remote_rev', ...base };
  return { fetch: false, reason: 'same_rev', ...base };
}
