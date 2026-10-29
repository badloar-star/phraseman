// Лесенка C: условия Plus за приглашённых друзей (решения владельца 29.10, кнопки «Несколько признаков»).
//
// зачем: монеты за друга даются сразу (по первому уроку, как раньше), а Plus 14 дней за каждых 3 друзей — только за
// друзей, которых трудно подделать скриптом. Признаки (все — без новых чтений базы):
//  (а) итоги занятий Learning V2 в 2 разных UTC-дня по СЕРВЕРНОМУ времени приёма итога (lv2_srv_day1/day2 пишет только
//      submitLearningV2CourseSessionCompletedV1, клиент эти ключи писать не может — firestore.rules);
//  (б) другое устройство: хэш push-токена друга не совпадает с хэшем токена пригласившего. Токена нет у кого-то —
//      «неизвестно», друга засчитываем по (а)+(в) (решение координатора 29.10);
//  (в) Plus по лесенке не чаще 1 раза в 30 дней на пригласившего: заработанная ступень копится и выдаётся позже.
// Старые версии приложения меток дней не получают: метка ставится только по итогу с головой курса из списка
// LADDER_TRUSTED_COURSE_HEADS_V1 (голова встроенного курса 2.0.3-OTA1 и новее). Это отсечение версий, не защита от обмана.
// Модуль чистый: решения по фактам на входе, без Firestore. Каждое решение — с причиной для журнала [LADDER-C].
import { createHash } from 'crypto';

export const LADDER_C_LOG = '[LADDER-C]';
export const LADDER_SERVER_DAY1_KEY = 'lv2_srv_day1';
export const LADDER_SERVER_DAY2_KEY = 'lv2_srv_day2';
export const LADDER_PLUS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Головы встроенного курса (activeHeadFingerprint итога занятия), с которых засчитываются дни для Plus.
 * зачем: голова считается из отпечатков всех занятий курса (factory_native_catalog_v1.ts), пересборка курса №2
 * (29.10) поменяла все 1792 → у 2.0.3-OTA1 голова новая, у старых сборок — старая.
 * ПРАВИЛО: новую голову добавлять, старые НЕ удалять (люди с прошлыми обновлениями остаются «новой версией»).
 * Сторож tests/referral_ladder_course_heads_guard.test.ts ломает сборку, если голова курса в репозитории не в списке.
 * Порядок выкладки: голова должна быть на сервере ДО публикации OTA с ней (проверка в scripts/ota_final_check.sh).
 */
export const LADDER_TRUSTED_COURSE_HEADS_V1: Readonly<Record<'en' | 'es', readonly string[]>> = Object.freeze({
  // 2.0.3-OTA1 (HEAD 526bc42ea, курс №2 после пересборки 29.10)
  en: Object.freeze([
    '67341e0e2d2b8bf8cd240b10d384d6493eff91ce2f673400b16bc4b230fc8077',
    // правка «хвоста после ;» в l01/s07, l01/s09 (Learning V2, 29.10) — финальный курс 2.0.3-OTA1
    'a024e5af4ebaf24156309515caaa319e36fff0881440bd47d9a94ec52fc5c424',
  ]),
  es: Object.freeze([
    'e44d06caf8bcfb23c5a271d808124b6b7a4dfcb1e5c067a9a135ad304eb982db',
    // пересборка испанского 29.10 (Learning V2: 364 занятия от c1b650542)
    '3b8276c101d84e146c1b5368bbcfb42021e8b61cc72daa675b79b2ef2bab7734',
  ]),
});

export function isTrustedLadderCourseHead(targetLanguage: unknown, head: unknown): boolean {
  if (targetLanguage !== 'en' && targetLanguage !== 'es') return false;
  return typeof head === 'string' && LADDER_TRUSTED_COURSE_HEADS_V1[targetLanguage].includes(head);
}

