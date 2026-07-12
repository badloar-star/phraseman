import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  claimSoftUpsell,
  markSoftUpsellDismissed,
  markSoftUpsellImpression,
  readSoftUpsellState,
  resetSoftUpsellSessionForTests,
} from '../app/soft_upsell_state';

const storageMock = AsyncStorage as typeof AsyncStorage & { __reset(): void };
const emptyState = {
  schemaVersion: 1,
  lastGlobalImpressionMs: null,
  contextDismissedAtMs: {},
  consumedMilestones: [],
};

function key(scope: string, target: 'en' | 'fr' = 'en'): string {
  return `soft_upsell_state_v1:${encodeURIComponent(scope)}:${target}`;
}

beforeEach(() => {
  storageMock.__reset();
  resetSoftUpsellSessionForTests();
  jest.restoreAllMocks();
});

test('allows exactly one concurrent runtime session claim without persisting eligibility', async () => {
  await expect(Promise.all([
    claimSoftUpsell({ accountScope: 'user-1', studyTarget: 'en' }),
    claimSoftUpsell({ accountScope: 'user-1', studyTarget: 'en' }),
  ])).resolves.toEqual([true, false]);
  expect(await AsyncStorage.getItem(key('user-1'))).toBeNull();
});

test('keeps impression and dismissal timestamps distinct', async () => {
  await markSoftUpsellDismissed('user', 'en', 'weekly_review', 100);
  await markSoftUpsellImpression('user', 'en', 'first_lesson_success', 'lesson:1:en', 200);

  await expect(readSoftUpsellState('user', 'en')).resolves.toEqual({
    schemaVersion: 1,
    lastGlobalImpressionMs: 200,
    contextDismissedAtMs: { weekly_review: 100 },
    consumedMilestones: ['lesson:1:en'],
  });
});

test.each([
  ['invalid JSON', '{bad'],
  ['schema mismatch', JSON.stringify({ ...emptyState, schemaVersion: 2 })],
  ['invalid timestamp', JSON.stringify({ ...emptyState, lastGlobalImpressionMs: null, contextDismissedAtMs: { weekly_review: '100' } })],
  ['non-finite timestamp', JSON.stringify({ ...emptyState, lastGlobalImpressionMs: 'Infinity' })],
])('returns an empty valid state for %s', async (_label, raw) => {
  await AsyncStorage.setItem(key('broken'), raw);
  await expect(readSoftUpsellState('broken', 'en')).resolves.toEqual(emptyState);
});

test('ignores unsafe context keys', async () => {
  await AsyncStorage.setItem(key('unsafe'), JSON.stringify({
    ...emptyState,
    contextDismissedAtMs: { weekly_review: 10, __proto_pollution__: 20 },
  }));
  await expect(readSoftUpsellState('unsafe', 'en')).resolves.toEqual({
    ...emptyState,
    contextDismissedAtMs: { weekly_review: 10 },
  });
});

test('isolates delimiter-containing account scopes and study targets', async () => {
  await markSoftUpsellDismissed('a:b', 'en', 'weekly_review', 10);
  await markSoftUpsellDismissed('a', 'fr', 'streak_milestone', 20);

  await expect(readSoftUpsellState('a:b', 'en')).resolves.toMatchObject({ contextDismissedAtMs: { weekly_review: 10 } });
  await expect(readSoftUpsellState('a', 'en')).resolves.toEqual(emptyState);
  await expect(readSoftUpsellState('a', 'fr')).resolves.toMatchObject({ contextDismissedAtMs: { streak_milestone: 20 } });
});

test('serializes concurrent writes so both changes survive', async () => {
  await Promise.all([
    markSoftUpsellDismissed('same', 'en', 'weekly_review', 10),
    markSoftUpsellImpression('same', 'en', 'first_lesson_success', 'm1', 20),
  ]);
  await expect(readSoftUpsellState('same', 'en')).resolves.toMatchObject({
    lastGlobalImpressionMs: 20,
    contextDismissedAtMs: { weekly_review: 10 },
    consumedMilestones: ['m1'],
  });
});

test('a rejected storage operation does not poison later writes', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk unavailable'));
  await expect(markSoftUpsellDismissed('retry', 'en', 'weekly_review', 10)).rejects.toThrow('disk unavailable');
  await expect(markSoftUpsellDismissed('retry', 'en', 'weekly_review', 20)).resolves.toBeUndefined();
  await expect(readSoftUpsellState('retry', 'en')).resolves.toMatchObject({ contextDismissedAtMs: { weekly_review: 20 } });
});

test('rejects invalid write timestamps without changing state', async () => {
  await expect(markSoftUpsellDismissed('invalid', 'en', 'weekly_review', Number.NaN)).rejects.toThrow();
  await expect(markSoftUpsellImpression('invalid', 'en', 'weekly_review', 'm', Number.POSITIVE_INFINITY)).rejects.toThrow();
  await expect(readSoftUpsellState('invalid', 'en')).resolves.toEqual(emptyState);
});

test('deduplicates milestones and keeps the newest 32', async () => {
  await AsyncStorage.setItem(key('bounded'), JSON.stringify({
    ...emptyState,
    consumedMilestones: [...Array.from({ length: 35 }, (_, index) => `m${index}`), 'm34', 'm10'],
  }));
  const state = await readSoftUpsellState('bounded', 'en');
  expect(state.consumedMilestones).toEqual([
    ...Array.from({ length: 7 }, (_, index) => `m${index + 3}`),
    ...Array.from({ length: 23 }, (_, index) => `m${index + 11}`),
    'm34',
    'm10',
  ]);

  await markSoftUpsellImpression('bounded', 'en', 'weekly_review', 'm20', 100);
  expect((await readSoftUpsellState('bounded', 'en')).consumedMilestones).toEqual([
    ...Array.from({ length: 7 }, (_, index) => `m${index + 3}`),
    ...Array.from({ length: 9 }, (_, index) => `m${index + 11}`),
    ...Array.from({ length: 13 }, (_, index) => `m${index + 21}`),
    'm34',
    'm10',
    'm20',
  ]);
});
