/**
 * «Вместе» — чистые функции (без firebase-admin, без побочных эффектов).
 * Зеркалит §1–§3 спецификации docs/plans/2026-08-16-friends-together-implementation.ru.md.
 *
 * Держим это модулем БЕЗ импорта admin/firestore: friends_together.ts (callables)
 * оборачивает эти функции в транзакции; friends_together_core.test.ts гоняет их
 * напрямую без эмулятора — как league_chest/referral_roulette_policy делают со
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
export const MAX_FRIENDSHIP_LEVEL = FRIENDSHIP_LEVEL_THRESHOLDS.length;

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

/**
 * Бонус к XP в общий день, в процентах. С уровня 2. Не суммируется между друзьями —
 * xp_manager берёт максимум по всем парам (клиентская сторона, вне этого модуля).
 */
const BONUS_PERCENT_BY_LEVEL: readonly number[] = [0, 5, 5, 10, 15];

export function bonusPercentForLevel(level: number): number {
  const idx = Math.max(1, Math.min(MAX_FRIENDSHIP_LEVEL, Math.floor(level) || 1)) - 1;
  return BONUS_PERCENT_BY_LEVEL[idx] ?? 0;
}

/** Звёзды за веху уровня (клеймит каждый участник для себя). §0/§1: L2 5★ · L3 10★ · L4 20★ · L5 50★. */
const LEVEL_STAR_REWARDS: readonly number[] = [0, 5, 10, 20, 50];

export function starsForLevel(level: number): number {
  if (level < 2 || level > MAX_FRIENDSHIP_LEVEL) return 0;
  return LEVEL_STAR_REWARDS[level - 1] ?? 0;
}

/** Сумма всех ещё не забранных вех при скачке через несколько уровней. */
export function starsForLevelRange(claimedLevel: number, targetLevel: number): number {
  const from = Math.max(1, Math.min(MAX_FRIENDSHIP_LEVEL, Math.floor(claimedLevel) || 1));
  const to = Math.max(1, Math.min(MAX_FRIENDSHIP_LEVEL, Math.floor(targetLevel) || 1));
  if (to <= from) return 0;
  let total = 0;
  for (let level = from + 1; level <= to; level += 1) total += starsForLevel(level);
  return total;
}

/* ------------------------------ weekly chest ------------------------------- */

export const CHEST_TIERS: readonly number[] = [6000, 12000, 20000];
export const CHEST_CAP_PER_FRIEND = 2000;
export const CHEST_TOP_N = 10;
export const CHEST_MIN_PAIR_LEVEL = 2;
export const CHEST_MIN_MY_DAYS = 5;
export const CHEST_MIN_MY_WEEKLY_XP = 1000;
/** boost ×2 (реферальный старт, §1.4). */
export const CHEST_BOOST_MULTIPLIER = 2;

export type ChestFriendContribution = {
  friendUid: string;
  /** Уровень пары (this-user ↔ friendUid), с учётом bonusDays. */
  pairLevel: number;
  weeklyXp: number;
  /** true если boostUntilWeekKey пары ≥ текущая неделя. */
  boosted: boolean;
};

/**
 * Прогресс сундука недели: сумма по топ-N друзьям уровня ≥2, каждый капнут на
 * CHEST_CAP_PER_FRIEND, ×2 если пара ещё под реферальным бустом. §1.2/§0.
 */
export function weeklyChestProgress(
  friends: readonly ChestFriendContribution[],
  cap: number = CHEST_CAP_PER_FRIEND,
  topN: number = CHEST_TOP_N,
  minPairLevel: number = CHEST_MIN_PAIR_LEVEL,
  boostMultiplier: number = CHEST_BOOST_MULTIPLIER,
): number {
  const contributions = friends
    .filter((f) => f.pairLevel >= minPairLevel)
    .map((f) => {
      const capped = Math.min(Math.max(0, Math.floor(f.weeklyXp) || 0), cap);
      return f.boosted ? capped * Math.max(1, Math.floor(boostMultiplier) || 1) : capped;
    })
    .sort((a, b) => b - a)
    .slice(0, Math.max(0, Math.floor(topN)));
  return contributions.reduce((sum, v) => sum + v, 0);
}

/** Топ-N вкладчиков (для UI — «кто тянет сундук»), та же формула вклада, что и в сумме. */
export function weeklyChestTopContributors(
  friends: readonly ChestFriendContribution[],
  topN: number = CHEST_TOP_N,
  cap: number = CHEST_CAP_PER_FRIEND,
  minPairLevel: number = CHEST_MIN_PAIR_LEVEL,
  boostMultiplier: number = CHEST_BOOST_MULTIPLIER,
): { friendUid: string; contribution: number }[] {
  return friends
    .filter((f) => f.pairLevel >= minPairLevel)
    .map((f) => {
      const capped = Math.min(Math.max(0, Math.floor(f.weeklyXp) || 0), cap);
      return {
        friendUid: f.friendUid,
        contribution: f.boosted ? capped * Math.max(1, Math.floor(boostMultiplier) || 1) : capped,
      };
    })
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, Math.max(0, Math.floor(topN)));
}

/** Тир, достигнутый прогрессом (0 = ни один порог не взят). */
export function chestTierForProgress(progress: number, tiers: readonly number[] = CHEST_TIERS): number {
  let tier = 0;
  for (let i = 0; i < tiers.length; i += 1) {
    if (progress >= tiers[i]) tier = i + 1;
  }
  return tier;
}

export type ChestClaimBlockReason = 'own_days' | 'own_xp' | 'tier_zero';

/**
 * Условия клейма сундука (§1.2): мои активные дни за неделю ≥5 И мой weeklyXp ≥1000
 * И хотя бы тир I взят. Возвращает первую нарушенную причину или null (можно клеймить).
 */
