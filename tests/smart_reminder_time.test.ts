// зачем (Этап 1 умного напоминания, план SMART_REMINDER_TIME_DESIGN): расчёт времени — чистая функция; проверяем граничные случаи.
import {
  applySmartReminderHysteresis,
  computeSmartReminderTime,
  formatReminderMinute,
  SMART_REMINDER,
  type SmartReminderEvent,
} from '../app/smart_reminder_time';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const MSK = 180;

/** Событие «daysAgo дней назад в HH:MM по местному времени» для пояса offset. */
function ev(daysAgo: number, hhmm: string, kind: SmartReminderEvent['kind'] = 'lesson', offset = MSK): SmartReminderEvent {
  const [h, m] = hhmm.split(':').map(Number);
  const minute = h * 60 + m;
  const localMidnight = Math.floor((NOW + offset * 60_000) / DAY) * DAY - daysAgo * DAY;
  return { atMs: localMidnight + minute * 60_000 - offset * 60_000, minute, tzOffsetMin: offset, kind };
}

describe('computeSmartReminderTime', () => {
  it('вечерний человек 18:10–18:50 → пик ~18:30 → напоминание 17:45', () => {
    const h = ['18:10', '18:40', '18:25', '18:50', '18:30', '18:20', '18:35'].map((t, i) => ev(i + 1, t));
    const d = computeSmartReminderTime(h, NOW, MSK);
    expect(d.source).toBe('smart');
    expect(formatReminderMinute(d.minute)).toBe('17:45');
    expect(d.clamp).toBe('none');
  });

  it('мало данных (< 5 разных дней) → фолбэк 20:00', () => {
    const h = [ev(1, '18:00'), ev(1, '18:10'), ev(2, '18:00'), ev(3, '18:00'), ev(3, '18:20'), ev(4, '18:05'), ev(4, '18:15')];
    const d = computeSmartReminderTime(h, NOW, MSK);
    expect(d).toMatchObject({ source: 'fallback', reason: 'insufficient_data', minute: 20 * 60 });
    expect(formatReminderMinute(d.minute)).toBe('20:00');
  });

  it('утренний человек (пик до 09:45) → фолбэк, а не утреннее напоминание', () => {
    const h = [1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, '08:00'));
    expect(computeSmartReminderTime(h, NOW, MSK)).toMatchObject({ source: 'fallback', reason: 'morning_peak' });
  });

  it('поздний человек 22:00 → верхняя граница 19:45', () => {
    const h = [1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, '22:00'));
    expect(computeSmartReminderTime(h, NOW, MSK)).toMatchObject({ source: 'smart', minute: 19 * 60 + 45, clamp: 'late_cap' });
  });

  it('полночь — круг суток: 23:50 и 00:10 дают пик около 00:00, не полдень → вечерняя граница', () => {
    const h = [1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, n % 2 ? '23:50' : '00:10'));
    const d = computeSmartReminderTime(h, NOW, MSK);
    expect(d.peakMinute === null ? -1 : Math.min(d.peakMinute, 1440 - d.peakMinute)).toBeLessThanOrEqual(15);
    expect(d.minute).toBe(19 * 60 + 45);
  });

  it('дневной человек 10:00 → не раньше 09:00 (результат 09:15)', () => {
    const h = [1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, '10:00'));
    expect(formatReminderMinute(computeSmartReminderTime(h, NOW, MSK).minute)).toBe('09:15');
  });

  it('открытия по нашему пушу не считаются (вес 0)', () => {
    const lessons = [1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, '18:30'));
    const pushes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ev(n, '12:00', 'push_open'));
    expect(formatReminderMinute(computeSmartReminderTime([...lessons, ...pushes], NOW, MSK).minute)).toBe('17:45');
  });

  it('события старше 28 дней не учитываются', () => {
    const old = [30, 31, 32, 33, 34, 35, 36].map((n) => ev(n, '18:30'));
    expect(computeSmartReminderTime(old, NOW, MSK)).toMatchObject({ source: 'fallback', reason: 'insufficient_data' });
  });

  it('разброс без пика (низкая уверенность) → фолбэк', () => {
    const times = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30', '12:45', '17:15', '10:15', '20:15'];
    const h = times.map((t, i) => ev(i + 1, t, 'session'));
    expect(computeSmartReminderTime(h, NOW, MSK)).toMatchObject({ source: 'fallback', reason: 'low_confidence' });
  });

  it('переезд на 2+ часа: старые дни в другом поясе отбрасываются, берутся последние 7 дней', () => {
    const oldTz = [8, 9, 10, 11, 12, 13, 14].map((n) => ev(n, '18:30', 'lesson', MSK));
    // 7 событий за последние 7 дней — минимум после переезда (5 дней и 7 событий).
    const newTz = [...[1, 2, 3, 4, 5, 6].map((n) => ev(n, '15:30', 'lesson', -180)), ev(2, '15:35', 'session', -180)];
    const d = computeSmartReminderTime([...oldTz, ...newTz], NOW, -180);
    expect(formatReminderMinute(d.minute)).toBe('14:45');
  });
});

describe('applySmartReminderHysteresis', () => {
  const smart = (minute: number) => computeSmartReminderTime([1, 2, 3, 4, 5, 6, 7].map((n) => ev(n, formatReminderMinute(minute + 45))), NOW, MSK);

  it('первый расчёт — ставим как есть', () => {
    expect(applySmartReminderHysteresis(null, smart(17 * 60 + 45), NOW)).toMatchObject({ step: 'first', changed: true });
  });

  it('сдвиг < 30 мин — время не прыгает', () => {
    const r = applySmartReminderHysteresis({ minute: 17 * 60 + 45, source: 'smart', changedAtMs: NOW - 10 * DAY }, smart(18 * 60), NOW);
    expect(r).toMatchObject({ minute: 17 * 60 + 45, step: 'below_threshold', changed: false });
  });

  it('меньше 3 дней с прошлой смены — ждём', () => {
    const r = applySmartReminderHysteresis({ minute: 15 * 60, source: 'smart', changedAtMs: NOW - DAY }, smart(17 * 60), NOW);
    expect(r).toMatchObject({ step: 'too_soon', changed: false });
  });

  it('большой сдвиг — не больше 60 мин за раз', () => {
    const r = applySmartReminderHysteresis({ minute: 14 * 60, source: 'smart', changedAtMs: NOW - 5 * DAY }, smart(17 * 60 + 45), NOW);
    expect(r).toMatchObject({ minute: 15 * 60, step: 'step_limited', changed: true });
  });

  it('из фолбэка 20:00 в умное время — сразу, без ожидания', () => {
    const r = applySmartReminderHysteresis({ minute: SMART_REMINDER.FALLBACK_MIN, source: 'fallback', changedAtMs: NOW }, smart(17 * 60 + 45), NOW);
    expect(r).toMatchObject({ minute: 17 * 60 + 45, source: 'smart', step: 'from_fallback', changed: true });
  });

  it('данных стало мало — умное время не сбрасывается на фолбэк', () => {
    const fb = computeSmartReminderTime([], NOW, MSK);
    const r = applySmartReminderHysteresis({ minute: 17 * 60 + 45, source: 'smart', changedAtMs: NOW - 9 * DAY }, fb, NOW);
    expect(r).toMatchObject({ minute: 17 * 60 + 45, source: 'smart', step: 'to_fallback_kept', changed: false });
  });
});
