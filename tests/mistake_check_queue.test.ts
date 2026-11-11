import {
  mistakeCheckDueGroup,
  mistakeCheckState,
  selectMistakesForCheck,
  splitMistakesByCheck,
} from '../modules/mistake-practice/check_queue';

// зачем (владелец 11.11, D203, вкладка «Проверка»): исправленная ошибка сначала ждёт проверку, потом её пора проверять,
// и только после пройденной проверки она «закреплена». Здесь сторожим расклад по этим состояниям — чистую логику вкладки.
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;

type Item = Parameters<typeof mistakeCheckState>[0] & { mistakeId: string };
const item = (mistakeId: string, extra: Partial<Item> = {}): Item => ({
  mistakeId,
  status: 'corrected',
  correctedAtMs: NOW - DAY,
  checkDueAtMs: null,
  checkPassedAtMs: null,
  ...extra,
});

describe('mistake check queue', () => {
  test('an active mistake has no check', () => {
    expect(mistakeCheckState(item('a', { status: 'active', checkDueAtMs: NOW - 1 }), NOW)).toBe('none');
  });

  test('a mistake corrected under the previous rule has no check — it is simply fixed', () => {
    expect(mistakeCheckState(item('a'), NOW)).toBe('none');
  });

  test('before its day the check is waiting, from its day it is due', () => {
    expect(mistakeCheckState(item('a', { checkDueAtMs: NOW + 1 }), NOW)).toBe('waiting');
    expect(mistakeCheckState(item('a', { checkDueAtMs: NOW }), NOW)).toBe('due');
    expect(mistakeCheckState(item('a', { checkDueAtMs: NOW - DAY }), NOW)).toBe('due');
  });

  test('a passed check is final', () => {
    expect(mistakeCheckState(item('a', { checkPassedAtMs: NOW - 5 }), NOW)).toBe('passed');
  });

  test('the three tabs never share a mistake and never lose one', () => {
    const items = [
      item('active', { status: 'active' }),
      item('old-fixed'),
      item('waiting', { checkDueAtMs: NOW + DAY }),
      item('due', { checkDueAtMs: NOW - 1 }),
      item('passed', { checkPassedAtMs: NOW - 1 }),
      item('hidden', { status: 'hidden' }),
    ];
    const split = splitMistakesByCheck(items, NOW);
    expect(split.waiting.map((entry) => entry.mistakeId)).toEqual(['active']);
    expect(split.check.map((entry) => entry.mistakeId)).toEqual(['due', 'waiting']);
    expect(split.fixed.map((entry) => entry.mistakeId)).toEqual(['old-fixed', 'passed']);
    expect(split.waiting.length + split.check.length + split.fixed.length).toBe(5);
  });

  test('only due checks go into a check session, the most overdue first, within the limit', () => {
    const items = [
      item('later', { checkDueAtMs: NOW + DAY }),
      item('due-new', { checkDueAtMs: NOW - 10 }),
      item('due-old', { checkDueAtMs: NOW - DAY }),
      item('passed', { checkPassedAtMs: NOW - 1, checkDueAtMs: null }),
      item('active', { status: 'active', checkDueAtMs: NOW - DAY }),
    ];
    expect(selectMistakesForCheck(items, { nowMs: NOW, limit: 10 }).map((entry) => entry.mistakeId)).toEqual(['due-old', 'due-new']);
    expect(selectMistakesForCheck(items, { nowMs: NOW, limit: 1 }).map((entry) => entry.mistakeId)).toEqual(['due-old']);
    expect(selectMistakesForCheck(items, { nowMs: NOW, limit: 0 })).toEqual([]);
  });

  test('groups by how soon the check comes: today, tomorrow, in N days', () => {
    expect(mistakeCheckDueGroup(NOW - DAY, NOW)).toEqual({ kind: 'today' });
    expect(mistakeCheckDueGroup(NOW, NOW)).toEqual({ kind: 'today' });
    expect(mistakeCheckDueGroup(NOW + 1, NOW)).toEqual({ kind: 'tomorrow' });
    expect(mistakeCheckDueGroup(NOW + DAY, NOW)).toEqual({ kind: 'tomorrow' });
    expect(mistakeCheckDueGroup(NOW + DAY + 1, NOW)).toEqual({ kind: 'days', days: 2 });
    expect(mistakeCheckDueGroup(NOW + 3 * DAY, NOW)).toEqual({ kind: 'days', days: 3 });
  });
});