export function chestClaimBlockReason(params: {
  myDaysThisWeek: number;
  myWeeklyXp: number;
  tier: number;
  minDays?: number;
  minXp?: number;
}): ChestClaimBlockReason | null {
  const minDays = params.minDays ?? CHEST_MIN_MY_DAYS;
  const minXp = params.minXp ?? CHEST_MIN_MY_WEEKLY_XP;
  if (params.myDaysThisWeek < minDays) return 'own_days';
  if (params.myWeeklyXp < minXp) return 'own_xp';
  if (params.tier <= 0) return 'tier_zero';
  return null;
}

/**
 * Множитель награды сундука по МОИМ активным дням за неделю (§0): 5→×1, 6→×1.25, 7→×1.5.
 * Дни < 5 не проходят chestClaimBlockReason раньше, так что не участвуют в этой шкале.
 */
export function chestRewardMultiplier(myDaysThisWeek: number): number {
  const d = Math.floor(myDaysThisWeek) || 0;
  if (d >= 7) return 1.5;
  if (d === 6) return 1.25;
  return 1;
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

/**
 * Клейм сундука недели — только в воскресенье ПО ЛОКАЛЬНОМУ времени вызывающего
 * (макет владельца: «Откроется в воскресенье»). tz — как в isQuietHours; нет tz → UTC+3.
 * зачем: иначе сундук открывали бы во вторник на пороге I и теряли II/III к концу недели.
 */
export const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;
export function isChestClaimDay(
  nowMs: number,
  tzOffsetMinutes: number | null | undefined,
  defaultTzOffsetMinutes: number = DEFAULT_NUDGE_TZ_OFFSET_MINUTES,
): boolean {
  const offset = typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)
    ? tzOffsetMinutes
    : defaultTzOffsetMinutes;
  const localMs = nowMs + offset * 60 * 1000;
  return new Date(localMs).getUTCDay() === 0;
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
  chestTiers: readonly number[];
  chestCapPerFriend: number;
  chestTopN: number;
  chestMinPairLevel: number;
  chestMinMyDays: number;
  chestMinMyWeeklyXp: number;
  chestBoostMultiplier: number;
  nudgeMaxPerFriendPerDay: number;
  nudgeMaxSenderPerDay: number;
  nudgeMaxReceiverPerDay: number;
  nudgeQuietStartHour: number;
  nudgeQuietEndHour: number;
  nudgeDefaultTzOffsetMinutes: number;
  /** Разрешить клейм сундука в любой день (тесты/админка). По умолчанию — только воскресенье. */
  chestClaimAnyDay: boolean;
};

export const FRIENDS_TOGETHER_DEFAULTS: FriendsTogetherConfig = {
  levelThresholds: FRIENDSHIP_LEVEL_THRESHOLDS,
  chestTiers: CHEST_TIERS,
  chestCapPerFriend: CHEST_CAP_PER_FRIEND,
  chestTopN: CHEST_TOP_N,
  chestMinPairLevel: CHEST_MIN_PAIR_LEVEL,
  chestMinMyDays: CHEST_MIN_MY_DAYS,
  chestMinMyWeeklyXp: CHEST_MIN_MY_WEEKLY_XP,
  chestBoostMultiplier: CHEST_BOOST_MULTIPLIER,
  nudgeMaxPerFriendPerDay: NUDGE_MAX_PER_FRIEND_PER_DAY,
  nudgeMaxSenderPerDay: NUDGE_MAX_SENT_PER_SENDER_PER_DAY,
  nudgeMaxReceiverPerDay: NUDGE_MAX_RECEIVED_PER_RECEIVER_PER_DAY,
  nudgeQuietStartHour: QUIET_HOURS_START,
  nudgeQuietEndHour: QUIET_HOURS_END,
  nudgeDefaultTzOffsetMinutes: DEFAULT_NUDGE_TZ_OFFSET_MINUTES,
  chestClaimAnyDay: false,
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
 * Оверлей remote_config/app.numbers поверх дефолтов. Ключи `friends_level_thresholds`,
 * `friends_chest_tiers`, `friends_chest_cap_per_friend`, `friends_chest_top_n`,
 * `friends_chest_min_days` и т.п. — см. §3.6 спецификации. НИКОГДА не бросает.
 */
export function friendsTogetherConfigFromNumbers(
  numbers: Record<string, unknown> | undefined,
): FriendsTogetherConfig {
  const n = numbers ?? {};
  const d = FRIENDS_TOGETHER_DEFAULTS;
  return {
    levelThresholds: clampNumberArray(n.friends_level_thresholds, d.levelThresholds, 0, 100000),
    chestTiers: clampNumberArray(n.friends_chest_tiers, d.chestTiers, 0, 10_000_000),
    chestCapPerFriend: clampInt(n.friends_chest_cap_per_friend, 0, 1_000_000, d.chestCapPerFriend),
    chestTopN: clampInt(n.friends_chest_top_n, 1, 100, d.chestTopN),
    chestMinPairLevel: clampInt(n.friends_chest_min_pair_level, 1, MAX_FRIENDSHIP_LEVEL, d.chestMinPairLevel),
    chestMinMyDays: clampInt(n.friends_chest_min_days, 0, 7, d.chestMinMyDays),
    chestMinMyWeeklyXp: clampInt(n.friends_chest_min_xp, 0, 1_000_000, d.chestMinMyWeeklyXp),
    chestBoostMultiplier: clampInt(n.friends_chest_boost_multiplier, 1, 10, d.chestBoostMultiplier),
    chestClaimAnyDay: n.friends_chest_claim_any_day === 1 || n.friends_chest_claim_any_day === true,
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
