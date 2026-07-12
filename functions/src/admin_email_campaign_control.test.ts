export {};

type Row = Record<string, unknown>;
type Store = Record<string, Record<string, Row | undefined>>;

let currentDb: ReturnType<typeof makeDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, { FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) } }),
}));

jest.mock('./email_unsubscribe', () => ({
  loadSuppressedEmails: jest.fn(async () => new Set<string>()),
  assertMarketingEmailConfiguration: jest.fn(),
}));

const { assertMarketingEmailConfiguration } = require('./email_unsubscribe') as {
  assertMarketingEmailConfiguration: jest.Mock;
};

const {
  adminApproveEmailCampaign,
  adminCancelEmailCampaign,
  adminCreateEmailCampaign,
  adminRequestEmailCampaignApproval,
  projectEmailCampaign,
} = require('./admin_email_campaign_control');

function makeDb(initial: Store = {}) {
  const store: Store = Object.fromEntries(Object.entries(initial).map(([name, docs]) => [name, { ...docs }]));
  let autoId = 0;
  const doc = (collection: string, id: string) => ({
    id, collection, path: `${collection}/${id}`,
    async get() { const data = store[collection]?.[id]; return { id, exists: data !== undefined, data: () => data }; },
  });
  const write = (ref: ReturnType<typeof doc>, data: Row, mode: 'create' | 'update') => {
    store[ref.collection] = store[ref.collection] || {};
    if (mode === 'create' && store[ref.collection][ref.id] !== undefined) throw new Error('already-exists');
    if (mode === 'update' && store[ref.collection][ref.id] === undefined) throw new Error('not-found');
    store[ref.collection][ref.id] = mode === 'update' ? { ...(store[ref.collection][ref.id] || {}), ...data } : { ...data };
  };
  const db = {
    collection: (name: string) => ({ doc: (id?: string) => doc(name, id || `auto-${++autoId}`) }),
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
  currentDb = db;
  return { store, db };
}

function request(data: Row, uid = 'admin-a', role = 'owner') {
  return { auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } }, data, rawRequest: { headers: {} }, app: {} };
}

function run(fn: any, req: ReturnType<typeof request>) { return typeof fn.run === 'function' ? fn.run(req) : fn(req); }

const mutation = { reason: 'Reviewed audience, content and cancellation window', requestId: 'request-1', idempotencyKey: 'operation-1' };
const preview = {
  actorUid: 'admin-a', subject: 'Product update', text: 'A sufficiently long product update.', audience: { kind: 'all' },
  summary: { directoryMatched: 10, recipientCount: 3, suppressed: 2 }, recipientCount: 3, shardCount: 1,
  createdAtMs: 1_900_000_000_000, expiresAtMs: 1_900_000_060_000,
};

