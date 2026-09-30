// ════════════════════════════════════════════════════════════════════════════
// trial_end_reminder_schedule.ts — когда срабатывает напоминание о конце пробного.
//
// зачем (владелец 2026-09-30): пейвол Plus обещает «Напомним за 2 дня до
// списания». Это обещание обязано быть правдой, поэтому дата считается здесь,
// одной чистой функцией, и её сторожит юнит-тест:
//   срабатывание = старт пробного + (N − 2) дней, где N — длительность из магазина.
// Длительность НИКОГДА не хардкодится: N приходит из пакета RevenueCat
// (paywall_trial_info.getTrialInfo). Если пробный короче 3 дней, «за 2 дня»
// физически невозможно — напоминание не ставим (и пейвол его не обещает).
//
// Модуль без React Native: его можно гонять в node --test.
// ════════════════════════════════════════════════════════════════════════════

/** За сколько дней до списания напоминаем. Совпадает с текстом пейвола. */
export const TRIAL_REMINDER_DAYS_BEFORE_CHARGE = 2;

const DAY_MS = 86_400_000;
/** Не ставим напоминание «через 0 секунд»: минимум час от текущего момента. */
const MIN_DELAY_SECONDS = 3_600;

/** Можно ли вообще честно пообещать напоминание за 2 дня при таком пробном. */
export function canPromiseTrialReminder(trialDays: number | null | undefined): trialDays is number {
  return typeof trialDays === 'number'
    && Number.isInteger(trialDays)
    && trialDays > TRIAL_REMINDER_DAYS_BEFORE_CHARGE;
}

/** Номер дня пробного, в который приходит напоминание (для ленты «День N−2»). */
export function trialReminderDayNumber(trialDays: number): number | null {
  return canPromiseTrialReminder(trialDays) ? trialDays - TRIAL_REMINDER_DAYS_BEFORE_CHARGE : null;
}

/** Момент срабатывания: старт + (N − 2) дней. null — напоминание невозможно. */
export function computeTrialReminderFireAtMs(trialStartMs: number, trialDays: number | null | undefined): number | null {
  if (!Number.isFinite(trialStartMs) || !canPromiseTrialReminder(trialDays)) return null;
  return trialStartMs + (trialDays - TRIAL_REMINDER_DAYS_BEFORE_CHARGE) * DAY_MS;
}

/** Задержка для timeInterval-триггера. null — напоминание невозможно. */
export function trialReminderDelaySeconds(
  trialStartMs: number,
  trialDays: number | null | undefined,
  nowMs: number,
): number | null {
  const fireAtMs = computeTrialReminderFireAtMs(trialStartMs, trialDays);
  if (fireAtMs === null || !Number.isFinite(nowMs)) return null;
  return Math.max(MIN_DELAY_SECONDS, Math.round((fireAtMs - nowMs) / 1000));
}

/* expo-router: не регистрировать файл как экран. */
export default function __TrialEndReminderScheduleRouteShim() {
  return null;
}
