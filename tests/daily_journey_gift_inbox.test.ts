import AsyncStorage from '@react-native-async-storage/async-storage';
import { createHash } from 'crypto';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  commitDailyJourneyGift,
  recordDailyJourneyGiftSnapshotDisplayed,
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

const ownerPart = (ownerStableId: string): string => encodeURIComponent(ownerStableId);
const occurrenceStorageKey = (ownerStableId: string, operationId: string): string =>
  `daily_journey_gift_occurrence_v1:${ownerPart(ownerStableId)}:${encodeURIComponent(operationId)}`;
const claimReceiptStorageKey = (ownerStableId: string, operationId: string): string =>
  `daily_journey_gift_claim_receipt_v1:${ownerPart(ownerStableId)}:${encodeURIComponent(operationId)}`;

afterEach(() => {
  jest.restoreAllMocks();
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

it('recovers when a torn multiSet persisted only the projection', async () => {
  const token = beginAccountGeneration('owner-a');
  const operation = gift('daily-dev-projection-only-torn');
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    const projectionPair = pairs.find(([key]) => key.startsWith('daily_journey_gift_projection_v1:'));
    if (!projectionPair) throw new Error('missing_projection_pair');
    storage[projectionPair[0]] = projectionPair[1];
    throw new Error('simulated_projection_only_torn_commit');
  });

  await expect(commitDailyJourneyGift(operation, token))
    .rejects.toThrow('simulated_projection_only_torn_commit');
  expect(Object.keys(storage).some((key) => key.startsWith('daily_journey_gift_prepared_v1:'))).toBe(true);
  expect(storage[occurrenceStorageKey('owner-a', operation.operationId)]).toBeUndefined();

  const recovered = await commitDailyJourneyGift(operation, token);

  expect(recovered.status).toBe('committed');
  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({
    pendingCount: 1,
    unreadCount: 1,
    latestRevision: 1,
  });
  expect(Object.keys(storage).some((key) => key.startsWith('daily_journey_gift_prepared_v1:'))).toBe(false);
  expect((await commitDailyJourneyGift(operation, token)).status).toBe('already_committed');
});

it('recovers when a torn multiSet persisted only the occurrence', async () => {
  const token = beginAccountGeneration('owner-a');
  const operation = gift('daily-dev-occurrence-only-torn');
  (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async (
    pairs: readonly (readonly [string, string])[],
  ) => {
    const occurrencePair = pairs.find(([key]) => key.startsWith('daily_journey_gift_occurrence_v1:'));
    if (!occurrencePair) throw new Error('missing_occurrence_pair');
    storage[occurrencePair[0]] = occurrencePair[1];
    throw new Error('simulated_occurrence_only_torn_commit');
  });

  await expect(commitDailyJourneyGift(operation, token))
    .rejects.toThrow('simulated_occurrence_only_torn_commit');
  expect(storage[occurrenceStorageKey('owner-a', operation.operationId)]).toBeDefined();

  const recovered = await commitDailyJourneyGift(operation, token);

  expect(recovered.status).toBe('committed');
  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({
    pendingCount: 1,
    unreadCount: 1,
    latestRevision: 1,
  });
  expect(Object.keys(storage).some((key) => key.startsWith('daily_journey_gift_prepared_v1:'))).toBe(false);
  expect((await commitDailyJourneyGift(operation, token)).status).toBe('already_committed');
});

it('emits once when replaying A recovers a torn prepared B', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationA = gift('daily-dev-recovery-event-a');
  const operationB = gift('daily-dev-recovery-event-b');
  await commitDailyJourneyGift(operationA, token);
  (emitAppEvent as jest.Mock).mockClear();
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('simulated_torn_commit'));
  await expect(commitDailyJourneyGift(operationB, token)).rejects.toThrow('simulated_torn_commit');

  const replay = await commitDailyJourneyGift(operationA, token);

  expect(replay.status).toBe('already_committed');
  expect(emitAppEvent).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('daily_journey_gifts_changed');
  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({ pendingCount: 2, unreadCount: 2 });
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

  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, token)).toBe(false);
  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision + 1, token)).toBe(false);
  expect(await recordDailyJourneyGiftSnapshotDisplayed(displayed.latestRevision, token)).toBe(true);
  await commitDailyJourneyGift(gift('daily-dev-seen-000000002'), token);
  expect(await markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, token)).toBe(true);

  const afterConcurrentGift = await readDailyJourneyGiftProjection(token);
  expect(afterConcurrentGift).toMatchObject({ latestRevision: 2, seenRevision: 1, unreadCount: 1 });
});

