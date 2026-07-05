// K3: офлайн-очередь неотправленных дельт осколков. Гарантии: идемпотентная
// постановка (один opId — одна запись), точечное удаление подтверждённых,
// устойчивость к битому JSON, кап длины.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-fixed-1234') }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import {
  enqueueShardDelta,
  newShardOpId,
  readShardDeltaQueue,
  removeShardDeltas,
  type PendingShardDelta,
} from '../app/shards_delta_queue';

const QUEUE_KEY = 'shards_delta_queue_v1';
const mockStorage: Record<string, string> = {};

const entry = (opId: string, over: Partial<PendingShardDelta> = {}): PendingShardDelta => ({
  opId,
  delta: 2,
  type: 'earn',
  reason: 'lesson_first',
  createdAtMs: 1000,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('shards_delta_queue', () => {
  it('newShardOpId matches the server opId charset/length', () => {
    expect(newShardOpId()).toMatch(/^[A-Za-z0-9_-]{8,80}$/);
  });

  it('enqueues a pending delta and reads it back', async () => {
    await enqueueShardDelta(entry('op-a-11111111'));
    const queue = await readShardDeltaQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ opId: 'op-a-11111111', delta: 2, type: 'earn' });
  });

  it('is idempotent: enqueueing the same opId twice keeps one entry', async () => {
    await enqueueShardDelta(entry('op-dup-1234'));
    await enqueueShardDelta(entry('op-dup-1234', { delta: 99 }));
    const queue = await readShardDeltaQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].delta).toBe(2); // первая запись сохранена, не перезаписана
  });

  it('removes only the confirmed opIds', async () => {
    await enqueueShardDelta(entry('op-1-aaaaaaaa'));
    await enqueueShardDelta(entry('op-2-bbbbbbbb', { type: 'spend', reason: 'card_pack' }));
    await enqueueShardDelta(entry('op-3-cccccccc'));
    await removeShardDeltas(['op-1-aaaaaaaa', 'op-3-cccccccc']);
    const queue = await readShardDeltaQueue();
    expect(queue.map((q) => q.opId)).toEqual(['op-2-bbbbbbbb']);
  });

  it('removeShardDeltas([]) is a no-op', async () => {
    await enqueueShardDelta(entry('op-x-12345678'));
    await removeShardDeltas([]);
    expect(await readShardDeltaQueue()).toHaveLength(1);
  });

  it('tolerates corrupt queue JSON (returns empty, does not throw)', async () => {
    mockStorage[QUEUE_KEY] = '{not valid json';
    expect(await readShardDeltaQueue()).toEqual([]);
    // и поверх мусора можно снова поставить в очередь
    await enqueueShardDelta(entry('op-recover-1'));
    expect(await readShardDeltaQueue()).toHaveLength(1);
  });

  it('filters out structurally invalid entries on read', async () => {
    mockStorage[QUEUE_KEY] = JSON.stringify([
      { opId: 'ok-entry-1', delta: 1, type: 'earn', reason: 'r' },
      { opId: 'bad-type', delta: 1, type: 'weird', reason: 'r' },
      { delta: 1, type: 'earn', reason: 'r' }, // нет opId
      null,
    ]);
    const queue = await readShardDeltaQueue();
    expect(queue.map((q) => q.opId)).toEqual(['ok-entry-1']);
  });

  it('caps the queue length, dropping the oldest overflow', async () => {
    for (let i = 0; i < 55; i += 1) {
      await enqueueShardDelta(entry(`op-${String(i).padStart(4, '0')}-zz`));
    }
    const queue = await readShardDeltaQueue();
    expect(queue).toHaveLength(50);
    // Старейшие (0..4) вытеснены, новейший (54) на месте.
    expect(queue[0].opId).toBe('op-0005-zz');
    expect(queue[queue.length - 1].opId).toBe('op-0054-zz');
  });
});
