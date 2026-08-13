import { reserveEnrichmentSlot, recordEnrichmentResult, JARVIS_LLM_ENRICHMENT_CACHE_COLLECTION } from './llm_enrichment_cache';

/**
 * Тестовый Firestore: Map вместо реальной базы, транзакция читает и пишет
 * в тот же Map синхронно — этого достаточно, чтобы проверить логику
 * «занято/свободно», не поднимая эмулятор.
 */
function makeFakeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const db = {
    doc(path: string) {
      return {
        path,
        async get() {
          const data = store.get(path);
          return { exists: data !== undefined, data: () => data };
        },
        async set(data: Record<string, unknown>, opts?: { merge?: boolean }) {
          const existing = opts?.merge ? store.get(path) : undefined;
          store.set(path, { ...existing, ...data });
        },
      };
    },
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const tx = {
        async get(ref: { path: string }) {
          const data = store.get(ref.path);
          return { exists: data !== undefined, data: () => data };
        },
        set(ref: { path: string }, data: Record<string, unknown>) {
          store.set(ref.path, { ...data });
        },
      };
      return fn(tx);
    },
  };
  return { db: db as unknown as FirebaseFirestore.Firestore, store };
}

describe('reserveEnrichmentSlot', () => {
  test('first call for a fresh contentHash reserves the slot', async () => {
    const { db } = makeFakeDb();
    const verdict = await reserveEnrichmentSlot({ db, contentHash: 'hash-1', nowMs: 1_000 });
    expect(verdict.reserved).toBe(true);
  });

  test('a retry for the SAME contentHash does not reserve twice — this is the double-charge guard', async () => {
    const { db } = makeFakeDb();
    await reserveEnrichmentSlot({ db, contentHash: 'hash-1', nowMs: 1_000 });
    const secondAttempt = await reserveEnrichmentSlot({ db, contentHash: 'hash-1', nowMs: 1_050 });
    expect(secondAttempt.reserved).toBe(false);
  });

  test('two different decisions (different contentHash) both reserve independently', async () => {
    const { db } = makeFakeDb();
    const first = await reserveEnrichmentSlot({ db, contentHash: 'hash-a', nowMs: 1_000 });
    const second = await reserveEnrichmentSlot({ db, contentHash: 'hash-b', nowMs: 1_000 });
    expect(first.reserved).toBe(true);
    expect(second.reserved).toBe(true);
  });

  test('returns a completed cached narrative to the next retry', async () => {
    const { db } = makeFakeDb();
    expect((await reserveEnrichmentSlot({ db, contentHash: 'cached', nowMs: 1_000 })).reserved).toBe(true);
    await recordEnrichmentResult({ db, contentHash: 'cached', narrative: 'Готовый план', nowMs: 1_001 });
    await expect(reserveEnrichmentSlot({ db, contentHash: 'cached', nowMs: 1_002 }))
      .resolves.toEqual({ reserved: false, narrative: 'Готовый план' });
  });

  test('storage failure fails closed — refuses the slot rather than risking a double spend', async () => {
    const brokenDb = {
      doc() {
        return {
          path: 'x',
          async get() { throw new Error('firestore down'); },
        };
      },
      async runTransaction() { throw new Error('firestore down'); },
    } as unknown as FirebaseFirestore.Firestore;
    const verdict = await reserveEnrichmentSlot({ db: brokenDb, contentHash: 'hash-1', nowMs: 1_000 });
    expect(verdict.reserved).toBe(false);
  });

  test('a slot older than the stale window is treated as abandoned and can be re-reserved', async () => {
    const { db } = makeFakeDb();
    await reserveEnrichmentSlot({ db, contentHash: 'hash-1', nowMs: 1_000 });
    // зачем: если процесс упал ПОСЛЕ резервации, но ДО записи результата,
    // слот навсегда блокировал бы повторные попытки для этого решения.
    const staleRetry = await reserveEnrichmentSlot({
      db, contentHash: 'hash-1', nowMs: 1_000 + 60 * 60 * 1_000 + 1,
    });
    expect(staleRetry.reserved).toBe(true);
  });
});

describe('recordEnrichmentResult', () => {
  test('writes the narrative under the same contentHash key used to reserve', async () => {
    const { db, store } = makeFakeDb();
    await reserveEnrichmentSlot({ db, contentHash: 'hash-1', nowMs: 1_000 });
    await recordEnrichmentResult({ db, contentHash: 'hash-1', narrative: 'текст', nowMs: 1_010 });
    const doc = store.get(`${JARVIS_LLM_ENRICHMENT_CACHE_COLLECTION}/hash-1`);
    expect(doc?.narrative).toBe('текст');
    expect(doc?.completedAtMs).toBe(1_010);
  });
});