it('does not clear unread state when a seen write uses a stale owner token', async () => {
  const firstToken = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-stale-seen-001'), firstToken);
  const displayed = await readDailyJourneyGiftProjection(firstToken);
  expect(await recordDailyJourneyGiftSnapshotDisplayed(displayed.latestRevision, firstToken)).toBe(true);
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
  expect(await recordDailyJourneyGiftSnapshotDisplayed(displayed.latestRevision, token)).toBe(true);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('simulated_seen_write_failure'));

  await expect(markDailyJourneyGiftSnapshotSeen(displayed.latestRevision, token))
    .rejects.toThrow('simulated_seen_write_failure');

  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({ seenRevision: 0, unreadCount: 1 });
});

it('returns missing for unknown operations without fabricating a claim receipt', async () => {
  const token = beginAccountGeneration('owner-a');
  expect(await readDailyJourneyGiftClaimState('daily-dev-does-not-exist', token)).toBe('missing');
});

it('fails closed when a durable occurrence was deleted before allocating another revision', async () => {
  const token = beginAccountGeneration('owner-a');
  const first = await commitDailyJourneyGift(gift('daily-dev-delete-head-0001'), token);
  await commitDailyJourneyGift(gift('daily-dev-delete-head-0002'), token);
  delete storage[occurrenceStorageKey('owner-a', first.occurrence.operationId)];

  await expect(commitDailyJourneyGift(gift('daily-dev-delete-head-0003'), token))
    .rejects.toThrow('daily_journey_occurrence_revision_gap');
  expect(storage[occurrenceStorageKey('owner-a', 'daily-dev-delete-head-0003')]).toBeUndefined();
});

it('fails closed when the persisted projection is ahead of the immutable journal', async () => {
  const token = beginAccountGeneration('owner-a');
  const committed = await commitDailyJourneyGift(gift('daily-dev-projection-ahead'), token);
  delete storage[occurrenceStorageKey('owner-a', committed.occurrence.operationId)];

  await expect(readDailyJourneyGiftProjection(token)).rejects.toThrow('daily_journey_projection_ahead');
});

it.each([
  ['revision', 7],
  ['createdAtMs', 1],
])('detects modified occurrence %s metadata', async (field, value) => {
  const token = beginAccountGeneration('owner-a');
  const committed = await commitDailyJourneyGift(gift(`daily-dev-metadata-${field}`), token);
  const key = occurrenceStorageKey('owner-a', committed.occurrence.operationId);
  storage[key] = JSON.stringify({ ...JSON.parse(storage[key]), [field]: value });

  await expect(readDailyJourneyGiftProjection(token)).rejects.toThrow('daily_journey_occurrence_corrupt');
});

it('uses a stable golden SHA-256 vector that binds revision and creation metadata', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  const token = beginAccountGeneration('owner-a');

  const committed = await commitDailyJourneyGift(gift('daily-dev-golden-hash-0001'), token);

  expect(committed.occurrence.payloadFingerprint)
    .toBe('5a463191a8ab139f11f0684ab89fe730e4f95fa3de32991bdb0632be26069906');
});

it.each([
  [{ ...gift('daily-dev-wrong-operation-id'), operationId: 42 as never }],
  [{ ...gift('daily-dev-wrong-cycle-type'), cycle: '1' as never }],
  [{ ...gift('daily-dev-wrong-day-type'), day: '1' as never }],
  [{ ...gift('daily-dev-wrong-amount-type'), reward: { kind: 'pearls' as const, amount: '10' as never } }],
])('rejects wrong runtime field types %#', async (input) => {
  const token = beginAccountGeneration('owner-a');
  await expect(commitDailyJourneyGift(input, token)).rejects.toThrow('daily_journey_occurrence_invalid');
});

it('checks account generation immediately after storage discovery before reading owner rows', async () => {
  const token = beginAccountGeneration('owner-a');
  await commitDailyJourneyGift(gift('daily-dev-mid-read-switch'), token);
  const keys = Object.keys(storage);
  (AsyncStorage.multiGet as jest.Mock).mockClear();
  (AsyncStorage.getAllKeys as jest.Mock).mockImplementationOnce(async () => {
    beginAccountGeneration('owner-b');
    return keys;
  });

  await expect(readDailyJourneyGiftProjection(token)).rejects.toThrow('daily_journey_account_stale');
  expect(AsyncStorage.multiGet).not.toHaveBeenCalled();
});

