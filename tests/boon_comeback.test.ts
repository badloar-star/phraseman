// Weekly Boons — детектор «Дня возвращения» (Comeback). Чистые функции.
import { daysSinceLastActive, isComebackEligible, COMEBACK_MIN_MISSED_DAYS } from '../app/boons/comeback';

describe('daysSinceLastActive', () => {
  it('0 для сегодня', () => {
    expect(daysSinceLastActive('2026-06-21', '2026-06-21')).toBe(0);
  });
  it('1 для вчера', () => {
    expect(daysSinceLastActive('2026-06-20', '2026-06-21')).toBe(1);
  });
  it('3 для трёх дней назад', () => {
    expect(daysSinceLastActive('2026-06-18', '2026-06-21')).toBe(3);
  });
  it('0 для невалидной даты', () => {
    expect(daysSinceLastActive('garbage', '2026-06-21')).toBe(0);
    expect(daysSinceLastActive(null, '2026-06-21')).toBe(0);
  });
  it('0 если lastActive в будущем', () => {
    expect(daysSinceLastActive('2026-06-25', '2026-06-21')).toBe(0);
  });
});

describe('isComebackEligible', () => {
  it('false при 1 пропущенном дне (это зона streak_repair)', () => {
    expect(isComebackEligible('2026-06-20', null, '2026-06-21')).toBe(false);
  });
  it('true при 2 пропущенных днях', () => {
    expect(isComebackEligible('2026-06-19', null, '2026-06-21')).toBe(true);
  });
  it(`порог = ${COMEBACK_MIN_MISSED_DAYS} дня`, () => {
    expect(daysSinceLastActive('2026-06-19', '2026-06-21')).toBe(COMEBACK_MIN_MISSED_DAYS);
  });
  it('false, если уже выдано сегодня', () => {
    expect(isComebackEligible('2026-06-10', '2026-06-21', '2026-06-21')).toBe(false);
  });
  it('true при долгом отсутствии и невыданном бонусе', () => {
    expect(isComebackEligible('2026-06-01', '2026-06-20', '2026-06-21')).toBe(true);
  });
});
