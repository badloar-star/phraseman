type Row = Record<string, unknown>;

let mockDb: ReturnType<typeof makeFirestore>;
let mockSuppressed = new Set<string>();
let mockConfigError = '';
let mockBeforeSuppressionRead: (() => void) | null = null;

const DELETE = { __delete: true };

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(() => mockDb, { FieldValue: { delete: () => DELETE } }),
}));

jest.mock('firebase-functions/params', () => ({
  defineString: (name: string) => ({
    value: () => name === 'RESEND_API_KEY' ? 'resend-test-key' : 'Phraseman <mail@example.com>',
  }),
}));

jest.mock('firebase-functions/v2/firestore', () => ({ onDocumentCreated: (_options: unknown, handler: unknown) => handler }));
jest.mock('firebase-functions/v2/scheduler', () => ({ onSchedule: (_options: unknown, handler: unknown) => handler }));
jest.mock('./email_unsubscribe', () => ({
  loadSuppressedEmails: jest.fn(async () => {
    mockBeforeSuppressionRead?.();
    return new Set(mockSuppressed);
  }),
  unsubscribeUrlFor: (email: string) => `https://example.com/unsubscribe?e=${encodeURIComponent(email)}`,
  assertMarketingEmailConfiguration: jest.fn(() => {
    if (mockConfigError) throw new Error(mockConfigError);
  }),
}));

const { processAdminEmailCampaign } = require('./admin_email_campaign_worker') as {
  processAdminEmailCampaign: (campaignId: string, nowMs: number, fetchImpl: typeof fetch) => Promise<{ status: string; reason?: string }>;
};

function makeFirestore(initial: Record<string, Row>) {
  const rows = new Map<string, Row>(Object.entries(initial).map(([path, data]) => [path, { ...data }]));
  let transactionTail = Promise.resolve();

  const apply = (path: string, patch: Row, merge: boolean) => {
    const next = merge ? { ...(rows.get(path) || {}) } : {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === DELETE || (value && typeof value === 'object' && (value as Row).__delete === true)) delete next[key];
      else next[key] = value;
    }
    rows.set(path, next);
  };

  const snapshot = (path: string) => {
    const data = rows.get(path);
    return {
      id: path.split('/').pop() || '',
      exists: data !== undefined,
      data: () => data ? { ...data } : undefined,
      get: (field: string) => data?.[field],
    };
  };

  const collection = (path: string): any => {
    const query: any = {
      path,
      doc: (id: string) => document(`${path}/${id}`),
      orderBy: () => query,
      where: () => query,
      limit: () => query,
      get: async () => {
        const prefix = `${path}/`;
        const docs = [...rows.keys()]
          .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
          .sort()
          .map(snapshot);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
    return query;
  };

  const document = (path: string): any => ({
    id: path.split('/').pop() || '',
    path,
    get: async () => snapshot(path),
    set: async (patch: Row, options?: { merge?: boolean }) => apply(path, patch, options?.merge === true),
    collection: (name: string) => collection(`${path}/${name}`),
  });

  const db: any = {
    collection,
    getAll: async (...refs: Array<{ path: string }>) => refs.map((ref) => snapshot(ref.path)),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      let release!: () => void;
      const previous = transactionTail;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        return await fn({
          get: async (ref: { path: string }) => snapshot(ref.path),
          set: (ref: { path: string }, patch: Row, options?: { merge?: boolean }) => apply(ref.path, patch, options?.merge === true),
        });
      } finally {
        release();
      }
    },
  };
  return Object.assign(db, {
    row: (path: string) => rows.get(path),
    patch: (path: string, patch: Row) => apply(path, patch, true),
  });
}

function setupCampaign() {
  mockDb = makeFirestore({
    'email_campaigns/campaign-1': { status: 'queued_hold', holdUntilMs: 0, previewId: 'preview-1', subject: 'Update', text: 'Useful update' },
    'admin_email_previews/preview-1/recipient_shards/0000': { contactIds: ['contact-1'] },
    'email_contacts/contact-1': { email: 'learner@example.com', bulkEligibility: 'eligible' },
  });
  mockSuppressed = new Set<string>();
  mockConfigError = '';
  mockBeforeSuppressionRead = null;
}

