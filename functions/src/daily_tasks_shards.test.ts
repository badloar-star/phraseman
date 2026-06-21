import { isAcceptableDayKey, utcDayKey } from './daily_tasks_shards';

const DAY_MS = 24 * 60 * 60 * 1000;
// 2026-06-21T12:00:00Z — полдень UTC, далеко от границ суток.
const NOON_UTC = Date.UTC(2026, 5, 21, 12, 0, 0);

describe('daily_tasks_shards — анти-фарм по dayKey (окно сегодня/вчера UTC)', () => {
  describe('utcDayKey', () => {
    it('возвращает YYYY-MM-DD по UTC', () => {
      expect(utcDayKey(NOON_UTC)).toBe('2026-06-21');
    });
    it('берёт UTC-дату, а не локальную (полночь UTC)', () => {
      expect(utcDayKey(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
      expect(utcDayKey(Date.UTC(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    });
  });

  describe('isAcceptableDayKey', () => {
    it('принимает сегодня (UTC)', () => {
      expect(isAcceptableDayKey('2026-06-21', NOON_UTC)).toBe(true);
    });
    it('принимает вчера (UTC) — гонка около полуночи', () => {
      expect(isAcceptableDayKey('2026-06-20', NOON_UTC)).toBe(true);
    });
    it('отклоняет позавчера', () => {
      expect(isAcceptableDayKey('2026-06-19', NOON_UTC)).toBe(false);
    });
    it('отклоняет завтра (будущее)', () => {
      expect(isAcceptableDayKey('2026-06-22', NOON_UTC)).toBe(false);
    });
    it('отклоняет произвольную старую дату (фарм)', () => {
      expect(isAcceptableDayKey('2020-01-01', NOON_UTC)).toBe(false);
      expect(isAcceptableDayKey('2025-12-31', NOON_UTC)).toBe(false);
    });
    it('отклоняет невалидный формат', () => {
      expect(isAcceptableDayKey('2026-6-21', NOON_UTC)).toBe(false);
      expect(isAcceptableDayKey('garbage', NOON_UTC)).toBe(false);
      expect(isAcceptableDayKey('', NOON_UTC)).toBe(false);
      expect(isAcceptableDayKey(undefined, NOON_UTC)).toBe(false);
      expect(isAcceptableDayKey(20260621, NOON_UTC)).toBe(false);
    });
    it('граница суток: сразу после полуночи UTC принимает и новый день, и прошедший', () => {
      const justAfterMidnight = Date.UTC(2026, 5, 21, 0, 0, 30); // 00:00:30Z
      expect(isAcceptableDayKey('2026-06-21', justAfterMidnight)).toBe(true);  // сегодня
      expect(isAcceptableDayKey('2026-06-20', justAfterMidnight)).toBe(true);  // вчера (клиент чуть отстал)
      expect(isAcceptableDayKey('2026-06-19', justAfterMidnight)).toBe(false);
    });
  });
});
