/**
 * «Вместе» — чистые функции (без firebase-admin, без побочных эффектов).
 * Зеркалит §1–§3 спецификации docs/plans/2026-08-16-friends-together-implementation.ru.md.
 *
 * Держим это модулем БЕЗ импорта admin/firestore: friends_together.ts (callables)
 * оборачивает эти функции в транзакции; friends_together_core.test.ts гоняет их
 * напрямую без эмулятора — как referral_roulette_policy делает со
 * своими чистыми частями.
 */

/* ------------------------------- active days ------------------------------ */

/**
 * Клиентский кодек `active_days_v1` (app/hall_of_fame_utils.ts:updateStreakOnActivity).
 * anchor — локальная дата устройства (YYYY-MM-DD) для bits[0]; bits[i] — активность
 * в день (anchor − i дней), '1' = был активен. Длина ограничена MAX_ACTIVE_DAYS_WINDOW —
 * дальше в прошлое дни вместе не считаем (см. §1: «окно 120 дней»).
 */
export type ActiveDaysState = {
  anchor: string;
  bits: string;
};

export const MAX_ACTIVE_DAYS_WINDOW = 120;

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

/** Сдвигает YYYY-MM-DD на `deltaDays` (может быть отрицательным). Чистая функция дат UTC. */
export function shiftDayKey(dayKey: string, deltaDays: number): string {
  const ms = Date.parse(`${dayKey}T00:00:00.000Z`) + deltaDays * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Разворачивает кодек в множество дат (YYYY-MM-DD), из которых стоял бит '1'.
 * Невалидный/пустой вход → пустое множество (мягкий отказ — не бросаем: профиль
 * друга может ещё не иметь active_days_v1 вовсе).
 */
export function decodeActiveDays(state: ActiveDaysState | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!state || !isValidDayKey(state.anchor) || typeof state.bits !== 'string') return out;
  const bits = state.bits.slice(0, MAX_ACTIVE_DAYS_WINDOW);
  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] === '1') out.add(shiftDayKey(state.anchor, -i));
  }
  return out;
}

/**
 * Собирает кодек из множества дат относительно anchor (для тестов/мержа на клиенте;
 * сервер это не пишет — active_days_v1 server-side read-only, пишет клиент).
 */
export function encodeActiveDays(anchor: string, dates: ReadonlySet<string> | readonly string[]): ActiveDaysState {
  const set = dates instanceof Set ? dates : new Set(dates);
  let bits = '';
  for (let i = 0; i < MAX_ACTIVE_DAYS_WINDOW; i += 1) {
    bits += set.has(shiftDayKey(anchor, -i)) ? '1' : '0';
  }
  // Обрезаем хвостовые нули — хранить их бессмысленно, decode трактует отсутствие как '0'.
  bits = bits.replace(/0+$/, '');
  return { anchor, bits };
}

/** Есть ли у ОБОИХ активность в конкретный календарный день. */
export function hasCommonDay(a: ActiveDaysState | null | undefined, b: ActiveDaysState | null | undefined, dayKey: string): boolean {
  if (!isValidDayKey(dayKey)) return false;
  return decodeActiveDays(a).has(dayKey) && decodeActiveDays(b).has(dayKey);
}

/**
 * «Дней вместе» = |пересечение дат активности A и B| + bonusDays (реферальный старт,
 * §1.4: пара стартует с bonusDays=3). Даты вне окна MAX_ACTIVE_DAYS_WINDOW каждого
 * из двух кодеков уже отсеяны в decodeActiveDays — разные anchor не проблема, множества
 * сравниваются по абсолютным датам, а не по индексам битов.
 */
export function daysTogether(
  a: ActiveDaysState | null | undefined,
  b: ActiveDaysState | null | undefined,
  bonusDays = 0,
): number {
  const setA = decodeActiveDays(a);
  const setB = decodeActiveDays(b);
  let common = 0;
  for (const day of setA) if (setB.has(day)) common += 1;
  return common + Math.max(0, Math.floor(bonusDays) || 0);
}

/* ---------------------------------- levels --------------------------------- */

/** Пороги дней-вместе для уровней 1..5 (индекс = level-1). §1: Знакомые/Приятели/Друзья/Близкие/Лучшие. */
export const FRIENDSHIP_LEVEL_THRESHOLDS: readonly number[] = [0, 3, 10, 30, 100];

/** Уровень дружбы по числу дней вместе (чистая функция, конфигурируемые пороги). */
export function levelForDays(days: number, thresholds: readonly number[] = FRIENDSHIP_LEVEL_THRESHOLDS): number {
  const d = Math.max(0, Math.floor(days) || 0);
  let level = 1;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (d >= thresholds[i]) level = i + 1;
  }
  return level;
}