it('counts a valid claimed-but-unseen occurrence as unread while removing it from pending', async () => {
  const token = beginAccountGeneration('owner-a');
  const { occurrence } = await commitDailyJourneyGift(gift('daily-dev-claimed-unseen'), token);
  storage[claimReceiptStorageKey('owner-a', occurrence.operationId)] = JSON.stringify({
    schemaVersion: 'daily-journey-gift-claim-receipt.v1',
    claimOperationId: `daily-journey-gift-claim:${occurrence.operationId}`,
    operationId: occurrence.operationId,
    ownerStableId: occurrence.ownerStableId,
    occurrenceFingerprint: occurrence.payloadFingerprint,
    reward: occurrence.reward,
    claimedAtMs: occurrence.createdAtMs + 1,
  });

  expect(await readDailyJourneyGiftClaimState(occurrence.operationId, token)).toBe('claimed');
  expect(await readDailyJourneyGiftProjection(token)).toMatchObject({ pendingCount: 0, unreadCount: 1 });
});

it.each([
  ['{torn-json'],
  [JSON.stringify({ schemaVersion: 'daily-journey-gift-claim-receipt.v1' })],
])('fails closed for a non-null corrupt claim receipt %#', async (receiptRaw) => {
  const token = beginAccountGeneration('owner-a');
  const { occurrence } = await commitDailyJourneyGift(gift('daily-dev-corrupt-claim'), token);
  storage[claimReceiptStorageKey('owner-a', occurrence.operationId)] = receiptRaw;

  await expect(readDailyJourneyGiftClaimState(occurrence.operationId, token))
    .rejects.toThrow('daily_journey_claim_receipt_corrupt');
  await expect(readDailyJourneyGiftProjection(token))
    .rejects.toThrow('daily_journey_claim_receipt_corrupt');
});

it('fails closed when a claim receipt reward does not exactly match the occurrence', async () => {
  const token = beginAccountGeneration('owner-a');
  const { occurrence } = await commitDailyJourneyGift(gift('daily-dev-mismatch-claim'), token);
  storage[claimReceiptStorageKey('owner-a', occurrence.operationId)] = JSON.stringify({
    schemaVersion: 'daily-journey-gift-claim-receipt.v1',
    claimOperationId: `daily-journey-gift-claim:${occurrence.operationId}`,
    operationId: occurrence.operationId,
    ownerStableId: occurrence.ownerStableId,
    occurrenceFingerprint: occurrence.payloadFingerprint,
    reward: { kind: 'pearls', amount: occurrence.reward.amount + 1 },
    claimedAtMs: occurrence.createdAtMs + 1,
  });

  await expect(readDailyJourneyGiftProjection(token))
    .rejects.toThrow('daily_journey_claim_receipt_corrupt');
});

it('emits a recovered-B change exactly once when requested C then fails with its original conflict', async () => {
  const token = beginAccountGeneration('owner-a');
  const operationA = gift('daily-dev-recover-b-fail-c-a');
  await commitDailyJourneyGift(operationA, token);
  (emitAppEvent as jest.Mock).mockClear();
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('simulated_torn_commit'));
  await expect(commitDailyJourneyGift(gift('daily-dev-recover-b-fail-c-b'), token))
    .rejects.toThrow('simulated_torn_commit');
  (emitAppEvent as jest.Mock).mockImplementationOnce(() => {
    throw new Error('simulated_listener_failure');
  });

  await expect(commitDailyJourneyGift({ ...operationA, reward: { kind: 'pearls', amount: 11 } }, token))
    .rejects.toThrow('daily_journey_occurrence_conflict');
  expect(emitAppEvent).toHaveBeenCalledTimes(1);
  expect(emitAppEvent).toHaveBeenCalledWith('daily_journey_gifts_changed');
});

it('emits recovery before preserving a later projection read corruption error', async () => {
  const token = beginAccountGeneration('owner-a');
  const { occurrence } = await commitDailyJourneyGift(gift('daily-dev-recovery-read-a'), token);
  (emitAppEvent as jest.Mock).mockClear();
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error('simulated_torn_commit'));
  await expect(commitDailyJourneyGift(gift('daily-dev-recovery-read-b'), token))
    .rejects.toThrow('simulated_torn_commit');
  storage[claimReceiptStorageKey('owner-a', occurrence.operationId)] = '{torn-claim';

  await expect(readDailyJourneyGiftProjection(token))
    .rejects.toThrow('daily_journey_claim_receipt_corrupt');
  expect(emitAppEvent).toHaveBeenCalledTimes(1);
});
