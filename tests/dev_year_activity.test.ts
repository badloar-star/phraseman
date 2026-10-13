import {
  DEV_YEAR_ACTIVITY_MINUTES,
  DEV_YEAR_ACTIVITY_PHRASES,
  buildDevYearActivityDays,
  devYearActivityLevel,
  peekDevYearActivityDays,
  setDevYearActivityDemo,
} from '../app/dev_year_activity';
import { buildYearActivityModel, formatPracticeTime } from '../app/year_activity_model';

// зачем (координатор 13.10, results-009): заполненная сетка и итоги ровно как в образце results.html#9.
describe('dev year activity fixture', () => {
  it('follows the mockup heatmap pattern (17n bright, 7n mid, 4n soft)', () => {
    expect([devYearActivityLevel(17), devYearActivityLevel(34), devYearActivityLevel(68)]).toEqual([4, 4, 4]);
    expect([devYearActivityLevel(7), devYearActivityLevel(28)]).toEqual([2, 2]);
    expect([devYearActivityLevel(4), devYearActivityLevel(8)]).toEqual([1, 1]);
    expect([devYearActivityLevel(1), devYearActivityLevel(5)]).toEqual([0, 0]);
  });

  it('gives the screen model 365 cells and the mockup totals', () => {
    const days = buildDevYearActivityDays('2026-10-13');
    const model = buildYearActivityModel(days, '2026-10-13');
    expect(model.cells).toHaveLength(365);
    expect(model.cells.map((cell) => cell.level)).toEqual(Array.from({ length: 365 }, (_, i) => devYearActivityLevel(i + 1)));
    expect(model.phrasesLearned).toBe(DEV_YEAR_ACTIVITY_PHRASES);
    expect(model.minutes).toBe(DEV_YEAR_ACTIVITY_MINUTES);
    expect(formatPracticeTime(model.minutes, 'ru')).toBe('18 ч 42 мин');
    expect(days.every((day) => day.minutes >= 0 && day.metrics.phrasesLearned >= 0)).toBe(true);
  });

  it('is off by default, refuses outside __DEV__ and only switches in memory', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const globalDev = globalThis as { __DEV__?: boolean };
    const previousDev = globalDev.__DEV__;
    try {
      globalDev.__DEV__ = false;
      expect(setDevYearActivityDemo(true)).toBe(false);
      expect(peekDevYearActivityDays()).toBeNull();
      globalDev.__DEV__ = true;
      expect(peekDevYearActivityDays()).toBeNull();
      expect(setDevYearActivityDemo(true)).toBe(true);
      expect(peekDevYearActivityDays()).toHaveLength(365);
      setDevYearActivityDemo(false);
      expect(peekDevYearActivityDays()).toBeNull();
    } finally {
      globalDev.__DEV__ = previousDev;
      log.mockRestore();
      warn.mockRestore();
    }
  });
});
