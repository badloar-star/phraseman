// Weekly Boons — детектор «Идеальной недели» (чистые функции).
import { isWeekComplete, parseWeekDone, PERFECT_WEEK_REWARD } from '../app/boons/perfect_week';

describe('isWeekComplete', () => {
  it('true только когда все 7 дней true', () => {
    expect(isWeekComplete([true, true, true, true, true, true, true])).toBe(true);
  });
  it('false при любом незакрытом дне', () => {
    expect(isWeekComplete([true, true, true, true, true, true, false])).toBe(false);
  });
  it('false при неверной длине', () => {
    expect(isWeekComplete([true, true, true])).toBe(false);
    expect(isWeekComplete(null)).toBe(false);
    expect(isWeekComplete(undefined)).toBe(false);
  });
});

describe('parseWeekDone', () => {
  it('парсит валидный массив из 7 bool', () => {
    expect(parseWeekDone(JSON.stringify([true, false, true, true, false, true, true]))).toEqual([
      true, false, true, true, false, true, true,
    ]);
  });
  it('null на мусоре/неверной длине', () => {
    expect(parseWeekDone(null)).toBeNull();
    expect(parseWeekDone('not json')).toBeNull();
    expect(parseWeekDone(JSON.stringify([true, true]))).toBeNull();
  });
  it('коэрсит не-true значения в false', () => {
    expect(parseWeekDone(JSON.stringify([1, 0, 'x', null, true, false, true]))).toEqual([
      false, false, false, false, true, false, true,
    ]);
  });
});

describe('PERFECT_WEEK_REWARD', () => {
  it('крупный приз (20 осколков)', () => {
    expect(PERFECT_WEEK_REWARD.shards).toBe(20);
  });
});
