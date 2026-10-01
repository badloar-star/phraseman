import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import * as queueModule from '../app/shards_delta_queue';
import {
  hasQuarantinedShardDeltaQueue,
  readShardDeltaQueue,
  removeShardDeltas,
  shardDeltaQueueStorageKey,
  type PendingShardDelta,
} from '../app/shards_delta_queue';

// зачем (PM-289 этап 2, D70/D78): постановка в очередь и разбор легаси-карантина
// удалены вместе с начислениями/тратами жемчуга. Новых строк не появляется; старые
// читаются и снимаются перед выходом из аккаунта (auth_provider). Строки в
// хранилище кладём напрямую — так их оставили прежние версии приложения.

const LEGACY_QUEUE_KEY = 'shards_delta_queue_v1';
const LEGACY_QUARANTINE_KEY = 'shards_delta_queue_v1_quarantine:ownerless';
const OWNER_A = 'stable-owner-a';
const OWNER_B = 'stable-owner-b';
const mockStorage: Record<string, string> = {};

const entry = (opId: string, over: Partial<PendingShardDelta> = {}): PendingShardDelta => ({
  opId,
  ownerStableId: OWNER_A,
  delta: 2,
  type: 'earn',
  reason: 'lesson_first',
  createdAtMs: 1000,
  localApplied: true,
  ...over,
});

const seed = (owner: string, rows: PendingShardDelta[]): void => {
  mockStorage[shardDeltaQueueStorageKey(owner)] = JSON.stringify(rows);
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
});

describe('shards_delta_queue: остаток очереди удалённого жемчуга', () => {
  it('has no enqueue or legacy-recovery API left (removed, not stubbed)', () => {
    for (const removed of [
      'enqueueShardDelta',
      'enqueueAppliedShardDeltaWithStorage',
      'newShardOpId',
      'hasExactLegacyQuarantinedShardDelta',
      'consumeExactLegacyQuarantinedShardDelta',
    ]) {
      expect(queueModule).not.toHaveProperty(removed);
    }
  });

  it('removes only confirmed opIds from the specified owner queue', async () => {
    seed(OWNER_A, [
      entry('op-1-aaaaaaaa'),
      entry('op-2-bbbbbbbb', { type: 'spend', reason: 'card_pack' }),
      entry('op-3-cccccccc'),
    ]);

    await expect(removeShardDeltas(OWNER_A, ['op-1-aaaaaaaa', 'op-3-cccccccc'])).resolves.toBe(true);

    expect((await readShardDeltaQueue(OWNER_A)).map((item) => item.opId))
      .toEqual(['op-2-bbbbbbbb']);
  });

  it('removeShardDeltas with an empty id list is a no-op', async () => {
    seed(OWNER_A, [entry('op-noop-12345678')]);

    await removeShardDeltas(OWNER_A, []);

    expect(await readShardDeltaQueue(OWNER_A)).toHaveLength(1);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('isolates account A and B by storage key and entry owner', async () => {
    seed(OWNER_A, [entry('op-owner-a')]);
    seed(OWNER_B, [entry('op-owner-b', { ownerStableId: OWNER_B })]);

    expect((await readShardDeltaQueue(OWNER_A)).map((item) => item.opId)).toEqual(['op-owner-a']);
    expect((await readShardDeltaQueue(OWNER_B)).map((item) => item.opId)).toEqual(['op-owner-b']);
    expect(shardDeltaQueueStorageKey(OWNER_A)).not.toBe(shardDeltaQueueStorageKey(OWNER_B));
  });

  it('quarantines the whole raw queue when any embedded owner mismatches', async () => {
    const raw = JSON.stringify([
      entry('op-valid-owner'),
      entry('op-wrong-owner', { ownerStableId: OWNER_B }),
    ]);
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = raw;

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(true);
    expect(Object.values(mockStorage)).toContain(raw);
  });

  it('quarantines ownerless v1 entries and never assigns them to the current owner', async () => {
    mockStorage[LEGACY_QUEUE_KEY] = JSON.stringify([
      { opId: 'legacy-ownerless', delta: 1, type: 'earn', reason: 'lesson_first', createdAtMs: 1 },
    ]);

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(true);
    expect(mockStorage[LEGACY_QUEUE_KEY]).toBeUndefined();
    expect(mockStorage[LEGACY_QUARANTINE_KEY]).toContain('legacy-ownerless');
    // Строки в карантине нельзя снимать обычным путём.
    seed(OWNER_A, [entry('op-after-legacy-quarantine')]);
    await expect(removeShardDeltas(OWNER_A, ['op-after-legacy-quarantine'])).resolves.toBe(false);
  });

  it('drops an empty legacy v1 queue without ever arming quarantine', async () => {
    mockStorage[LEGACY_QUEUE_KEY] = '[]';

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(false);
    expect(mockStorage[LEGACY_QUEUE_KEY]).toBeUndefined();
    expect(mockStorage[LEGACY_QUARANTINE_KEY]).toBeUndefined();
  });

  it('self-heals an already-emptied legacy quarantine instead of blocking forever', async () => {
    mockStorage[LEGACY_QUARANTINE_KEY] = '[]';

    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(false);
    expect(mockStorage[LEGACY_QUARANTINE_KEY]).toBeUndefined();
  });

  it('self-heals an already-emptied owner quarantine instead of blocking forever', async () => {
    const ownerQuarantineKey =
      `shards_delta_queue_v2_quarantine:${encodeURIComponent(OWNER_A)}`;
    mockStorage[ownerQuarantineKey] = '[]';

    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(false);
    expect(mockStorage[ownerQuarantineKey]).toBeUndefined();
  });

  it('keeps quarantine armed while a real pending row is still held', async () => {
    mockStorage[LEGACY_QUARANTINE_KEY] = JSON.stringify([
      { opId: 'legacy-real-row', delta: 7, type: 'spend', reason: 'avatar_aura', createdAtMs: 5 },
    ]);

    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(true);
    expect(mockStorage[LEGACY_QUARANTINE_KEY]).toBeDefined();
  });

  it('quarantines corrupt legacy JSON verbatim before removing the legacy key', async () => {
    mockStorage[LEGACY_QUEUE_KEY] = '{legacy corrupt bytes';

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(mockStorage[LEGACY_QUEUE_KEY]).toBeUndefined();
    expect(mockStorage[LEGACY_QUARANTINE_KEY]).toBe('{legacy corrupt bytes');
  });
});
