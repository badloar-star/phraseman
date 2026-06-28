import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pickVerbOfDay,
  markVerbOfDayDone,
  loadVerbOfDayState,
  isVerbOfDayDone,
  getVerbOfDaySnapshot,
  verbOfDayDateKey,
  clearVerbOfDay,
} from '../app/verb_of_day';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
    removeItem: jest.fn((k: string) => { delete store[k]; return Promise.resolve(); }),
    __reset: () => { store = {}; },
  };
});

const DAY = 24 * 60 * 60 * 1000;
const D1 = new Date('2026-06-28T10:00:00Z').getTime();
const D2 = D1 + DAY;
const D4 = D1 + 3 * DAY;

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe('pickVerbOfDay determinism', () => {
  test('same date → same verb', () => {
    const a = pickVerbOfDay({}, '2026-06-28');
    const b = pickVerbOfDay({}, '2026-06-28');
    expect(a?.base).toBe(b?.base);
    expect(a).not.toBeNull();
  });

  test('different dates can differ but are stable', () => {
    const a1 = pickVerbOfDay({}, '2026-06-28');
    const a2 = pickVerbOfDay({}, '2026-06-28');
    const b1 = pickVerbOfDay({}, '2026-07-15');
    expect(a1?.base).toBe(a2?.base);
    expect(b1).not.toBeNull();
  });

  test('returns null on empty verb list', () => {
    expect(pickVerbOfDay({}, '2026-06-28', [])).toBeNull();
  });

  test('prefers a due verb when SRS marks some not-due', () => {
    // Mark a verb mastered (not due); the pick should avoid it when others are due.
    const verbs = [
      { base: 'aaa', past: 'a', pp: 'a', ru: '', uk: '', es: '', 'pt-BR': '', vi: '', id: '', tr: '', pl: '' },
      { base: 'bbb', past: 'b', pp: 'b', ru: '', uk: '', es: '', 'pt-BR': '', vi: '', id: '', tr: '', pl: '' },
    ];
    const srs = { aaa: { streak: 5, nextDue: 0, firstSeen: D1, lastSeen: D1, mastered: true } };
    const picked = pickVerbOfDay(srs, '2026-06-28', verbs);
    expect(picked?.base).toBe('bbb'); // mastered 'aaa' excluded, 'bbb' is due
  });
});

describe('markVerbOfDayDone streak', () => {
  test('first completion starts streak at 1', async () => {
    const s = await markVerbOfDayDone('break', undefined, D1);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(1);
    expect(s.lastDoneDate).toBe(verbOfDayDateKey(D1));
  });

  test('consecutive days increment streak', async () => {
    await markVerbOfDayDone('break', undefined, D1);
    const s = await markVerbOfDayDone('eat', undefined, D2);
    expect(s.streak).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  test('gap resets streak to 1 but keeps best', async () => {
    await markVerbOfDayDone('break', undefined, D1);
    await markVerbOfDayDone('eat', undefined, D2); // streak 2
    const s = await markVerbOfDayDone('go', undefined, D4); // gap (missed D3)
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  test('idempotent within the same day', async () => {
    const a = await markVerbOfDayDone('break', undefined, D1);
    const b = await markVerbOfDayDone('break', undefined, D1);
    expect(b.streak).toBe(1);
    expect(a).toEqual(b);
  });
});

describe('isVerbOfDayDone', () => {
  test('true only after marking today', async () => {
    expect(isVerbOfDayDone(await loadVerbOfDayState(), D1)).toBe(false);
    await markVerbOfDayDone('break', undefined, D1);
    expect(isVerbOfDayDone(await loadVerbOfDayState(), D1)).toBe(true);
    expect(isVerbOfDayDone(await loadVerbOfDayState(), D2)).toBe(false); // next day not done
  });
});

describe('getVerbOfDaySnapshot', () => {
  test('returns verb + streak + done flag', async () => {
    const before = await getVerbOfDaySnapshot(undefined, D1);
    expect(before.verb).not.toBeNull();
    expect(before.done).toBe(false);
    expect(before.streak).toBe(0);

    await markVerbOfDayDone(before.verb!.base, undefined, D1);
    const after = await getVerbOfDaySnapshot(undefined, D1);
    expect(after.done).toBe(true);
    expect(after.streak).toBe(1);
  });
});

describe('clearVerbOfDay', () => {
  test('resets state', async () => {
    await markVerbOfDayDone('break', undefined, D1);
    await clearVerbOfDay();
    const s = await loadVerbOfDayState();
    expect(s.streak).toBe(0);
    expect(s.lastDoneDate).toBe('');
  });
});
