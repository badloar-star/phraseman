import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-fixed-1234') }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import {
  enqueueShardDelta,
  hasQuarantinedShardDeltaQueue,
  newShardOpId,
  readShardDeltaQueue,
  removeShardDeltas,
  shardDeltaQueueStorageKey,
  type PendingShardDelta,
} from '../app/shards_delta_queue';

const LEGACY_QUEUE_KEY = 'shards_delta_queue_v1';
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
  ...over,
});

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

describe('shards_delta_queue v2 account isolation', () => {
  it('newShardOpId matches the server opId charset/length', () => {
    expect(newShardOpId()).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
  });

  it('enqueues and reads an owner-bound pending delta', async () => {
    await enqueueShardDelta(entry('op-a-11111111'));

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([
      expect.objectContaining({
        opId: 'op-a-11111111',
        ownerStableId: OWNER_A,
        delta: 2,
        type: 'earn',
      }),
    ]);
  });

  it('is idempotent within one owner queue', async () => {
    await enqueueShardDelta(entry('op-dup-1234'));
    await enqueueShardDelta(entry('op-dup-1234', { delta: 99 }));

    const queue = await readShardDeltaQueue(OWNER_A);
    expect(queue).toHaveLength(1);
    expect(queue[0].delta).toBe(2);
  });

  it('removes only confirmed opIds from the specified owner queue', async () => {
    await enqueueShardDelta(entry('op-1-aaaaaaaa'));
    await enqueueShardDelta(entry('op-2-bbbbbbbb', { type: 'spend', reason: 'card_pack' }));
    await enqueueShardDelta(entry('op-3-cccccccc'));

    await removeShardDeltas(OWNER_A, ['op-1-aaaaaaaa', 'op-3-cccccccc']);

    expect((await readShardDeltaQueue(OWNER_A)).map((item) => item.opId))
      .toEqual(['op-2-bbbbbbbb']);
  });

  it('removeShardDeltas with an empty id list is a no-op', async () => {
    await enqueueShardDelta(entry('op-noop-12345678'));
    const writesBefore = (AsyncStorage.setItem as jest.Mock).mock.calls.length;

    await removeShardDeltas(OWNER_A, []);

    expect(await readShardDeltaQueue(OWNER_A)).toHaveLength(1);
    expect((AsyncStorage.setItem as jest.Mock).mock.calls).toHaveLength(writesBefore);
  });

  it('isolates account A and B by storage key and entry owner', async () => {
    await enqueueShardDelta(entry('op-owner-a'));
    await enqueueShardDelta(entry('op-owner-b', { ownerStableId: OWNER_B }));

    expect((await readShardDeltaQueue(OWNER_A)).map((item) => item.opId)).toEqual(['op-owner-a']);
    expect((await readShardDeltaQueue(OWNER_B)).map((item) => item.opId)).toEqual(['op-owner-b']);
    expect(shardDeltaQueueStorageKey(OWNER_A)).not.toBe(shardDeltaQueueStorageKey(OWNER_B));
  });

  it('quarantines the whole raw queue when any embedded owner mismatches', async () => {
    const raw = JSON.stringify([
      entry('op-valid-owner'),
      entry('op-wrong-owner', { ownerStableId: OWNER_B }),
      { opId: 'op-ownerless', delta: 1, type: 'earn', reason: 'lesson_first' },
    ]);
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = raw;

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(true);
    expect(Object.values(mockStorage)).toContain(raw);
  });

  it('quarantines the whole raw queue when any v2 entry is structurally invalid', async () => {
    const raw = JSON.stringify([
      entry('op-structurally-valid'),
      { ...entry('bad-type'), type: 'invalid' },
      { ...entry('bad-delta'), delta: Number.NaN },
      { ...entry('bad-reason'), reason: 42 },
      null,
    ]);
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = raw;

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(Object.values(mockStorage)).toContain(raw);
  });

  it('rejects every non-canonical row shape before enqueueing it', async () => {
    const invalidEntries: PendingShardDelta[] = [
      entry('has space 1234'),
      entry('op-fractional', { delta: 1.5 }),
      entry('op-zero-time', { createdAtMs: 0 }),
      entry('op-long-reason', { reason: 'x'.repeat(65) }),
    ];

    for (const invalidEntry of invalidEntries) {
      await expect(enqueueShardDelta(invalidEntry)).resolves.toBe(false);
    }

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      shardDeltaQueueStorageKey(OWNER_A),
      expect.any(String),
    );
  });

  it('quarantines persisted rows that cannot be sent to the server unchanged', async () => {
    const raw = JSON.stringify([
      entry('op-valid-row'),
      entry('has space 1234'),
      entry('op-fractional', { delta: 1.5 }),
      entry('op-zero-time', { createdAtMs: 0 }),
      entry('op-long-reason', { reason: 'x'.repeat(65) }),
    ]);
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = raw;

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(Object.values(mockStorage)).toContain(raw);
  });

  it('recovers from corrupt v2 JSON and allows a new valid enqueue', async () => {
    const corruptRaw = '{not valid json';
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = corruptRaw;

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    const quarantineKeys = Object.keys(mockStorage).filter((key) =>
      key.startsWith('shards_delta_queue_v2_quarantine:'),
    );
    expect(quarantineKeys).toHaveLength(1);
    expect(mockStorage[quarantineKeys[0]]).toBe(corruptRaw);
    await enqueueShardDelta(entry('op-after-corrupt'));
    expect((await readShardDeltaQueue(OWNER_A)).map((item) => item.opId))
      .toEqual(['op-after-corrupt']);
  });

  it('preserves all 51 pending operations without dropping the oldest', async () => {
    for (let index = 0; index < 51; index += 1) {
      await enqueueShardDelta(entry(`op-${String(index).padStart(4, '0')}-zz`));
    }

    const queue = await readShardDeltaQueue(OWNER_A);
    expect(queue).toHaveLength(51);
    expect(queue[0].opId).toBe('op-0000-zz');
    expect(queue[50].opId).toBe('op-0050-zz');
  });

  it('fails closed at bounded capacity without dropping or replacing durable entries', async () => {
    const fullQueue = Array.from({ length: 1000 }, (_, index) =>
      entry(`op-cap-${String(index).padStart(4, '0')}`),
    );
    mockStorage[shardDeltaQueueStorageKey(OWNER_A)] = JSON.stringify(fullQueue);

    await expect(enqueueShardDelta(entry('op-over-capacity'))).resolves.toBe(false);
    const queue = await readShardDeltaQueue(OWNER_A);
    expect(queue).toHaveLength(1000);
    expect(queue[0].opId).toBe('op-cap-0000');
    expect(queue[999].opId).toBe('op-cap-0999');
  });

  it('quarantines ownerless v1 entries and never assigns them to the current owner', async () => {
    mockStorage[LEGACY_QUEUE_KEY] = JSON.stringify([
      { opId: 'legacy-ownerless', delta: 1, type: 'earn', reason: 'lesson_first', createdAtMs: 1 },
    ]);

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(await hasQuarantinedShardDeltaQueue(OWNER_A)).toBe(true);
    expect(mockStorage[LEGACY_QUEUE_KEY]).toBeUndefined();
    const quarantineKeys = Object.keys(mockStorage).filter((key) =>
      key.startsWith('shards_delta_queue_v1_quarantine:'),
    );
    expect(quarantineKeys).toHaveLength(1);
    expect(mockStorage[quarantineKeys[0]]).toContain('legacy-ownerless');
  });

  it('quarantines corrupt legacy JSON verbatim before removing the legacy key', async () => {
    mockStorage[LEGACY_QUEUE_KEY] = '{legacy corrupt bytes';

    expect(await readShardDeltaQueue(OWNER_A)).toEqual([]);
    expect(mockStorage[LEGACY_QUEUE_KEY]).toBeUndefined();
    const quarantineKeys = Object.keys(mockStorage).filter((key) =>
      key.startsWith('shards_delta_queue_v1_quarantine:'),
    );
    expect(quarantineKeys).toHaveLength(1);
    expect(mockStorage[quarantineKeys[0]]).toBe('{legacy corrupt bytes');
  });
});
