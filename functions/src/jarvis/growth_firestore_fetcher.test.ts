import { fetchGrowthSource, MAX_GROWTH_ROWS_PER_SOURCE, GROWTH_LOOKBACK_MS, GROWTH_PAGE_SIZE } from './growth_firestore_fetcher';

interface FakeDoc { readonly data: () => Record<string, unknown>; }
interface FakeDocSnapshot {
  readonly exists: boolean;
  readonly data: () => Record<string, unknown> | undefined;
}
interface FakeQuery {
  orderBy: jest.Mock;
  limit: jest.Mock;
  select: jest.Mock;
  startAfter: jest.Mock;
  get: jest.Mock;
}

function makeFakeCollection(docs: readonly FakeDoc[] | readonly (readonly FakeDoc[])[], overrides: Partial<FakeQuery> = {}) {
  const pages = docs.length > 0 && Array.isArray(docs[0]) ? docs as readonly (readonly FakeDoc[])[] : [docs as readonly FakeDoc[]];
  let page = 0;
  const query: FakeQuery = {
    orderBy: jest.fn(() => query),
    limit: jest.fn(() => query),
    select: jest.fn(() => query),
    startAfter: jest.fn(() => { page += 1; return query; }),
    get: jest.fn(async () => ({ docs: pages[page] ?? [] })),
    ...overrides,
  };
  return query;
}

function doc(row: Record<string, unknown>): FakeDoc { return { data: () => row }; }

function docSnapshot(row?: Record<string, unknown>): FakeDocSnapshot {
  return { exists: row !== undefined, data: () => row };
}

function dailyCollection(rows: Readonly<Record<string, Record<string, unknown> | undefined>>) {
  return {
    doc: jest.fn((dayKey: string) => ({
      get: jest.fn(async () => docSnapshot(rows[dayKey])),
    })),
  };
}

class FakeTimestamp {
  constructor(private readonly ms: number) {}
  toMillis(): number { return this.ms; }
}