describe('admin email campaign control', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_900_000_000_000);
    assertMarketingEmailConfiguration.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  test('requires a different administrator and binds approval to the exact preview', async () => {
    const { store } = makeDb({ admin_email_previews: { p1: preview } });
    const requested = await run(adminRequestEmailCampaignApproval, request({ ...mutation, previewId: 'p1' }));
    await expect(run(adminApproveEmailCampaign, request({ ...mutation, idempotencyKey: 'self', approvalId: requested.approvalId })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(run(adminApproveEmailCampaign, request({ ...mutation, idempotencyKey: 'other', approvalId: requested.approvalId }, 'admin-b')))
      .resolves.toMatchObject({ ok: true, replayed: false });
    store.admin_approval_requests[requested.approvalId]!.previewId = 'other-preview';
    await expect(run(adminCreateEmailCampaign, request({ ...mutation, idempotencyKey: 'create', previewId: 'p1', approvalId: requested.approvalId }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('consumes a live approval once and creates a cancellable hold', async () => {
    const { store } = makeDb({
      admin_email_previews: { p1: preview },
      admin_approval_requests: { a1: { type: 'email_campaign', status: 'approved', previewId: 'p1', requestedBy: 'admin-a', approvedBy: 'admin-b', expiresAtMs: preview.expiresAtMs, previewExpiresAtMs: preview.expiresAtMs } },
    });
    const result = await run(adminCreateEmailCampaign, request({ ...mutation, previewId: 'p1', approvalId: 'a1' }, 'admin-b'));
    expect(result).toMatchObject({ ok: true, replayed: false });
    expect(store.email_campaigns[result.campaignId]).toMatchObject({
      status: 'queued_hold', previewId: 'p1', approvalId: 'a1', recipientPreviewCount: 3,
      holdUntilMs: Date.now() + 5 * 60 * 1000,
    });
    expect(store.admin_email_previews.p1).toMatchObject({ consumedBy: 'admin-b', campaignId: result.campaignId });
    await expect(run(adminCreateEmailCampaign, request({ ...mutation, idempotencyKey: 'create-2', previewId: 'p1', approvalId: 'a1' }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('refuses to create a campaign when unsubscribe or sender configuration is unsafe', async () => {
    makeDb({
      admin_email_previews: { p1: preview },
      admin_approval_requests: { a1: { type: 'email_campaign', status: 'approved', previewId: 'p1', requestedBy: 'admin-a', approvedBy: 'admin-b', expiresAtMs: preview.expiresAtMs, previewExpiresAtMs: preview.expiresAtMs } },
    });
    assertMarketingEmailConfiguration.mockImplementationOnce(() => { throw new Error('email_unsubscribe_secret_not_configured'); });

    await expect(run(adminCreateEmailCampaign, request({ ...mutation, previewId: 'p1', approvalId: 'a1' }, 'admin-b')))
      .rejects.toMatchObject({ code: 'failed-precondition', message: 'email_unsubscribe_secret_not_configured' });
  });

  test('replays campaign creation and does not create another campaign', async () => {
    makeDb({
      admin_email_previews: { p1: { ...preview, consumedAtMs: Date.now(), campaignId: 'existing' } },
      admin_command_operations: { 'operation-1': { actorUid: 'admin-b', requestFingerprint: JSON.stringify({ previewId: 'p1', approvalId: 'a1' }), campaignId: 'existing' } },
    });
    await expect(run(adminCreateEmailCampaign, request({ ...mutation, previewId: 'p1', approvalId: 'a1' }, 'admin-b')))
      .resolves.toMatchObject({ ok: true, replayed: true, campaignId: 'existing' });
  });

  test('cancels held campaigns and requests stop for processing campaigns', async () => {
    const { store } = makeDb({ email_campaigns: { held: { status: 'queued_hold' }, running: { status: 'processing' }, done: { status: 'completed' } } });
    await run(adminCancelEmailCampaign, request({ ...mutation, jobId: 'held' }));
    await run(adminCancelEmailCampaign, request({ ...mutation, idempotencyKey: 'cancel-running', jobId: 'running' }));
    expect(store.email_campaigns.held).toMatchObject({ status: 'cancelled' });
    expect(store.email_campaigns.running).toMatchObject({ status: 'cancel_requested' });
    await expect(run(adminCancelEmailCampaign, request({ ...mutation, idempotencyKey: 'cancel-done', jobId: 'done' })))
      .rejects.toMatchObject({ code: 'failed-precondition' });
  });

  test('history projection never exposes recipient shards or raw errors with addresses', () => {
    expect(projectEmailCampaign('c1', { status: 'completed', subject: 'Update', text: 'private body', recipientPreviewCount: 10, acceptedCount: 9, recipientContactIds: ['private'] }))
      .toEqual({ id: 'c1', status: 'completed', subject: 'Update', textPreview: 'private body', audience: {}, summary: {}, recipientPreviewCount: 10, targetCount: 0, acceptedCount: 9, failedCount: 0, suppressedAtSendCount: 0, uncertainCount: 0, providerMetricLabel: 'accepted_by_provider', createdAtMs: 0, holdUntilMs: 0, finishedAtMs: 0, createdBy: '', cancelable: false, error: '' });
  });
});