/** Порог следующего уровня; null на максимуме — клиенту нечего показывать как «до следующего». */
export function nextThreshold(days: number, thresholds: readonly number[] = FRIENDSHIP_LEVEL_THRESHOLDS): number | null {
  const level = levelForDays(days, thresholds);
  return level >= thresholds.length ? null : (thresholds[level] ?? null);
}

/* ------------------------------- quiet hours -------------------------------- */

/**
 * Тихие часы 22:00–09:00 ПО ЛОКАЛЬНОМУ времени получателя (§1.3). `tzOffsetMinutes` —
 * тот же знак, что `getTimezoneOffset()*-1` на клиенте (минуты К ВОСТОКУ от UTC,
 * то есть Москва = +180). Нет tz → считаем по UTC+3 (дефолт спецификации).
 */
export const DEFAULT_NUDGE_TZ_OFFSET_MINUTES = 3 * 60;
export const QUIET_HOURS_START = 22;
export const QUIET_HOURS_END = 9;

export function isQuietHours(
  nowMs: number,
  tzOffsetMinutes: number | null | undefined,
  startHour: number = QUIET_HOURS_START,
  endHour: number = QUIET_HOURS_END,
  defaultTzOffsetMinutes: number = DEFAULT_NUDGE_TZ_OFFSET_MINUTES,
): boolean {
  const offset = typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
    ? tzOffsetMinutes
    : defaultTzOffsetMinutes;
  const localMs = nowMs + offset * 60 * 1000;
  const localHour = new Date(localMs).getUTCHours();
  // Окно переходит через полночь: 22:00 включительно .. 09:00 исключительно.
  return localHour >= startHour || localHour < endHour;
}

/* -------------------------------- nudge limits ------------------------------- */

export const NUDGE_MAX_PER_FRIEND_PER_DAY = 1;
export const NUDGE_MAX_SENT_PER_SENDER_PER_DAY = 5;
export const NUDGE_MAX_RECEIVED_PER_RECEIVER_PER_DAY = 3;

export type NudgeLimitBlockReason = 'daily_limit' | 'sender_limit' | 'receiver_limit';

/**
 * Проверка лимитов зова (§1.3): 1/день на конкретного друга, ≤5/день у отправителя,
 * ≤3/день у получателя. Первая нарушенная — причина; null — можно слать.
 * `sentToThisFriendToday` уже учитывает только сегодняшний dayKey (счёт — на вызывающей
 * стороне, дока friend_nudges/{dayKey} за сегодня).
 */
export function nudgeLimitBlockReason(params: {
  sentToThisFriendToday: boolean;
  senderSentCountToday: number;
  receiverReceivedCountToday: number;
  maxPerFriend?: number;
  maxSender?: number;
  maxReceiver?: number;
}): NudgeLimitBlockReason | null {
  const maxPerFriend = params.maxPerFriend ?? NUDGE_MAX_PER_FRIEND_PER_DAY;
  const maxSender = params.maxSender ?? NUDGE_MAX_SENT_PER_SENDER_PER_DAY;
  const maxReceiver = params.maxReceiver ?? NUDGE_MAX_RECEIVED_PER_RECEIVER_PER_DAY;
  if (params.sentToThisFriendToday && maxPerFriend <= 1) return 'daily_limit';
  if (params.senderSentCountToday >= maxSender) return 'sender_limit';
  if (params.receiverReceivedCountToday >= maxReceiver) return 'receiver_limit';
  return null;
}

/* ------------------------------------ config -------------------------------- */

/**
 * Конфигурируемые ручки из remote_config/app.numbers (ключи `friends_*`), с дефолтами
 * из этого файла. Денежная математика: отсутствие/мусор по ключу → дефолт, никогда throw.
 */
export type FriendsTogetherConfig = {
  levelThresholds: readonly number[];
  nudgeMaxPerFriendPerDay: number;
  nudgeMaxSenderPerDay: number;
  nudgeMaxReceiverPerDay: number;
  nudgeQuietStartHour: number;
  nudgeQuietEndHour: number;
  nudgeDefaultTzOffsetMinutes: number;
};

