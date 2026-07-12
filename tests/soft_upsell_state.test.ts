import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  claimSoftUpsell,
  MAX_SOFT_UPSELL_MILESTONE_ID_LENGTH,
  markSoftUpsellDismissed,
  markSoftUpsellImpression,
  readSoftUpsellState,
  resetSoftUpsellSessionForTests,
} from '../app/soft_upsell_state';
import { lessonSoftUpsellPersistenceScope } from '../app/lesson_complete_soft_upsell';

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

test('preserves cooldown across generations of one stable account and isolates another account', async () => {
  const aliceGeneration1 = lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'alice', generation: 1 });
  const aliceGeneration2 = lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'alice', generation: 2 });
  const bob = lessonSoftUpsellPersistenceScope({ phase: 'active', stableId: 'bob', generation: 2 });
  await markSoftUpsellImpression(aliceGeneration1, 'en', 'first_lesson_success', 'first_lesson:1:en', 100);
  await expect(readSoftUpsellState(aliceGeneration2, 'en')).resolves.toMatchObject({ lastGlobalImpressionMs: 100 });
  await expect(readSoftUpsellState(bob, 'en')).resolves.toEqual(emptyState);
});

test('checks a guarded claim inside the serialized operation without consuming a stale session', async () => {
  let releaseRead!: (value: string | null) => void;
  let markReadEntered!: () => void;
  const readEntered = new Promise<void>((resolve) => { markReadEntered = resolve; });
  jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise((resolve) => {
    releaseRead = resolve;
    markReadEntered();
  }));
  const queuedRead = readSoftUpsellState('guarded', 'en');
  await readEntered;
  let current = true;
  const staleClaim = claimSoftUpsell({ accountScope: 'guarded', studyTarget: 'en', canClaim: () => current });
  current = false;
  releaseRead(null);
  await queuedRead;
  await expect(staleClaim).resolves.toBe(false);
  await expect(claimSoftUpsell({ accountScope: 'current', studyTarget: 'en' })).resolves.toBe(true);
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
  expect(await AsyncStorage.getItem(key('broken'))).toBe(JSON.stringify(emptyState));
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
  const encodedScope = 'a:b%tenant';
  await markSoftUpsellDismissed(encodedScope, 'en', 'weekly_review', 10);
  await markSoftUpsellDismissed('a', 'fr', 'streak_milestone', 20);

  expect(await AsyncStorage.getItem(`soft_upsell_state_v1:${encodeURIComponent(encodedScope)}:en`)).not.toBeNull();
  expect(await AsyncStorage.getItem(`soft_upsell_state_v1:${encodedScope}:en`)).toBeNull();
  await expect(readSoftUpsellState(encodedScope, 'en')).resolves.toMatchObject({ contextDismissedAtMs: { weekly_review: 10 } });
  await expect(readSoftUpsellState('a', 'en')).resolves.toEqual(emptyState);
  await expect(readSoftUpsellState('a', 'fr')).resolves.toMatchObject({ contextDismissedAtMs: { streak_milestone: 20 } });
});

test.each([
  ['top-level array', JSON.stringify([])],
  ['top-level null', JSON.stringify(null)],
  ['missing contexts', JSON.stringify({ schemaVersion: 1, lastGlobalImpressionMs: null, consumedMilestones: [] })],
  ['null contexts', JSON.stringify({ ...emptyState, contextDismissedAtMs: null })],
  ['array contexts', JSON.stringify({ ...emptyState, contextDismissedAtMs: [] })],
  ['non-array milestones', JSON.stringify({ ...emptyState, consumedMilestones: {} })],
  ['negative global timestamp', JSON.stringify({ ...emptyState, lastGlobalImpressionMs: -1 })],
  ['non-safe global timestamp', JSON.stringify({ ...emptyState, lastGlobalImpressionMs: Number.MAX_SAFE_INTEGER + 1 })],
  ['non-finite global timestamp', '{"schemaVersion":1,"lastGlobalImpressionMs":1e400,"contextDismissedAtMs":{},"consumedMilestones":[]}'],
  ['negative context timestamp', JSON.stringify({ ...emptyState, contextDismissedAtMs: { weekly_review: -1 } })],
  ['non-safe context timestamp', JSON.stringify({ ...emptyState, contextDismissedAtMs: { weekly_review: Number.MAX_SAFE_INTEGER + 1 } })],
  ['non-finite context timestamp', '{"schemaVersion":1,"lastGlobalImpressionMs":null,"contextDismissedAtMs":{"weekly_review":1e400},"consumedMilestones":[]}'],
  ['fractional context timestamp', JSON.stringify({ ...emptyState, contextDismissedAtMs: { weekly_review: 1.5 } })],
])('returns safe empty state for malformed shape: %s', async (_label, raw) => {
  await AsyncStorage.setItem(key('shape'), raw);
  await expect(readSoftUpsellState('shape', 'en')).resolves.toEqual(emptyState);
});

test('sanitizes invalid milestone element types while retaining valid newest entries', async () => {
  await AsyncStorage.setItem(key('milestone-types'), JSON.stringify({
    ...emptyState,
    consumedMilestones: ['valid-1', 42, null, '', 'valid-2'],
  }));
  await expect(readSoftUpsellState('milestone-types', 'en')).resolves.toEqual({
    ...emptyState,
    consumedMilestones: ['valid-1', 'valid-2'],
  });
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

test('a rejected read does not poison later reads or repair', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('read unavailable'));
  await expect(readSoftUpsellState('read-retry', 'en')).rejects.toThrow('read unavailable');
  await AsyncStorage.setItem(key('read-retry'), '{bad');
  await expect(readSoftUpsellState('read-retry', 'en')).resolves.toEqual(emptyState);
  expect(await AsyncStorage.getItem(key('read-retry'))).toBe(JSON.stringify(emptyState));
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

test('sanitizes empty and oversized persisted milestone IDs and repairs stored bytes', async () => {
  const maximum = 'm'.repeat(MAX_SOFT_UPSELL_MILESTONE_ID_LENGTH);
  await AsyncStorage.setItem(key('milestone-size'), JSON.stringify({
    ...emptyState,
    consumedMilestones: ['', '   ', 'x'.repeat(MAX_SOFT_UPSELL_MILESTONE_ID_LENGTH + 1), maximum],
  }));
  await expect(readSoftUpsellState('milestone-size', 'en')).resolves.toEqual({
    ...emptyState,
    consumedMilestones: [maximum],
  });
  expect(await AsyncStorage.getItem(key('milestone-size'))).toBe(JSON.stringify({
    ...emptyState,
    consumedMilestones: [maximum],
  }));
});

test.each(['', '   ', 'x'.repeat(MAX_SOFT_UPSELL_MILESTONE_ID_LENGTH + 1)])('rejects invalid milestone ID %p without updating cooldown', async (milestoneId) => {
  await expect(markSoftUpsellImpression('invalid-id', 'en', 'weekly_review', milestoneId, 100)).rejects.toThrow();
  await expect(readSoftUpsellState('invalid-id', 'en')).resolves.toEqual(emptyState);
});

test('accepts a milestone ID exactly at the maximum boundary', async () => {
  const milestoneId = 'x'.repeat(MAX_SOFT_UPSELL_MILESTONE_ID_LENGTH);
  await markSoftUpsellImpression('max-id', 'en', 'weekly_review', milestoneId, 100);
  await expect(readSoftUpsellState('max-id', 'en')).resolves.toMatchObject({
    lastGlobalImpressionMs: 100,
    consumedMilestones: [milestoneId],
  });
});
