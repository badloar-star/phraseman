import { emptyMaxVoiceOpsDaily } from '../max_voice_ops';
import { fetchMaxvoiceSource } from './maxvoice_firestore_fetcher';

const NOW = Date.UTC(2026, 7, 21, 12);

function daily(dayKey: string, over: Record<string, unknown> = {}) {
  return { ...emptyMaxVoiceOpsDaily(dayKey, NOW), ...over };
}

function collection(rows: readonly Record<string, unknown>[], failing = false) {
  const orderBy = jest.fn((_field: string, _direction: string) => ({
    limit: jest.fn((_value: number) => ({
      get: async () => {
        if (failing) throw new Error('unavailable');
        return { docs: rows.map((row) => ({ data: () => row })) };
      },
    })),
  }));
  return { value: { orderBy } as unknown as FirebaseFirestore.CollectionReference, orderBy };
}

describe('Jarvis MAX voice fetcher — bounded content-free daily aggregates', () => {
  test('reads at most seven newest daily documents and sums only reliability counters', async () => {
    const source = collection([
      daily('2026-08-21', {
        callsStarted: 20, callsConnected: 18, callsCompleted: 15, reviewsReady: 14,
        reconnectAttempts: 3, reconnectRecovered: 2,
        mintRejections: 4,
        firstAudioLatencyBuckets: { lt1s: 5, '1to3s': 10, '3to8s': 2, gte8s: 1 },
      }),
      daily('2026-08-20', {
        callsStarted: 10, callsConnected: 9, callsCompleted: 8, reviewsReady: 8,
        reconnectAttempts: 2, reconnectRecovered: 2,
        mintRejections: 3,
        firstAudioLatencyBuckets: { lt1s: 4, '1to3s': 4, '3to8s': 1, gte8s: 0 },
      }),
    ]);

    const result = await fetchMaxvoiceSource({ collection: source.value, nowMs: NOW });

    expect(source.orderBy).toHaveBeenCalledWith('dayKey', 'desc');
    const ordered = source.orderBy.mock.results[0].value;
    expect(ordered.limit).toHaveBeenCalledWith(7);
    expect(result).toMatchObject({
      state: 'ready', sampledDays: 2, callsStarted: 30, callsConnected: 27,
      callsCompleted: 23, reviewsReady: 22, reconnectAttempts: 5,
      reconnectRecovered: 4, firstAudioGte8s: 1,
      mintRejections: 7,
    });
    expect(JSON.stringify(result)).not.toMatch(/uid|session|transcript|audioText/i);
  });

  test('an empty collection is honest empty evidence', async () => {
    const source = collection([]);
    await expect(fetchMaxvoiceSource({ collection: source.value, nowMs: NOW })).resolves.toMatchObject({
      state: 'empty', sampledDays: 0, callsStarted: 0,
    });
  });

  test('a content-bearing or malformed daily row fails closed', async () => {
    const source = collection([{ ...daily('2026-08-21'), transcript: 'must never be here' }]);
    await expect(fetchMaxvoiceSource({ collection: source.value, nowMs: NOW })).resolves.toMatchObject({
      state: 'error', callsStarted: null,
    });
  });

  test('a failed query reports unknown rather than fake zeros', async () => {
    const source = collection([], true);
    await expect(fetchMaxvoiceSource({ collection: source.value, nowMs: NOW })).resolves.toMatchObject({
      state: 'error', callsStarted: null, callsConnected: null,
    });
  });
});