export const FRIENDS_TOGETHER_DEFAULTS: FriendsTogetherConfig = {
  levelThresholds: FRIENDSHIP_LEVEL_THRESHOLDS,
  nudgeMaxPerFriendPerDay: NUDGE_MAX_PER_FRIEND_PER_DAY,
  nudgeMaxSenderPerDay: NUDGE_MAX_SENT_PER_SENDER_PER_DAY,
  nudgeMaxReceiverPerDay: NUDGE_MAX_RECEIVED_PER_RECEIVER_PER_DAY,
  nudgeQuietStartHour: QUIET_HOURS_START,
  nudgeQuietEndHour: QUIET_HOURS_END,
  nudgeDefaultTzOffsetMinutes: DEFAULT_NUDGE_TZ_OFFSET_MINUTES,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampNumberArray(value: unknown, fallback: readonly number[], min: number, max: number): readonly number[] {
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback;
  const out = value.map((v) => clampInt(v, min, max, NaN));
  if (out.some((n) => Number.isNaN(n))) return fallback;
  for (let i = 1; i < out.length; i += 1) if (out[i] < out[i - 1]) return fallback;
  return out;
}

/**
 * Оверлей remote_config/app.numbers поверх дефолтов. НИКОГДА не бросает.
 */
export function friendsTogetherConfigFromNumbers(
  numbers: Record<string, unknown> | undefined,
): FriendsTogetherConfig {
  const n = numbers ?? {};
  const d = FRIENDS_TOGETHER_DEFAULTS;
  return {
    levelThresholds: clampNumberArray(n.friends_level_thresholds, d.levelThresholds, 0, 100000),
    nudgeMaxPerFriendPerDay: clampInt(n.friends_nudge_max_per_friend_day, 0, 100, d.nudgeMaxPerFriendPerDay),
    nudgeMaxSenderPerDay: clampInt(n.friends_nudge_max_sender_day, 0, 1000, d.nudgeMaxSenderPerDay),
    nudgeMaxReceiverPerDay: clampInt(n.friends_nudge_max_receiver_day, 0, 1000, d.nudgeMaxReceiverPerDay),
    nudgeQuietStartHour: clampInt(n.friends_nudge_quiet_start_hour, 0, 23, d.nudgeQuietStartHour),
    nudgeQuietEndHour: clampInt(n.friends_nudge_quiet_end_hour, 0, 23, d.nudgeQuietEndHour),
    nudgeDefaultTzOffsetMinutes: clampInt(
      n.friends_nudge_default_tz_offset_minutes, -14 * 60, 14 * 60, d.nudgeDefaultTzOffsetMinutes,
    ),
  };
}

/* ------------------------------- pair streak ------------------------------- */

/**
 * «Серия вдвоём» (идея 1, решение владельца 21.10; клиентский двойник — app/friends_together/pair_streak.ts).
 * Подряд дни, когда активны оба, по день-ориентир (если он общий) или по вчера относительно него.
 * зачем: пуш «Позвать» говорит о серии пары, если она есть; считаем из active_days_v1, которые friendsNudge
 * и так читает в транзакции, — новых чтений нет.
 */
export function pairStreakDays(
  a: ActiveDaysState | null | undefined,
  b: ActiveDaysState | null | undefined,
  referenceDayKey: string,
): number {
  if (!isValidDayKey(referenceDayKey)) return 0;
  const setA = decodeActiveDays(a);
  const setB = decodeActiveDays(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const both = (dayKey: string) => setA.has(dayKey) && setB.has(dayKey);
  let day = both(referenceDayKey) ? referenceDayKey : shiftDayKey(referenceDayKey, -1);
  let count = 0;
  while (count < MAX_ACTIVE_DAYS_WINDOW && both(day)) {
    count += 1;
    day = shiftDayKey(day, -1);
  }
  return count;
}

/**
 * День-ориентир для серии: локальный день отправителя (anchor его active_days_v1), если он не старше вчерашнего UTC,
 * иначе сегодняшний UTC. зачем: active_days_v1 пишется по локальной дате телефона — у человека в UTC+3 после 21:00
 * UTC уже «завтра», и серия по чистому UTC теряла бы сегодняшний общий день.
 */
export function pairStreakReferenceDay(senderDays: ActiveDaysState | null | undefined, nowMs: number): string {
  const utcToday = new Date(nowMs).toISOString().slice(0, 10);
  const anchor = senderDays && isValidDayKey(senderDays.anchor) ? senderDays.anchor : '';
  if (anchor && anchor >= shiftDayKey(utcToday, -1) && anchor <= shiftDayKey(utcToday, 1)) return anchor > utcToday ? anchor : utcToday;
  return utcToday;
}

/** Серия от двух дней — уже «серия вдвоём» в тексте пуша (один общий день — ещё обычный зов). */
export const PAIR_STREAK_PUSH_MIN = 2;

function ruDaysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

/** Текст пуша «Позвать»: с серией вдвоём — про огонь пары, без серии — прежний зов. */
export function friendNudgePushCopy(senderName: string, pairStreak: number): { title: string; body: string } {
  const name = String(senderName || '').trim() || 'Friend';
  const streak = Number.isFinite(pairStreak) ? Math.max(0, Math.floor(pairStreak)) : 0;
  if (streak >= PAIR_STREAK_PUSH_MIN) {
    return {
      title: `${name}: серия вдвоём ждёт`,
      body: `${streak} ${ruDaysWord(streak)} подряд. Одно маленькое занятие — и огонь не погаснет.`,
    };
  }
  return { title: `${name}: пять минут практики?`, body: 'Одно маленькое занятие.' };
}
