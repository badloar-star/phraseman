/**
 * PM-113: счётчик сохранений без realtime — один документ агрегата на каталог,
 * кэш 6 ч, пересчёт только устаревших роликов и не чаще раза в 6 ч.
 * PM-112-A3: значения берутся из серверного документа, мусор отбрасывается.
 */
import {
  createVideoSaveCountsClient,
  parseVideoSaveCounts,
  staleVideoSaveCountIds,
  VIDEO_SAVE_COUNTS_TTL_MS,
} from '../app/video_save_counts';

const V1 = 'dQw4w9WgXcQ';
const V2 = 'abc12345678';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
}

describe('video save counts client', () => {
  it('разбор документа отбрасывает мусор и отрицательные значения', () => {
    expect(parseVideoSaveCounts({ counts: { [V1]: { n: 3.7, atMs: 10 }, bad: { n: 1, atMs: 1 }, [V2]: { n: -5, atMs: 2 } } }))
      .toEqual({ [V1]: { n: 3, atMs: 10 }, [V2]: { n: 0, atMs: 2 } });
    expect(parseVideoSaveCounts(null)).toEqual({});
  });

  it('устаревшими считаются отсутствующие и старше 6 ч, не больше 100', () => {
    const now = 10 * VIDEO_SAVE_COUNTS_TTL_MS;
    const counts = { [V1]: { n: 1, atMs: now - 1000 }, [V2]: { n: 1, atMs: now - VIDEO_SAVE_COUNTS_TTL_MS } };
    expect(staleVideoSaveCountIds(counts, [V1, V2, 'zzzzzzzzzzz', 'bad'], now)).toEqual([V2, 'zzzzzzzzzzz']);
    const many = Array.from({ length: 150 }, (_, i) => `v${String(i).padStart(10, '0')}`);
    expect(staleVideoSaveCountIds({}, many, now)).toHaveLength(100);
  });

  it('один документ на каталог; повторные показы в течение 6 ч сеть не трогают', async () => {
    let now = 1_000_000;
    const readDoc = jest.fn(async () => ({ counts: { [V1]: { n: 4, atMs: now } } }));
    const refresh = jest.fn(async () => ({ ok: true }));
    const client = createVideoSaveCountsClient({ readDoc, refresh, storage: memoryStorage(), now: () => now });
    await expect(client.get([V1])).resolves.toEqual({ [V1]: { n: 4, atMs: now } });
    now += 60_000;
    await client.get([V1]);
    expect(readDoc).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(client.peek()[V1]?.n).toBe(4);
  });

  it('для ролика без агрегата просит пересчёт один раз и перечитывает документ', async () => {
    const now = 5_000_000;
    let serverCounts: Record<string, { n: number; atMs: number }> = {};
    const readDoc = jest.fn(async () => ({ counts: serverCounts }));
    const refresh = jest.fn(async (ids: readonly string[]) => {
      serverCounts = { ...serverCounts, ...Object.fromEntries(ids.map((id) => [id, { n: 2, atMs: now }])) };
      return { ok: true };
    });
    const client = createVideoSaveCountsClient({ readDoc, refresh, storage: memoryStorage(), now: () => now });
    await expect(client.get([V2])).resolves.toEqual({ [V2]: { n: 2, atMs: now } });
    expect(refresh).toHaveBeenCalledWith([V2]);
    await client.get([V2]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('сбой сети — последние известные значения, без исключения', async () => {
    const client = createVideoSaveCountsClient({
      readDoc: async () => { throw new Error('offline'); },
      refresh: async () => ({}),
      storage: memoryStorage(),
      now: () => 1,
    });
    await expect(client.get([V1])).resolves.toEqual({});
  });
});
