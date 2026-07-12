export {};

type Row = Record<string, unknown>;
type Store = Record<string, Record<string, Row | undefined>>;

let currentDb: ReturnType<typeof makeDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, {
    FieldPath: { documentId: () => '__name__' },
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  }),
}));

const {
  adminListCacheEntries,
  adminExportCacheEntries,
  adminPreviewCacheReset,
  adminResetCacheEntry,
} = require('./admin_cache_control');

function makeDb(initial: Store = {}) {
  const store: Store = Object.fromEntries(Object.entries(initial).map(([collection, docs]) => [collection, { ...docs }]));
  let reads = 0;
  let autoId = 0;

  const snapshot = (collection: string, id: string) => {
    const value = store[collection]?.[id];
    return { id, exists: value !== undefined, data: () => value ? { ...value } : undefined };
  };

  const document = (collection: string, id: string): any => ({
    collection, id, path: `${collection}/${id}`,
    get: async () => { reads += 1; return snapshot(collection, id); },
    create: async (value: Row) => {
      store[collection] = store[collection] || {};
      if (store[collection][id] !== undefined) throw new Error('already-exists');
      store[collection][id] = { ...value };
    },
  });

  const query = (collection: string, status = '', after = '', max = Infinity): any => {
    const api: any = {
      where: (field: string, op: string, value: unknown) => {
        if (field !== 'status' || op !== '==') throw new Error('unexpected where');
        return query(collection, String(value), after, max);
      },
      orderBy: () => api,
      startAfter: (id: string) => query(collection, status, id, max),
      limit: (value: number) => query(collection, status, after, value),
      count: () => ({
        get: async () => ({ data: () => ({ count: Object.entries(store[collection] || {}).filter(([id, value]) => !!value && id > after && (!status || value.status === status)).length }) }),
      }),
      get: async () => {
        reads += 1;
        const docs = Object.entries(store[collection] || {})
          .filter(([id, value]) => !!value && id > after && (!status || value.status === status))
          .sort(([left], [right]) => left.localeCompare(right))
          .slice(0, max)
          .map(([id]) => snapshot(collection, id));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
    return api;
  };

  const db: any = {
    collection: (name: string) => Object.assign(query(name), { doc: (id?: string) => document(name, id || `auto-${++autoId}`) }),
    runTransaction: async (worker: (tx: any) => Promise<unknown>) => worker({
      get: async (ref: { collection: string; id: string }) => { reads += 1; return snapshot(ref.collection, ref.id); },
      create: (ref: { collection: string; id: string }, value: Row) => {
        store[ref.collection] = store[ref.collection] || {};
        if (store[ref.collection][ref.id] !== undefined) throw new Error('already-exists');
        store[ref.collection][ref.id] = { ...value };
      },
      update: (ref: { collection: string; id: string }, value: Row) => {
        if (!store[ref.collection]?.[ref.id]) throw new Error('not-found');
        store[ref.collection][ref.id] = { ...store[ref.collection][ref.id], ...value };
      },
      delete: (ref: { collection: string; id: string }) => { delete store[ref.collection]?.[ref.id]; },
    }),
  };
  currentDb = db;
  return { db, store, get reads() { return reads; } };
}

function request(data: Row, role = 'owner', uid = 'admin-a') {
  return { auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } }, data, rawRequest: { headers: {} }, app: {} };
}

function run(fn: any, req: ReturnType<typeof request>) {
  return typeof fn.run === 'function' ? fn.run(req) : fn(req);
}

const hashA = 'a'.repeat(40);
const hashB = 'b'.repeat(40);