describe('Jarvis growth Firestore fetcher — users.created_at can be number/string/Timestamp (same field as admin_daily_digest.ts:702)', () => {
  test('prefers the server daily aggregate and does not scan users', async () => {
    const nowMs = Date.parse('2026-08-08T12:00:00.000Z');
    const users = makeFakeCollection([doc({ created_at: nowMs - 1_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: users as unknown as FirebaseFirestore.CollectionReference,
      dailyCollection: dailyCollection({
        '2026-08-08': {
          schemaVersion: 1,
          dayKey: '2026-08-08',
          newUsers: 3,
          source: 'authEnsureStableLink:first_auth_link',
        },
      }) as unknown as FirebaseFirestore.CollectionReference,
      nowMs,
    });

    expect(result).toMatchObject({
      state: 'ready',
      count: 3,
      provenance: 'server_daily_aggregate',
      periodKey: '2026-08-08',
      truncated: false,
    });
    expect(users.orderBy).not.toHaveBeenCalled();
  });

  test('an absent daily doc remains degraded because no backfill or cutover marker proves zero', async () => {
    const nowMs = Date.parse('2026-08-08T12:00:00.000Z');
    const users = makeFakeCollection([doc({ created_at: nowMs - 1_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: users as unknown as FirebaseFirestore.CollectionReference,
      dailyCollection: dailyCollection({}) as unknown as FirebaseFirestore.CollectionReference,
      nowMs,
    });

    expect(result).toMatchObject({
      state: 'truncated',
      count: null,
      provenance: 'degraded_legacy_users_sample',
      truncated: true,
    });
    expect(users.orderBy).toHaveBeenCalledTimes(1);
  });

  test('before aggregate cutover is established, uses one bounded legacy page and marks it degraded', async () => {
    const nowMs = Date.parse('2026-08-08T12:00:00.000Z');
    const users = makeFakeCollection([doc({ platform: 'ios', created_at: nowMs - 1_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: users as unknown as FirebaseFirestore.CollectionReference,
      dailyCollection: dailyCollection({}) as unknown as FirebaseFirestore.CollectionReference,
      nowMs,
    });

    expect(result).toMatchObject({
      state: 'truncated',
      count: null,
      provenance: 'degraded_legacy_users_sample',
      truncated: true,
    });
    expect(users.limit).toHaveBeenCalledWith(GROWTH_PAGE_SIZE);
    expect(users.startAfter).not.toHaveBeenCalled();
  });

  test('reads the newest page by __name__ and filters created_at in memory, not via where', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: 5_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    // зачем НЕ where по времени: created_at хранится вперемешку как number/
    // string/Timestamp (клиент пишет его при первом cloud-sync, не единая
    // серверная функция) — Firestore where сравнивает только одинаковые типы
    // и молча теряет документы другого типа. См. admin_daily_digest.ts:698-711.
    expect(collection.orderBy).toHaveBeenCalledWith('__name__', 'desc');
    expect(result.state).toBe('truncated');
    expect(result.provenance).toBe('degraded_legacy_users_sample');
    expect(result.rows).toEqual([{ platform: 'ios' }]);
  });

  test('counts a user whose created_at is a Firestore Timestamp — this is the bug this fetch used to have', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'android', created_at: new FakeTimestamp(9_000) }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: 'android' }]);
  });

  test('counts a user whose created_at is an ISO string', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'web', created_at: new Date(9_500).toISOString() }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: 'web' }]);
  });

  test('a user older than the lookback window is excluded regardless of field type', async () => {
    const collection = makeFakeCollection([
      doc({ platform: 'ios', created_at: 10_000 - GROWTH_LOOKBACK_MS - 1 }),
      doc({ platform: 'android', created_at: new FakeTimestamp(10_000 - GROWTH_LOOKBACK_MS - 1) }),
    ]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([]);
    expect(result.state).toBe('truncated');
  });

  test('a document with an unparseable created_at is excluded, not miscounted as recent', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: null })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([]);
  });

  test('missing platform becomes null, not thrown away', async () => {
    const collection = makeFakeCollection([doc({ created_at: 5_000 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.rows).toEqual([{ platform: null }]);
  });

  test('zero rows in the legacy sample is degraded, not a trustworthy zero', async () => {
    const collection = makeFakeCollection([]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('truncated');
    expect(result.count).toBeNull();
  });

  test('the legacy fallback never paginates into a full users scan', async () => {
    const first = Array.from({ length: MAX_GROWTH_ROWS_PER_SOURCE + 1 }, () => doc({ platform: 'android', created_at: 9_000 }));
    const second = [doc({ platform: 'ios', created_at: 9_500 })];
    const collection = makeFakeCollection([first, second]);
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.truncated).toBe(true);
    expect(result.count).toBeNull();
    expect(result.provenance).toBe('degraded_legacy_users_sample');
    expect(result.rows).toHaveLength(MAX_GROWTH_ROWS_PER_SOURCE + 1);
    expect(collection.startAfter).not.toHaveBeenCalled();
  });

  test('future created_at values are excluded rather than counted as new signups', async () => {
    const collection = makeFakeCollection([doc({ platform: 'ios', created_at: 10_001 })]);
    const result = await fetchGrowthSource({
      sourceId: 'users', collection: collection as unknown as FirebaseFirestore.CollectionReference, nowMs: 10_000,
    });
    expect(result).toMatchObject({ state: 'truncated', rows: [], count: null });
  });

  test('a Firestore error fails closed', async () => {
    const collection = makeFakeCollection([], { get: jest.fn(async () => { throw new Error('unavailable'); }) });
    const result = await fetchGrowthSource({
      sourceId: 'users',
      collection: collection as unknown as FirebaseFirestore.CollectionReference,
      nowMs: 10_000,
    });
    expect(result.state).toBe('error');
    expect(result.rows).toEqual([]);
  });
});
