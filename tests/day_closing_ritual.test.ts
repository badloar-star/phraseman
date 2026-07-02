import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatCompactNumber } from '../app/format_compact_number';
import {
  loadDayClosingRitual,
  markDayClosingSeen,
} from '../app/compass/day_closing_ritual';
import { activeRecallItemsKey, mistakeLogKey, statsDailyBreakdownKey } from '../app/target_storage_keys';

const EVENING = new Date(2026, 5, 30, 19, 30).getTime();
const NEXT_EVENING = new Date(2026, 6, 1, 19, 30).getTime();
const EVENING_KEY = new Date(EVENING).toISOString().split('T')[0];
const NEXT_EVENING_KEY = new Date(NEXT_EVENING).toISOString().split('T')[0];

async function seedDay(dateKey: string, opts?: { xp?: number; phrases?: number; streak?: number }) {
  await AsyncStorage.multiSet([
    ['daily_stats', JSON.stringify({ [dateKey]: { points: opts?.xp ?? 1200, streak: opts?.streak ?? 5 } })],
    [statsDailyBreakdownKey('en'), JSON.stringify({ [dateKey]: { phrases_learned: opts?.phrases ?? 4 } })],
    ['streak_count', String(opts?.streak ?? 5)],
  ]);
}

describe('day closing ritual', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('formats compact numbers for XP-style surfaces', () => {
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatCompactNumber(1200)).toBe('1.2K');
    expect(formatCompactNumber(12_000)).toBe('12K');
    expect(formatCompactNumber(1_400_000)).toBe('1.4M');
  });

  it('locks (not hides) the ritual for free tier after one completed ritual', async () => {
    await seedDay(EVENING_KEY);
    const first = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: false });
    expect(first).not.toBeNull();
    expect(first!.locked).toBe(false);
    expect(first!.highlights.some((h) => h.kind === 'xp' && h.value === '1.2K')).toBe(true);

    await markDayClosingSeen({ studyTarget: 'en', dateKey: first!.dateKey, hasPremiumAccess: false });
    await seedDay(NEXT_EVENING_KEY, { xp: 2400, phrases: 5, streak: 6 });

    // Второй вечер бесплатного: ритуал НЕ исчезает молча — приходит запертая
    // витрина (цифры и фокус прячет уже рендер по флагу locked).
    const second = await loadDayClosingRitual({ studyTarget: 'en', nowMs: NEXT_EVENING, hasPremiumAccess: false });
    expect(second).not.toBeNull();
    expect(second!.locked).toBe(true);
    expect(second!.dateKey).toBe(NEXT_EVENING_KEY);
  });

  it('never locks the ritual for premium', async () => {
    await seedDay(EVENING_KEY);
    // Даже если free-маркер стоит (куплен после бесплатного периода) — премиум полный.
    await AsyncStorage.setItem('compass_day_closing_free_used_v1', '1');
    const ritual = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: true });
    expect(ritual).not.toBeNull();
    expect(ritual!.locked).toBe(false);
  });

  it('allows premium users to receive the ritual on another day', async () => {
    await seedDay(EVENING_KEY);
    const first = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: true });
    expect(first).not.toBeNull();
    await markDayClosingSeen({ studyTarget: 'en', dateKey: first!.dateKey, hasPremiumAccess: true });

    await seedDay(NEXT_EVENING_KEY, { xp: 2400, phrases: 5, streak: 6 });
    const second = await loadDayClosingRitual({ studyTarget: 'en', nowMs: NEXT_EVENING, hasPremiumAccess: true });
    expect(second).not.toBeNull();
    expect(second!.dateKey).toBe(NEXT_EVENING_KEY);
  });

  it('uses local due recall as the next-day focus', async () => {
    await seedDay(EVENING_KEY, { xp: 500, phrases: 2, streak: 3 });
    await AsyncStorage.setItem(activeRecallItemsKey('en'), JSON.stringify([
      { phrase: 'I need to go', nextDue: EVENING - 1000, errorCount: 1, easeFactor: 2.1, createdAt: EVENING - 2 * 86400000, repetitions: 1 },
      { phrase: 'She works here', nextDue: EVENING - 2000, errorCount: 0, easeFactor: 2.2, createdAt: EVENING - 2 * 86400000, repetitions: 1 },
    ]));

    const ritual = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: true });
    expect(ritual).not.toBeNull();
    expect(ritual!.focus.kind).toBe('due');
    expect(ritual!.focus.value).toBe('2');
  });

  it('keeps a large due backlog as a short next-day session', async () => {
    await seedDay(EVENING_KEY, { xp: 500, phrases: 2, streak: 3 });
    await AsyncStorage.setItem(activeRecallItemsKey('en'), JSON.stringify(
      Array.from({ length: 20 }, (_, i) => ({
        phrase: `Due phrase ${i}`,
        nextDue: EVENING - 1000 - i,
        errorCount: 0,
        easeFactor: 2.2,
        createdAt: EVENING - 2 * 86400000,
        repetitions: 1,
      })),
    ));

    const ritual = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: true });
    expect(ritual).not.toBeNull();
    expect(ritual!.focus.kind).toBe('due');
    expect(ritual!.focus.rawCount).toBe(7);
    expect(ritual!.focus.value).toBe('7');
  });

  it('prioritizes repeated local mistake phrases over generic recall counts', async () => {
    await seedDay(EVENING_KEY, { xp: 500, phrases: 2, streak: 3 });
    await AsyncStorage.multiSet([
      [activeRecallItemsKey('en'), JSON.stringify([
        { phrase: 'Generic due phrase', nextDue: EVENING - 1000, errorCount: 1, easeFactor: 2.1, createdAt: EVENING - 86400000, repetitions: 1 },
      ])],
      [mistakeLogKey('en'), JSON.stringify([
        { phrase: 'I have seen this film', lessonId: 1, mode: 'quiz', what: 'wrong_pick', category: 'verb', ts: EVENING - 1000 },
        { phrase: 'I have seen this film', lessonId: 1, mode: 'quiz', what: 'wrong_pick', category: 'verb', ts: EVENING - 2000 },
      ])],
    ]);

    const ritual = await loadDayClosingRitual({ studyTarget: 'en', nowMs: EVENING, hasPremiumAccess: true });
    expect(ritual).not.toBeNull();
    expect(ritual!.focus.kind).toBe('weak_phrase');
    expect(ritual!.focus.phrase).toBe('I have seen this film');
    expect(ritual!.focus.value).toBe('2');
  });
});