describe('admin cache control callables', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(2_000_000));
  afterEach(() => jest.restoreAllMocks());

  test('rejects unauthorized roles before reading cache data', async () => {
    const state = makeDb({ phrase_explanations: { [hashA]: { status: 'ready', text: 'private cache' } } });
    await expect(run(adminListCacheEntries, request({ source: 'phrase_explanations' }, 'support')))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.reads).toBe(0);
  });

  test('returns exact status counts and redacted stable-id pages', async () => {
    makeDb({ phrase_explanations: {
      [hashA]: { status: 'ready', lang: 'ru', schemaVersion: 6, phraseEn: 'Hello', text: 'Explanation', authUid: 'private' },
      [hashB]: { status: 'rejected', lang: 'uk', schemaVersion: 5, phraseEn: 'Bye', text: 'Old', tokenUsage: 99 },
    } });
    const result = await run(adminListCacheEntries, request({ source: 'phrase_explanations', pageSize: 1 }, 'analyst'));
    expect(result.summary).toEqual({ total: 2, ready: 1, pending: 0, rejected: 1, other: 0, currentSchemaVersion: 6 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('authUid');
    expect(result.items[0]).not.toHaveProperty('tokenUsage');
    expect(result.nextCursor).toBeTruthy();
  });

  test('exports up to 500 matches, reports truncation, and replays the immutable payload', async () => {
    const entries = Object.fromEntries(Array.from({ length: 501 }, (_, index) => {
      const id = index.toString(16).padStart(40, '0');
      return [id, { status: 'ready', lang: 'ru', schemaVersion: 6, phraseEn: `Phrase ${index}`, text: `Explanation ${index}` }];
    }));
    const state = makeDb({ phrase_explanations: entries });
    const input = {
      source: 'phrase_explanations', format: 'json', reason: 'full review', requestId: 'export-request-1', idempotencyKey: 'export-operation-1',
    };
    const first = await run(adminExportCacheEntries, request(input));
    expect(first).toMatchObject({ ok: true, count: 500, scannedCount: 501, truncated: true, replayed: false });
    const originalPayload = first.payload;
    state.store.phrase_explanations['0'.repeat(40)] = { ...state.store.phrase_explanations['0'.repeat(40)], text: 'Changed after export' };
    const replay = await run(adminExportCacheEntries, request(input));
    expect(replay).toMatchObject({ ok: true, count: 500, scannedCount: 501, truncated: true, replayed: true });
    expect(replay.payload).toBe(originalPayload);
    expect(replay.payload).not.toContain('Changed after export');
    expect(Object.values(state.store.admin_log || {})).toHaveLength(1);
  });

  test('blocks fresh pending reset previews', async () => {
    makeDb({ choice_explanations: { [hashA]: { status: 'pending', createdAtMs: Date.now(), updatedAtMs: Date.now() } } });
    await expect(run(adminPreviewCacheReset, request({ source: 'choice_explanations', documentId: hashA, reason: 'stuck content', requestId: 'preview-1' })))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'cache_generation_in_progress' });
  });

  test('binds reset to actor, exact confirmation and unchanged document, then replays safely', async () => {
    const original = { status: 'ready', lang: 'ru', schemaVersion: 6, phraseEn: 'Hello', text: 'Wrong explanation', updatedAtMs: 100 };
    const state = makeDb({ phrase_explanations: { [hashA]: original } });
    const preview = await run(adminPreviewCacheReset, request({ source: 'phrase_explanations', documentId: hashA, reason: 'factual error', requestId: 'preview-1' }));

    await expect(run(adminResetCacheEntry, request({
      previewId: preview.previewId, confirmation: preview.confirmation, reason: 'factual error', requestId: 'reset-1', idempotencyKey: 'reset-op-1',
    }, 'owner', 'admin-b'))).rejects.toMatchObject({ code: 'failed-precondition' });

    state.store.phrase_explanations[hashA] = { ...original, text: 'Changed after preview' };
    await expect(run(adminResetCacheEntry, request({
      previewId: preview.previewId, confirmation: preview.confirmation, reason: 'factual error', requestId: 'reset-1', idempotencyKey: 'reset-op-1',
    }))).rejects.toMatchObject({ code: 'failed-precondition', message: 'cache entry changed after preview' });

    state.store.phrase_explanations[hashA] = original;
    const result = await run(adminResetCacheEntry, request({
      previewId: preview.previewId, confirmation: preview.confirmation, reason: 'factual error', requestId: 'reset-1', idempotencyKey: 'reset-op-1',
    }));
    expect(result).toEqual({ ok: true, source: 'phrase_explanations', documentId: hashA, replayed: false });
    expect(state.store.phrase_explanations[hashA]).toBeUndefined();
    expect(Object.values(state.store.admin_log || {})).toHaveLength(1);

    await expect(run(adminResetCacheEntry, request({
      previewId: preview.previewId, confirmation: preview.confirmation, reason: 'factual error', requestId: 'reset-1', idempotencyKey: 'reset-op-1',
    }))).resolves.toEqual({ ok: true, source: 'phrase_explanations', documentId: hashA, replayed: true });
  });
});