/** Номер UTC-дня (целое число дней от 1970-01-01). Хранится строкой: progress — карта строк. */
export function utcDayNumber(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

function readDay(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export type LadderServerDayDecision = Readonly<{
  patch: Readonly<Record<string, string>> | null;
  reason: 'untrusted_head' | 'day1_set' | 'day2_set' | 'same_day' | 'already_two_days';
  day: number;
}>;

/**
 * Какую метку дня поставить при НОВОМ итоге занятия (вызывать только при создании записи итога, не при повторе).
 * Возвращает патч progress или null с причиной — без чтений и без записи.
 */
export function ladderServerDayPatch(input: Readonly<{
  progress: Readonly<Record<string, unknown>> | undefined;
  nowMs: number;
  targetLanguage: unknown;
  activeHeadFingerprint: unknown;
}>): LadderServerDayDecision {
  const day = utcDayNumber(input.nowMs);
  if (!isTrustedLadderCourseHead(input.targetLanguage, input.activeHeadFingerprint)) {
    return { patch: null, reason: 'untrusted_head', day };
  }
  const day1 = readDay(input.progress?.[LADDER_SERVER_DAY1_KEY]);
  const day2 = readDay(input.progress?.[LADDER_SERVER_DAY2_KEY]);
  if (day1 === null) return { patch: { [LADDER_SERVER_DAY1_KEY]: String(day) }, reason: 'day1_set', day };
  if (day2 !== null) return { patch: null, reason: 'already_two_days', day };
  if (day === day1) return { patch: null, reason: 'same_day', day };
  return { patch: { [LADDER_SERVER_DAY2_KEY]: String(day) }, reason: 'day2_set', day };
}

/** Есть ли у друга итоги в 2 разных серверных дня (после склейки аккаунтов значения — max по ключу, см. auth_merge). */
export function hasTwoServerDays(progress: Readonly<Record<string, unknown>> | undefined): boolean {
  const day1 = readDay(progress?.[LADDER_SERVER_DAY1_KEY]);
  const day2 = readDay(progress?.[LADDER_SERVER_DAY2_KEY]);
  return day1 !== null && day2 !== null && day1 !== day2;
}

/** Переход «второго дня не было → появился» (триггер записи профиля, без чтений). */
export function ladderSecondDayTransition(
  before: Readonly<Record<string, unknown>> | undefined,
  after: Readonly<Record<string, unknown>> | undefined,
): boolean {
  return hasTwoServerDays(after) && !hasTwoServerDays(before);
}

/** Хэш push-токена Expo (сам токен в строках приглашений не храним). null — токена нет. */
export function ladderPushTokenHash(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const clean = token.trim();
  if (!clean) return null;
  return createHash('sha256').update(clean).digest('hex').slice(0, 32);
}

export type LadderPlusEligibility = Readonly<{
  status: 'eligible' | 'waiting' | 'not_eligible';
  reason: 'same_device' | 'two_days_device_different' | 'two_days_device_unknown' | 'days_missing';
}>;

/**
 * Засчитывается ли друг для ступеней Plus.
 * not_eligible — навсегда (то же устройство); waiting — ждём второй день; eligible — идёт в счёт Plus.
 */
export function decideLadderPlusEligibility(input: Readonly<{
  refereeProgress: Readonly<Record<string, unknown>> | undefined;
  refereeTokenHash: string | null;
  refereeApplyTokenHash: string | null;
  referrerTokenHash: string | null;
}>): LadderPlusEligibility {
  const referrer = input.referrerTokenHash;
  if (referrer && (referrer === input.refereeTokenHash || referrer === input.refereeApplyTokenHash)) {
    return { status: 'not_eligible', reason: 'same_device' };
  }
  if (!hasTwoServerDays(input.refereeProgress)) return { status: 'waiting', reason: 'days_missing' };
  const known = Boolean(referrer && (input.refereeTokenHash || input.refereeApplyTokenHash));
  return { status: 'eligible', reason: known ? 'two_days_device_different' : 'two_days_device_unknown' };
}

export type LadderPlusClaim = Readonly<{
  claimTier: number | null;
  reason: 'claim' | 'cooldown' | 'nothing_due';
  dueTiers: number;
  cooldownLeftMs: number;
}>;

/**
 * Можно ли выдать следующую ступень Plus сейчас. Ступень = каждые 3 друга, засчитанных для Plus.
 * Не чаще 1 раза в 30 дней: при кулдауне ступень не теряется — её выдаст следующий повтор после срока.
 */
export function ladderPlusClaim(input: Readonly<{
  plusEligibleTotal: number;
  plusTierClaimed: number;
  lastLadderPlusAtMs: number;
  nowMs: number;
  friendsPerTier: number;
}>): LadderPlusClaim {
  const dueTiers = Math.floor(Math.max(0, input.plusEligibleTotal) / Math.max(1, input.friendsPerTier));
  if (dueTiers <= input.plusTierClaimed) return { claimTier: null, reason: 'nothing_due', dueTiers, cooldownLeftMs: 0 };
  const sinceLast = input.nowMs - Math.max(0, input.lastLadderPlusAtMs);
  if (input.lastLadderPlusAtMs > 0 && sinceLast < LADDER_PLUS_COOLDOWN_MS) {
    return { claimTier: null, reason: 'cooldown', dueTiers, cooldownLeftMs: LADDER_PLUS_COOLDOWN_MS - sinceLast };
  }
  return { claimTier: input.plusTierClaimed + 1, reason: 'claim', dueTiers, cooldownLeftMs: 0 };
}