describe('email campaign process orchestration', () => {
  beforeEach(() => {
    setupCampaign();
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
  });
  afterEach(() => jest.restoreAllMocks());

  test('two workers cannot dispatch the same campaign concurrently', async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ data: [{ id: 'provider-1' }] }), { status: 200 }));
    const results = await Promise.all([
      processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never),
      processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results.map((item) => item.status).sort()).toEqual(['completed', 'skipped']);
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({ status: 'completed', acceptedCount: 1, targetCount: 1 });
  });

  test('a lost response retries with the same provider idempotency key and stays uncertain on 409', async () => {
    const fetchImpl = jest.fn()
      .mockRejectedValueOnce(new Error('socket closed after upload'))
      .mockResolvedValueOnce(new Response('idempotency key already used', { status: 409 }));

    await expect(processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never))
      .resolves.toEqual({ status: 'processing', reason: 'delivery_uncertain' });
    (Date.now as jest.Mock).mockReturnValue(10_000 + 11 * 60 * 1000);
    await expect(processAdminEmailCampaign('campaign-1', 10_000 + 11 * 60 * 1000, fetchImpl as never))
      .resolves.toEqual({ status: 'processing', reason: 'delivery_uncertain' });

    const keys = fetchImpl.mock.calls.map((call) => (call[1]?.headers as Row)['Idempotency-Key']);
    expect(keys[0]).toBe(keys[1]);
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({ status: 'processing', retryPending: true });
  });

  test('retryable delivery followed by cancellation is finalized by the next cron pass without losing totals', async () => {
    const fetchImpl = jest.fn(async () => new Response('temporary outage', { status: 503 }));
    await expect(processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never))
      .resolves.toEqual({ status: 'processing', reason: 'retryable' });
    mockDb.patch('email_campaigns/campaign-1', { status: 'cancel_requested' });

    await expect(processAdminEmailCampaign('campaign-1', 20_000, fetchImpl as never))
      .resolves.toEqual({ status: 'cancelled_partial' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({
      status: 'cancelled_partial', targetCount: 1, uncertainCount: 1, acceptedCount: 0,
    });
  });

  test('a suppression added after preview is rechecked at send time and counted without provider contact', async () => {
    mockSuppressed.add('learner@example.com');
    const fetchImpl = jest.fn();

    await expect(processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never))
      .resolves.toEqual({ status: 'completed' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({
      status: 'completed', targetCount: 1, suppressedAtSendCount: 1, acceptedCount: 0,
    });
  });

  test('invalid unsubscribe or sender configuration fails before contacting Resend', async () => {
    mockConfigError = 'email_unsubscribe_secret_not_configured';
    const fetchImpl = jest.fn();

    await expect(processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never))
      .resolves.toEqual({ status: 'failed', reason: 'email_unsubscribe_secret_not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({ status: 'failed', error: 'email_unsubscribe_secret_not_configured' });
  });

  test('cancellation between the live check and transactional batch claim prevents provider contact', async () => {
    mockBeforeSuppressionRead = () => {
      mockBeforeSuppressionRead = null;
      mockDb.patch('email_campaigns/campaign-1', { status: 'cancel_requested' });
    };
    const fetchImpl = jest.fn();

    await expect(processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never))
      .resolves.toEqual({ status: 'cancelled' });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({ status: 'cancelled', targetCount: 0 });
  });

  test('cancellation during provider flight cannot be overwritten by the older worker', async () => {
    let resolveProvider!: (value: Response) => void;
    const providerResponse = new Promise<Response>((resolve) => { resolveProvider = resolve; });
    const fetchImpl = jest.fn(() => providerResponse);

    const activeWorker = processAdminEmailCampaign('campaign-1', 10_000, fetchImpl as never);
    while (fetchImpl.mock.calls.length === 0) await new Promise((resolve) => setImmediate(resolve));
    mockDb.patch('email_campaigns/campaign-1', { status: 'cancel_requested' });
    await expect(processAdminEmailCampaign('campaign-1', 10_001, fetchImpl as never))
      .resolves.toEqual({ status: 'cancelled_partial' });
    resolveProvider(new Response(JSON.stringify({ data: [{ id: 'provider-1' }] }), { status: 200 }));

    await expect(activeWorker).resolves.toEqual({ status: 'cancelled_partial' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(mockDb.row('email_campaigns/campaign-1')).toMatchObject({
      status: 'cancelled_partial', acceptedCount: 1, targetCount: 1,
    });
  });
});
