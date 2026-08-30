import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  commitDailyJourneyGift,
  markDailyJourneyGiftSnapshotSeen,
  readDailyJourneyGiftClaimState,
  readDailyJourneyGiftProjection,
} from '../app/daily_journey_gift_inbox';
import { emitAppEvent } from '../app/events';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    createHash('sha256').update(value).digest('hex'),
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));

const storage: Record<string, string> = {};

const gift = (operationId: string, amount = 10) => ({
  operationId,
  day: 1,
  cycle: 1,
  source: 'daily_journey_dev' as const,
  reward: { kind: 'pearls' as const, amount },
});

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  Object.keys(storage).forEach((key) => delete storage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () => Object.keys(storage));
  (AsyncStorage.multiGet as jest.Mock).mockImplementation(async (keys: readonly string[]) =>
    keys.map((key) => [key, storage[key] ?? null]));
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
});

it('replays the same operation and rejects a different payload for the same id', async () => {
  const token = beginAccountGeneration('owner-a');
  const input = gift('daily-dev-000000000001');

  const first = await commitDailyJourneyGift(input, token);
  const replay = await commitDailyJourneyGift(input, token);

  expect(first.status).toBe('committed');
  expect(replay).toEqual({ status: 'already_committed', occurrence: first.occurrence });
  expect(emitAppEvent).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('daily_journey_gifts_changed');
  expect((await readDailyJourneyGiftProjection(token)).pending).toHaveLength(1);
  await expect(commitDailyJourneyGift({ ...input, reward: { kind: 'pearls', amount: 20 } }, token))
    .rejects.toThrow('daily_journey_occurrence_conflict');
  expect((await readDailyJourneyGiftProjection(token)).unreadCount).toBe(1);
});

it.each([
  [{ ...gift('daily-dev-invalid-runes'), reward: { kind: 'runes' as const, amount: 99 } }],
  [{ ...gift('daily-dev-invalid-day-low'), day: 0 }],
  [{ ...gift('daily-dev-invalid-day-high'), day: 51 }],
  [{ ...gift('daily-dev-invalid-kind'), reward: { kind: 'avatar', amount: 1 } as never }],
  [{ ...gift('daily-dev-invalid-zero'), reward: { kind: 'spins' as const, amount: 0 } }],
  [{ ...gift('daily-dev-invalid-fraction'), reward: { kind: 'pearls' as const, amount: 1.5 } }],
  [{ ...gift('daily-dev-invalid-huge'), reward: { kind: 'freeze' as const, amount: 1_000_001 } }],
])('rejects invalid daily journey occurrence input %#', async (input) => {
  const token = beginAccountGeneration('owner-a');
  await expect(commitDailyJourneyGift(input, token)).rejects.toThrow('daily_journey_occurrence_invalid');
});

it('rejects stale account tokens and never exposes another owner journal', async () => {
  const ownerAToken = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-owner-a-000001'), ownerAToken);

  const ownerBToken = beginAccountGeneration('owner-b');

  await expect(readDailyJourneyGiftProjection(ownerAToken)).rejects.toThrow('daily_journey_account_stale');
  await expect(commitDailyJourneyGift(gift('daily-dev-stale-a-000001'), ownerAToken))
    .rejects.toThrow('daily_journey_account_stale');
  expect(await readDailyJourneyGiftProjection(ownerBToken)).toMatchObject({
    pending: [], pendingCount: 0, unreadCount: 0,
  });
});

it('recovers the same prepared intent after a torn occurrence/projection commit', async () => {
  const token = beginAccountGeneration('owner-a');
  const normalMultiSet = AsyncStorage.multiSet as jest.Mock;
  normalMultiSet.mockRejectedValueOnce(new Error('simulated_torn_commit'));

  await expect(commitDailyJourneyGift(gift('daily-dev-torn-00000001'), token))
    .rejects.toThrow('simulated_torn_commit');
  expect(emitAppEvent).not.toHaveBeenCalled();

  const recovered = await commitDailyJourneyGift(gift('daily-dev-torn-00000001'), token);
  expect(recovered.status).toBe('committed');
  expect(await readDailyJourneyGiftClaimState(recovered.occurrence.operationId, token)).toBe('pending');
  expect((await readDailyJourneyGiftProjection(token)).pendingCount).toBe(1);
});

it('keeps two deliberate dev occurrences pending and unread', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-deliberate-0001'), token);
  await commitDailyJourneyGift(gift('daily-dev-deliberate-0002'), token);

  const projection = await readDailyJourneyGiftProjection(token);
  expect(projection.pending.map((item) => item.operationId)).toEqual([
    'daily-dev-deliberate-0001',
    'daily-dev-deliberate-0002',
  ]);
  expect(projection).toMatchObject({ pendingCount: 2, unreadCount: 2, latestRevision: 2, seenRevision: 0 });
});

it('advances seen only to a displayed revision and leaves a concurrent gift unread', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-seen-000000001'), token);
  const displayed = await readDailyJourneyGiftProjection(token);

  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision + 1, token)).toBe(false);
  await commitDailyJourneyGift(gift('daily-dev-seen-000000002'), token);
  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, token)).toBe(true);

  const afterConcurrentGift = await readDailyJourneyGiftProjection(token);
  expect(afterConcurrentGift).toMatchObject({ latestRevision: 2, seenRevision: 1, unreadCount: 1 });
});

it('does not clear unread state when a seen write uses a stale owner token', async () => {
  const firstToken = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-stale-seen-001'), firstToken);
  const displayed = await readDailyJourneyGiftProjection(firstToken);
  beginAccountGeneration('owner-b');

  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, firstToken)).toBe(false);

  const currentOwnerAToken = beginAccountGeneration('owner-a');
  expect(await readDailyJourneyGiftProjection(currentOwnerAToken)).toMatchObject({
    seenRevision: 0,
    unreadCount: 1,
  });
});

it('does not clear unread state when the durable seen write fails', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-failed-seen-01'), token);
  const displayed = await readDailyJourneyGiftProjection(token);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('simulated_seen_write_failure'));

  await expect(markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, token))
    .rejects.toThrow('simulated_seen_write_failure');

  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({ seenRevision: 0, unreadCount: 1 });
});

it('returns missing for unknown operations without fabricating a claim receipt', async () => {
  const token = beginAccountGeneration('owner-a');
  expect(await readDailyJourneyGiftClaimState('daily-dev-does-not-exist', token)).toBe('missing');
});
