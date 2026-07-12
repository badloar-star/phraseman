export {};

type Row = Record<string, unknown>;
type Store = Record<string, Record<string, Row | undefined>>;

var currentPushDb: ReturnType<typeof makePushDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(() => currentPushDb, {
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  }),
}));

const {
  adminApprovePushCampaign,
  adminCancelPushJob,
  adminCreatePushJob,
  adminRequestPushApproval,
  parsePushPreviewRequest,
  projectPushJob,
  pushJobCanBeCancelled,
} = require('./admin_push_control');

function makePushDb(initial: Store = {}) {
  const store: Store = Object.fromEntries(Object.entries(initial).map(([name, docs]) => [name, { ...docs }]));
  let autoId = 0;
  const doc = (collection: string, id: string) => ({
    id,
    collection,
    path: `${collection}/${id}`,
    async get() {
      const data = store[collection]?.[id];
      return { id, exists: data !== undefined, data: () => data };
    },
  });
  const write = (ref: ReturnType<typeof doc>, data: Row, mode: 'create' | 'update') => {
    store[ref.collection] = store[ref.collection] || {};
    if (mode === 'create' && store[ref.collection][ref.id] !== undefined) throw new Error('already-exists');
    if (mode === 'update' && store[ref.collection][ref.id] === undefined) throw new Error('not-found');
    store[ref.collection][ref.id] = mode === 'update'
      ? { ...(store[ref.collection][ref.id] || {}), ...data }
      : { ...data };
  };
  const db = {
    collection: (name: string) => ({
      doc: (id?: string) => doc(name, id || `auto-${++autoId}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: ReturnType<typeof doc>) => Promise<unknown>;
      create: (ref: ReturnType<typeof doc>, data: Row) => void;
      update: (ref: ReturnType<typeof doc>, data: Row) => void;
    }) => Promise<T>) => fn({
      get: (ref) => ref.get(),
      create: (ref, data) => write(ref, data, 'create'),
      update: (ref, data) => write(ref, data, 'update'),
    }),
  };
  currentPushDb = db;
  return { db, store };
}

function request(data: Row, uid = 'admin-a', role = 'owner') {
  return {
    auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } },
    data,
    rawRequest: { headers: {} },
    app: {},
  };
}

function callableRun(fn: any, req: ReturnType<typeof request>) {
  return typeof fn.run === 'function' ? fn.run(req) : fn(req);
}

const job = {
  mode: 'uid',
  uid: 'user-1',
  notification: { title: 'Hi', body: 'Body' },
};
const massJob = {
  mode: 'segment',
  segment: { language: 'ru' },
  notification: { title: 'Mass', body: 'Body' },
};
const mutation = { reason: 'Verified campaign and stop condition', requestId: 'request-1', idempotencyKey: 'operation-1' };

describe('admin push control', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000));
  afterEach(() => jest.restoreAllMocks());

  test('normalizes all four campaign modes through the worker contract', () => {
    expect(parsePushPreviewRequest(job).mode).toBe('uid');
    expect(parsePushPreviewRequest(massJob).mode).toBe('segment');
    expect(parsePushPreviewRequest({ mode: 'reactivate', reactivation: { daysMin: 7, daysMax: 30 }, notification: { title: 'Hi', body: 'Body' } }).mode).toBe('reactivate');
    expect(parsePushPreviewRequest({ mode: 'scheduled', scheduledAt: new Date(Date.now() + 60_000).toISOString(), audience: 'all', notification: { title: 'Hi', body: 'Body' } }).mode).toBe('scheduled');
  });

  test('only allows cancellation before delivery starts', () => {
    expect(pushJobCanBeCancelled('pending')).toBe(true);
    expect(pushJobCanBeCancelled('scheduled')).toBe(true);
    expect(pushJobCanBeCancelled('processing')).toBe(false);
    expect(pushJobCanBeCancelled('done')).toBe(false);
  });

  test('binds UID preview consumption to its actor and only one job', async () => {
    const { store } = makePushDb({ admin_push_previews: { p1: { actorUid: 'admin-a', job, audienceCount: 1, expiresAtMs: Date.now() + 60_000 } } });
    const result = await callableRun(adminCreatePushJob, request({ ...mutation, previewId: 'p1' }));
    expect(result).toMatchObject({ ok: true, replayed: false });
    expect(store.admin_push_previews.p1).toMatchObject({ consumedBy: 'admin-a' });
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, idempotencyKey: 'operation-2', previewId: 'p1' })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, idempotencyKey: 'operation-3', previewId: 'p1' }, 'admin-b')))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('replays the same create operation without creating another job', async () => {
    makePushDb({
      admin_push_previews: { p1: { actorUid: 'admin-a', job, audienceCount: 1, expiresAtMs: Date.now() + 60_000, consumedAtMs: Date.now(), jobId: 'job-existing' } },
      admin_command_operations: { 'operation-1': { actorUid: 'admin-a', requestFingerprint: JSON.stringify({ previewId: 'p1', approvalId: '' }), jobId: 'job-existing' } },
    });
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, previewId: 'p1' })))
      .resolves.toMatchObject({ ok: true, replayed: true, jobId: 'job-existing' });
  });

  test('requires a different administrator and a live approval bound to the exact preview', async () => {
    const { store } = makePushDb({ admin_push_previews: { pm: { actorUid: 'admin-a', job: massJob, audienceCount: 25, expiresAtMs: Date.now() + 60_000 } } });
    const requested = await callableRun(adminRequestPushApproval, request({ ...mutation, previewId: 'pm' }));
    await expect(callableRun(adminApprovePushCampaign, request({ ...mutation, idempotencyKey: 'approve-self', approvalId: requested.approvalId })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callableRun(adminApprovePushCampaign, request({ ...mutation, idempotencyKey: 'approve-other', approvalId: requested.approvalId }, 'admin-b')))
      .resolves.toMatchObject({ ok: true, replayed: false });
    store.admin_approval_requests[requested.approvalId]!.previewId = 'different-preview';
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, idempotencyKey: 'create-mass', previewId: 'pm', approvalId: requested.approvalId }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('caps approval expiry at the immutable preview expiry', async () => {
    const previewExpiry = Date.now() + 60_000;
    const { store } = makePushDb({ admin_push_previews: { pm: { actorUid: 'admin-a', job: massJob, audienceCount: 25, expiresAtMs: previewExpiry } } });
    const requested = await callableRun(adminRequestPushApproval, request({ ...mutation, previewId: 'pm' }));
    expect(store.admin_approval_requests[requested.approvalId]).toMatchObject({
      expiresAtMs: previewExpiry,
      previewExpiresAtMs: previewExpiry,
    });
  });

  test.each([
    ['wrong workflow type', { type: 'asset_publish', requestedBy: 'admin-a', approvedBy: 'admin-b' }],
    ['missing approver', { type: 'push_campaign', requestedBy: 'admin-a', approvedBy: '' }],
    ['self approval', { type: 'push_campaign', requestedBy: 'admin-a', approvedBy: 'admin-a' }],
    ['different preview requester', { type: 'push_campaign', requestedBy: 'admin-x', approvedBy: 'admin-b' }],
  ])('rejects %s approval documents at consumption', async (_label, approvalFields) => {
    makePushDb({
      admin_push_previews: { pm: { actorUid: 'admin-a', job: massJob, audienceCount: 25, expiresAtMs: Date.now() + 60_000 } },
      admin_approval_requests: { a1: { ...approvalFields, status: 'approved', previewId: 'pm', expiresAtMs: Date.now() + 60_000 } },
    });
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, previewId: 'pm', approvalId: 'a1' }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('projects preview and actual audience counts separately in history', () => {
    expect(projectPushJob('job-1', {
      mode: 'scheduled',
      notification: { title: 'Later', body: 'Body' },
      status: 'scheduled',
      audiencePreviewCount: 37,
      targetCount: 0,
    })).toMatchObject({ id: 'job-1', audiencePreviewCount: 37, targetCount: 0 });
  });

  test('rejects expired approvals and cancellation after claim', async () => {
    makePushDb({
      admin_push_previews: { pm: { actorUid: 'admin-a', job: massJob, audienceCount: 25, expiresAtMs: Date.now() + 60_000 } },
      admin_approval_requests: { a1: { type: 'push_campaign', status: 'approved', previewId: 'pm', requestedBy: 'admin-a', approvedBy: 'admin-b', expiresAtMs: Date.now() - 1 } },
      admin_push_jobs: { running: { status: 'processing' } },
    });
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, previewId: 'pm', approvalId: 'a1' }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callableRun(adminCancelPushJob, request({ ...mutation, jobId: 'running' })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('enforces campaigns.write before any transaction', async () => {
    makePushDb();
    await expect(callableRun(adminCreatePushJob, request({ ...mutation, previewId: 'p1' }, 'viewer', 'support')))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });
});
