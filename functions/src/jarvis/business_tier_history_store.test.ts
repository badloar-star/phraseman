import {
  BUSINESS_TIER_HISTORY_COLLECTION,
  readBackfillCursor,
  readRecentHistory,
  writeBackfillCursor,
  writeHistoryPoints,
} from './business_tier_history_store';
import type { BusinessTierHistoryPoint } from './business_tier_history';

function makePoint(dayKey: string, cumulativeUsers: number): BusinessTierHistoryPoint {
  return {
    dayKey,
    cumulativeUsers,
    newUsers: 3,
    newPaying: 1,
    renewals: 1,
    refunds: 0,
    revenueProxy: 2,
    grossUsdMicros: 9_980_000,
    mrrEquivalentProceedsUsdMicros: 6_986_000,
    dayMoneyCoverage: 'complete',
    // null — типичная точка бэкфилла: активные за прошлый день ретроактивно неизвестны.
    activeUsers: null,
  };
}

/** Minimal fake Firestore double — batch/collection/doc/get/set, no real SDK. */
function makeFakeDb() {
  const stored = new Map<string, Record<string, unknown>>();
  const batches: Array<{ ops: Array<{ id: string; data: Record<string, unknown> }> }> = [];

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        get: async () => ({
          exists: stored.has(`${name}/${id}`),
          data: () => stored.get(`${name}/${id}`),
        }),
        set: async (data: Record<string, unknown>) => {
          stored.set(`${name}/${id}`, { ...(stored.get(`${name}/${id}` ) || {}), ...data });
        },
      }),
      orderBy: () => ({
        limit: (n: number) => ({
          get: async () => {
            const docs = [...stored.entries()]
              .filter(([key]) => key.startsWith(`${name}/`))
              .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // desc by id (matches __name__ desc)
              .slice(0, n)
              .map(([key, data]) => ({ id: key.slice(name.length + 1), data: () => data }));
            return { docs };
          },
        }),
      }),
    }),
    doc: (path: string) => {
      const [name, id] = path.split('/');
      return db.collection(name).doc(id);
    },
    batch: () => {
      const ops: Array<{ id: string; data: Record<string, unknown> }> = [];
      let collectionName = '';
      return {
        set: (docRef: { id: string }, data: Record<string, unknown>, _opts?: unknown) => {
          ops.push({ id: docRef.id, data });
        },
        commit: async () => {
          for (const op of ops) {
            stored.set(`${BUSINESS_TIER_HISTORY_COLLECTION}/${op.id}`, {
              ...(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/${op.id}`) || {}),
              ...op.data,
            });
          }
          batches.push({ ops });
        },
      };
    },
  };

  return { db: db as unknown as FirebaseFirestore.Firestore, stored, batches };
}

describe('writeHistoryPoints — idempotent merge writes, chunked at 400 per batch', () => {
  test('writes each point as a merged doc keyed by dayKey', async () => {
    const { db, stored } = makeFakeDb();
    const result = await writeHistoryPoints({
      db,
      points: [makePoint('2026-08-01', 100), makePoint('2026-08-02', 103)],
      nowMs: 555,
    });
    expect(result.written).toBe(2);
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({ cumulativeUsers: 100, writtenAtMs: 555 });
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-02`)).toMatchObject({ cumulativeUsers: 103 });
  });

  test('an empty points array writes nothing and never touches the batch', async () => {
    const { db, batches } = makeFakeDb();
    const result = await writeHistoryPoints({ db, points: [], nowMs: 1 });
    expect(result.written).toBe(0);
    expect(batches.length).toBe(0);
  });

  test('re-writing the same dayKey overwrites, not duplicates', async () => {
    const { db, stored } = makeFakeDb();
    await writeHistoryPoints({ db, points: [makePoint('2026-08-01', 100)], nowMs: 1 });
    await writeHistoryPoints({ db, points: [makePoint('2026-08-01', 200)], nowMs: 2 });
    expect(stored.size).toBe(1);
    expect(stored.get(`${BUSINESS_TIER_HISTORY_COLLECTION}/2026-08-01`)).toMatchObject({ cumulativeUsers: 200 });
  });

  test('chunks large point arrays into multiple batch commits of at most 400', async () => {
    const { db, batches } = makeFakeDb();
    const points = Array.from({ length: 850 }, (_, i) => makePoint(`day-${i}`, i));
    await writeHistoryPoints({ db, points, nowMs: 1 });
    expect(batches.length).toBe(3);
    expect(batches[0].ops.length).toBe(400);
    expect(batches[1].ops.length).toBe(400);
    expect(batches[2].ops.length).toBe(50);
  });
});

describe('readRecentHistory — returns ascending-by-day points capped at a sane limit', () => {
  test('returns points sorted ascending by day, most recent last', async () => {
    const { db } = makeFakeDb();
    await writeHistoryPoints({ db, points: [makePoint('2026-08-01', 1), makePoint('2026-08-03', 3), makePoint('2026-08-02', 2)], nowMs: 1 });
    const recent = await readRecentHistory({ db, limit: 10 });
    expect(recent.map((p) => p.dayKey)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  test('respects the requested limit', async () => {
    const { db } = makeFakeDb();
    await writeHistoryPoints({
      db,
      points: ['2026-08-01', '2026-08-02', '2026-08-03'].map((d) => makePoint(d, 1)),
      nowMs: 1,
    });
    const recent = await readRecentHistory({ db, limit: 2 });
    expect(recent.length).toBe(2);
    // most recent 2 days, still ascending
    expect(recent.map((p) => p.dayKey)).toEqual(['2026-08-02', '2026-08-03']);
  });

  test('an empty history returns an empty array, not an error', async () => {
    const { db } = makeFakeDb();
    const recent = await readRecentHistory({ db, limit: 10 });
    expect(recent).toEqual([]);
  });
});

describe('backfill cursor — resumable state for the continuable backfill callable', () => {
  test('an unwritten cursor reads as not-started', async () => {
    const { db } = makeFakeDb();
    const state = await readBackfillCursor(db);
    expect(state).toEqual({ lastUserDocId: null, lastCompletedDayKey: null, cumulativeUsers: 0, done: false, updatedAtMs: 0 });
  });

  test('writing then reading the cursor round-trips, including the running cumulative', () => {
    return (async () => {
      const { db } = makeFakeDb();
      await writeBackfillCursor(db, {
        lastUserDocId: 'user_123',
        lastCompletedDayKey: '2026-07-15',
        cumulativeUsers: 4_200,
        done: false,
        nowMs: 42,
      });
      const state = await readBackfillCursor(db);
      expect(state).toEqual({
        lastUserDocId: 'user_123',
        lastCompletedDayKey: '2026-07-15',
        cumulativeUsers: 4_200,
        done: false,
        updatedAtMs: 42,
      });
    })();
  });

  test('marking done persists', async () => {
    const { db } = makeFakeDb();
    await writeBackfillCursor(db, {
      lastUserDocId: 'user_999',
      lastCompletedDayKey: '2026-08-01',
      cumulativeUsers: 9_000,
      done: true,
      nowMs: 99,
    });
    const state = await readBackfillCursor(db);
    expect(state.done).toBe(true);
  });
});
