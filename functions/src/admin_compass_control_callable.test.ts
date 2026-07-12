export {};

type Row = Record<string, unknown>;
type Store = Record<string, Record<string, Row | undefined>>;
let currentDb: ReturnType<typeof makeDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}], initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, { FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) } }),
}));

const {
  adminApplyCompassChange,
  adminApproveCompassChange,
  adminPreviewCompassChange,
  adminRequestCompassApproval,
} = require('./admin_compass_control');

function makeDb(initial: Store = {}) {
  const store: Store = Object.fromEntries(Object.entries(initial).map(([collection, docs]) => [collection, { ...docs }]));
  let autoId = 0;
  const snapshot = (collection: string, id: string) => {
    const value = store[collection]?.[id];
    return { id, exists: value !== undefined, data: () => value ? { ...value } : undefined };
  };
  const ref = (collection: string, id: string): any => ({
    collection, id, path: `${collection}/${id}`,
    get: async () => snapshot(collection, id),
    create: async (value: Row) => {
      store[collection] = store[collection] || {};
      if (store[collection][id] !== undefined) throw new Error('already-exists');
      store[collection][id] = { ...value };
    },
  });
  const query = (collection: string): any => {
    const api: any = {
      where: () => api,
      count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
      doc: (id?: string) => ref(collection, id || `auto-${++autoId}`),
    };
    return api;
  };
  const write = (target: { collection: string; id: string }, value: Row, mode: 'create' | 'update' | 'set') => {
    store[target.collection] = store[target.collection] || {};
    if (mode === 'create' && store[target.collection][target.id] !== undefined) throw new Error('already-exists');
    if (mode === 'update' && store[target.collection][target.id] === undefined) throw new Error('not-found');
    store[target.collection][target.id] = mode === 'set' ? { ...value } : { ...(store[target.collection][target.id] || {}), ...value };
  };
  const db: any = {
    collection: query,
    runTransaction: async (worker: (tx: any) => Promise<unknown>) => worker({
      get: async (target: { collection: string; id: string }) => snapshot(target.collection, target.id),
      create: (target: { collection: string; id: string }, value: Row) => write(target, value, 'create'),
      update: (target: { collection: string; id: string }, value: Row) => write(target, value, 'update'),
      set: (target: { collection: string; id: string }, value: Row) => write(target, value, 'set'),
    }),
  };
  currentDb = db;
  return { db, store };
}

function request(data: Row, uid = 'admin-a', role = 'owner') {
  return { auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } }, data, rawRequest: { headers: {} }, app: {} };
}
function run(fn: any, req: ReturnType<typeof request>) { return typeof fn.run === 'function' ? fn.run(req) : fn(req); }
const mutation = { reason: 'Reviewed Compass impact and rollback path', requestId: 'request-1', idempotencyKey: 'operation-1' };

describe('admin Compass approval flow', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(2_000_000_000_000));
  afterEach(() => jest.restoreAllMocks());

  test('allows exact emergency-off preview and apply without second administrator', async () => {
    const state = makeDb({ remote_config: { app: { revision: 3, bools: { compass_enabled: true, unrelated: true }, texts: { banner: 'keep' } } } });
    const preview = await run(adminPreviewCompassChange, request({ expectedRevision: 3, patch: { bools: { compass_enabled: false } }, reason: 'Emergency stop', requestId: 'preview-1' }));
    expect(preview).toMatchObject({ requiresApproval: false, revision: 3 });
    const result = await run(adminApplyCompassChange, request({ ...mutation, reason: 'Emergency stop', previewId: preview.previewId, confirmation: preview.confirmation }));
    expect(result).toMatchObject({ ok: true, revision: 4, replayed: false });
    expect(state.store.remote_config.app).toMatchObject({ revision: 4, bools: { compass_enabled: false, unrelated: true }, texts: { banner: 'keep' } });
  });

  test('requires a different administrator for non-emergency changes and consumes exact approval once', async () => {
    const state = makeDb({ remote_config: { app: { revision: 5, bools: { compass_topic_map_enabled: true, unrelated: true } } } });
    const preview = await run(adminPreviewCompassChange, request({ expectedRevision: 5, patch: { bools: { compass_topic_map_enabled: false } }, reason: 'Controlled rollout', requestId: 'preview-1' }));
    expect(preview.requiresApproval).toBe(true);
    await expect(run(adminRequestCompassApproval, request({ ...mutation, reason: 'Replacement reason', idempotencyKey: 'replacement-reason', previewId: preview.previewId })))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'Compass approval request reason must match preview' });
    const requested = await run(adminRequestCompassApproval, request({ ...mutation, reason: 'Controlled rollout', previewId: preview.previewId }));
    await expect(run(adminApproveCompassChange, request({ ...mutation, idempotencyKey: 'self', approvalId: requested.approvalId })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(run(adminApproveCompassChange, request({ ...mutation, idempotencyKey: 'approve', approvalId: requested.approvalId }, 'admin-b')))
      .resolves.toMatchObject({ ok: true, replayed: false });
    const result = await run(adminApplyCompassChange, request({ ...mutation, reason: 'Controlled rollout', idempotencyKey: 'apply', previewId: preview.previewId, approvalId: requested.approvalId, confirmation: preview.confirmation }));
    expect(result).toMatchObject({ revision: 6, replayed: false });
    expect(state.store.remote_config.app).toMatchObject({ revision: 6, bools: { compass_topic_map_enabled: false, unrelated: true } });
    expect(state.store.admin_approval_requests[requested.approvalId]).toMatchObject({ status: 'consumed', consumedBy: 'admin-a' });
    await expect(run(adminApplyCompassChange, request({ ...mutation, reason: 'Controlled rollout', idempotencyKey: 'apply', previewId: preview.previewId, approvalId: requested.approvalId, confirmation: preview.confirmation })))
      .resolves.toMatchObject({ revision: 6, replayed: true });
  });

  test('rejects stale revision and mismatched confirmation without changing config', async () => {
    const state = makeDb({ remote_config: { app: { revision: 7, bools: { compass_enabled: true } } } });
    const preview = await run(adminPreviewCompassChange, request({ expectedRevision: 7, patch: { bools: { compass_enabled: false } }, reason: 'Emergency stop', requestId: 'preview-1' }));
    state.store.remote_config.app = { revision: 8, bools: { compass_enabled: true } };
    await expect(run(adminApplyCompassChange, request({ ...mutation, reason: 'Emergency stop', previewId: preview.previewId, confirmation: preview.confirmation })))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'remote config changed after Compass preview' });
    state.store.remote_config.app = { revision: 7, bools: { compass_enabled: true } };
    await expect(run(adminApplyCompassChange, request({ ...mutation, reason: 'Emergency stop', idempotencyKey: 'wrong-confirm', previewId: preview.previewId, confirmation: 'WRONG' })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(state.store.remote_config.app).toEqual({ revision: 7, bools: { compass_enabled: true } });
  });
});
