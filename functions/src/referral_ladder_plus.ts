// Лесенка C: условия Plus за приглашённых друзей (решения владельца 29.10, кнопки «Несколько признаков»).
//
// зачем: монеты за друга даются сразу (по первому уроку, как раньше), а Plus 14 дней за каждых 3 друзей — только за
// друзей, которых трудно подделать скриптом. Признаки (все — без новых чтений базы):
//  (а) у друга пройден хотя бы один урок (серверный счётчик уроков, тот же источник, что у монет);
//  (б) другое устройство: хэш push-токена друга не совпадает с хэшем токена пригласившего. Токена нет у кого-то —
//      «неизвестно», друга засчитываем по (а)+(в) (решение координатора 29.10);
//  (в) Plus по лесенке не чаще 1 раза в 30 дней на пригласившего: заработанная ступень копится и выдаётся позже.
// Модуль чистый: решения по фактам на входе, без Firestore. Каждое решение — с причиной для журнала [LADDER-C].
import { createHash } from 'crypto';

export const LADDER_C_LOG = '[LADDER-C]';
export const LADDER_PLUS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Хэш push-токена Expo (сам токен в строках приглашений не храним). null — токена нет. */
export function ladderPushTokenHash(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const clean = token.trim();
  if (!clean) return null;
  return createHash('sha256').update(clean).digest('hex').slice(0, 32);
}

export type LadderPlusEligibility = Readonly<{
  status: 'eligible' | 'waiting' | 'not_eligible';
  // зачем (слово владельца 06.11): Plus за друга — один пройденный урок любого курса; прежние причины two_days_* / days_missing остаются в старых строках приглашений
  reason: 'same_device' | 'lesson_device_different' | 'lesson_device_unknown' | 'lesson_missing' | 'two_days_device_different' | 'two_days_device_unknown' | 'days_missing';
}>;

/**
 * Засчитывается ли друг для ступеней Plus.
 * not_eligible — навсегда (то же устройство); waiting — ждём первый пройденный урок; eligible — идёт в счёт Plus.
 * зачем (владелец 06.11: «для Plus другу нужно просто пройти 1 урок (обычный, старый курс); условие заниматься в новом курсе убрать»): условие — ≥1 пройденный урок, посчитанный сервером тем же источником, что монеты
 * (contestLessonsCompleted). Защита от накрутки та же, что у монет (серверный счётчик уроков) плюс проверка другого устройства.
 */
export function decideLadderPlusEligibility(input: Readonly<{
  refereeProgress: Readonly<Record<string, unknown>> | undefined;
  /** Пройденные уроки друга по серверному источнику монет (contestLessonsCompleted). */
  refereeLessonsCompleted: number;
  refereeTokenHash: string | null;
  refereeApplyTokenHash: string | null;
  referrerTokenHash: string | null;
}>): LadderPlusEligibility {
  const referrer = input.referrerTokenHash;
  if (referrer && (referrer === input.refereeTokenHash || referrer === input.refereeApplyTokenHash)) {
    return { status: 'not_eligible', reason: 'same_device' };
  }
  if (!(input.refereeLessonsCompleted >= 1)) return { status: 'waiting', reason: 'lesson_missing' };
  const known = Boolean(referrer && (input.refereeTokenHash || input.refereeApplyTokenHash));
  return { status: 'eligible', reason: known ? 'lesson_device_different' : 'lesson_device_unknown' };
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
