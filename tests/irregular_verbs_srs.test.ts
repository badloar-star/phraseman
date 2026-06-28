import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordVerbPass,
  loadVerbSrs,
  isVerbDue,
  daysUntilDue,
  summarizeVerbSrs,
  seedSrsFromLegacyCounts,
  clearVerbSrs,
  SRS_INTERVALS,
  SRS_GRADUATE_AT,
} from '../app/irregular_verbs_srs';

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
const NOW = new Date('2026-06-28T12:00:00Z').getTime();

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
});

describe('irregular_verbs_srs ladder', () => {
  test('clean pass advances streak and schedules next due by ladder', async () => {
    const s1 = await recordVerbPass('break', { clean: true }, undefined, NOW);
    expect(s1.streak).toBe(1);
    expect(s1.mastered).toBeFalsy();
    // streak=1 → interval index 1 = 3 days
    expect(daysUntilDue(s1, NOW)).toBe(SRS_INTERVALS[1]);
  });

  test('graduates to mastered after full ladder', async () => {
    let state;
    for (let i = 0; i < SRS_GRADUATE_AT; i++) {
      state = await recordVerbPass('eat', { clean: true }, undefined, NOW);
    }
    expect(state!.mastered).toBe(true);
    expect(isVerbDue(state, NOW)).toBe(false);
  });

  test('shaky clean pass keeps short interval (guessing not rewarded)', async () => {
    const s = await recordVerbPass('drink', { clean: true, shaky: true }, undefined, NOW);
    expect(s.streak).toBe(1);
    // shaky → effective streak capped at 1 → 3 days, never the long end
    expect(daysUntilDue(s, NOW)).toBeLessThanOrEqual(SRS_INTERVALS[1]);
    expect(s.mastered).toBeFalsy();
  });

  test('error resets streak and reschedules to tomorrow', async () => {
    await recordVerbPass('go', { clean: true }, undefined, NOW);
    const s = await recordVerbPass('go', { clean: false }, undefined, NOW);
    expect(s.streak).toBe(0);
    expect(s.nextDue).toBeGreaterThan(NOW);
    expect(isVerbDue(s, NOW)).toBe(false); // tomorrow, not today
    expect(isVerbDue(s, NOW + DAY)).toBe(true);
  });
});

describe('summarizeVerbSrs', () => {
  test('classifies new / learning / mastered and collects due', async () => {
    // be: mastered, do: learning+due tomorrow (not due today), see: never seen (new→due)
    for (let i = 0; i < SRS_GRADUATE_AT; i++) await recordVerbPass('be', { clean: true }, undefined, NOW);
    await recordVerbPass('do', { clean: false }, undefined, NOW); // due tomorrow
    const map = await loadVerbSrs();
    const summary = summarizeVerbSrs(['be', 'do', 'see'], map, NOW);
    expect(summary.masteredCount).toBe(1);
    expect(summary.learningCount).toBe(1);
    expect(summary.newCount).toBe(1);
    expect(summary.dueBases).toContain('see'); // new is due
    expect(summary.dueBases).not.toContain('be'); // mastered not due
    expect(summary.dueBases).not.toContain('do'); // due tomorrow, not today
  });
});

describe('legacy migration', () => {
  test('seeds mastered legacy verbs back into spaced review (not buried)', async () => {
    const seeded = await seedSrsFromLegacyCounts({ break: 3, eat: 3, half: 1 }, undefined, NOW);
    expect(seeded.break).toBeDefined();
    expect(seeded.eat).toBeDefined();
    expect(seeded.half).toBeUndefined(); // count<3 not seeded
    expect(seeded.break.mastered).toBe(false); // returns to review, not buried
    expect(seeded.break.nextDue).toBeGreaterThan(NOW);
  });

  test('does not overwrite existing srs map', async () => {
    await recordVerbPass('break', { clean: true }, undefined, NOW);
    const before = await loadVerbSrs();
    const seeded = await seedSrsFromLegacyCounts({ break: 3, eat: 3 }, undefined, NOW);
    expect(seeded).toEqual(before); // returned existing, no eat added
    expect(seeded.eat).toBeUndefined();
  });
});

describe('clearVerbSrs', () => {
  test('wipes the store', async () => {
    await recordVerbPass('go', { clean: true }, undefined, NOW);
    await clearVerbSrs();
    expect(await loadVerbSrs()).toEqual({});
  });
});
