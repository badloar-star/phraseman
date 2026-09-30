// зачем (владелец 2026-09-30): «убедись что уведомление действительно отправляется».
// Пейвол обещает «Напомним за 2 дня до списания» — сторожим дату срабатывания:
// старт пробного + (N − 2) дней, где N приходит из магазина (не хардкод).
import {
  TRIAL_REMINDER_DAYS_BEFORE_CHARGE,
  canPromiseTrialReminder,
  computeTrialReminderFireAtMs,
  onboardingTrialReminderDelaySeconds,
  trialReminderDayNumber,
  trialReminderDelaySeconds,
} from '../app/trial_end_reminder_schedule';

const DAY_MS = 86_400_000;
const START = Date.UTC(2026, 8, 30, 12, 0, 0);

describe('trial end reminder schedule', () => {
  it('reminds exactly 2 days before the charge', () => {
    expect(TRIAL_REMINDER_DAYS_BEFORE_CHARGE).toBe(2);
  });

  it.each([3, 5, 12, 17, 30])('fires at start + (N − 2) days for a %i-day store trial', (days) => {
    expect(computeTrialReminderFireAtMs(START, days)).toBe(START + (days - 2) * DAY_MS);
    expect(trialReminderDayNumber(days)).toBe(days - 2);
  });

  it('turns the fire date into a timeInterval delay relative to now', () => {
    const now = START + 3_600_000; // час спустя после старта
    expect(trialReminderDelaySeconds(START, 12, now)).toBe(10 * 86_400 - 3_600);
  });

  it('never schedules sooner than one hour from now', () => {
    const now = START + 3 * DAY_MS; // напоминание 3-дневного пробного уже «в прошлом»
    expect(trialReminderDelaySeconds(START, 3, now)).toBe(3_600);
  });

  it.each([null, undefined, 0, 1, 2, 2.5, Number.NaN])('does not promise a reminder for trial=%p', (days) => {
    expect(canPromiseTrialReminder(days as number | null | undefined)).toBe(false);
    expect(computeTrialReminderFireAtMs(START, days as number | null | undefined)).toBeNull();
    expect(trialReminderDelaySeconds(START, days as number | null | undefined, START)).toBeNull();
  });

  it('rejects a broken start timestamp', () => {
    expect(computeTrialReminderFireAtMs(Number.NaN, 12)).toBeNull();
  });

  // Владелец 2026-09-30: «онбординг вообще не трогаем» — у онбординга прежний расчёт
  // «за сутки до конца, не раньше чем через час» (как в notifications.ts до правки).
  it.each([[3, 2 * 86_400], [12, 11 * 86_400], [17, 16 * 86_400], [1, 3_600]])(
    'onboarding keeps the legacy day-before delay for a %i-day trial',
    (days, seconds) => {
      expect(onboardingTrialReminderDelaySeconds(days)).toBe(seconds);
      expect(onboardingTrialReminderDelaySeconds(days)).toBe(Math.max(3600, Math.round((days - 1) * 86400)));
    },
  );
});
