import type { Department } from './decision';

/**
 * Когда Джарвису можно писать владельцу (бриф в96, в97, в202).
 *
 * зачем вообще молчать: сообщение, пришедшее ночью из-за очереди уроков,
 * учит не читать сообщения вовсе. Тогда настоящая находка потеряется среди
 * шума — а именно ради неё всё и строилось.
 *
 * Модуль чистый: без Firestore и сети, чтобы правила тишины проверялись
 * тестами целиком.
 */

/** Начало тихих часов, UTC. 21:00 UTC = полночь по Киеву летом. */
export const QUIET_HOURS_START = 21;

/** Конец тихих часов, UTC. 6:00 UTC = 9 утра по Киеву. */
export const QUIET_HOURS_END = 6;

/** Больше этого за час — уже поток, а не уведомления. */
export const MAX_MESSAGES_PER_HOUR = 10;

/**
 * Департаменты, которые будят ночью.
 *
 * зачем именно эти два: за их находками стоит конкретный человек — тот, кто
 * заплатил и не получил доступ, и ребёнок, чья жалоба не разобрана. Остальное
 * подождёт до утра без потерь.
 */
const URGENT_DEPARTMENTS: readonly Department[] = ['payments', 'safety'];

export function isUrgentDepartment(department: string): boolean {
  return URGENT_DEPARTMENTS.includes(department as Department);
}

export type NotifySkipReason = 'nothing_to_say' | 'quiet_hours' | 'rate_limited';

export type NotifyVerdict =
  | { readonly send: true }
  | { readonly send: false; readonly reason: NotifySkipReason };

export interface ShouldNotifyNowInput {
  /** Департаменты, у которых есть что сказать. */
  readonly departments: readonly string[];
  readonly nowMs: number;
  /** Сколько сообщений уже ушло за последний час. */
  readonly sentInLastHour: number;
}

function isQuietHour(nowMs: number): boolean {
  const hour = new Date(nowMs).getUTCHours();
  // Окно пересекает полночь, поэтому проверка через ИЛИ, а не диапазоном.
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

export function shouldNotifyNow(input: ShouldNotifyNowInput): NotifyVerdict {
  if (input.departments.length === 0) return { send: false, reason: 'nothing_to_say' };

  const urgent = input.departments.some(isUrgentDepartment);

  // зачем срочное вне лимита: если платежи сыплются потоком, лимит замолчал бы
  // ровно тогда, когда сообщать важнее всего. Сам поток и есть сигнал.
  if (urgent) return { send: true };

  if (isQuietHour(input.nowMs)) return { send: false, reason: 'quiet_hours' };
  if (input.sentInLastHour >= MAX_MESSAGES_PER_HOUR) return { send: false, reason: 'rate_limited' };

  return { send: true };
}
