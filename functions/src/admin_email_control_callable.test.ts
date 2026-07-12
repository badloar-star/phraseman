export {};

type Row = Record<string, unknown>;

let currentDb: ReturnType<typeof makeDb>['db'] | null = null;

jest.mock('firebase-admin', () => ({
  apps: [{}],
  initializeApp: jest.fn(),
  firestore: Object.assign(() => currentDb, {
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  }),
}));

jest.mock('./email_unsubscribe', () => ({
  loadSuppressedEmails: async () => new Set(['suppressed@example.com']),
}));

const {
  adminExportEmailContacts,
  adminListEmailContacts,
} = require('./admin_email_control');

function makeDb(contactCount = 2) {
  const audit: Row[] = [];
  const operations: Record<string, Row> = {};
  let reads = 0;
  const contactDocs = contactCount === 2 ? [
    { id: 'a', data: () => ({ email: 'person@example.com', sources: ['app'], appStableIds: ['private-id'], lastSeenAtMs: 2, bulkEligibility: 'eligible', eligibilitySource: 'explicit' }) },
    { id: 'b', data: () => ({ email: 'suppressed@example.com', sources: ['site'], siteOrderIds: ['private-order'], lastSeenAtMs: 1, bulkEligibility: 'eligible', eligibilitySource: 'explicit' }) },
  ] : Array.from({ length: contactCount }, (_, index) => ({
    id: `contact-${String(index).padStart(5, '0')}`,
    data: () => ({ email: `learner-${index}@example.com`, sources: ['app'], lastSeenAtMs: contactCount - index, bulkEligibility: 'eligible', eligibilitySource: 'explicit' }),
  }));
  const db = {
    collection: (name: string) => {
      if (name === 'email_contacts') return {
        limit: () => ({ get: async () => { reads += 1; return { docs: contactDocs, size: contactDocs.length }; } }),
      };
      if (name === 'admin_log') return {
        doc: () => ({ kind: 'audit', id: `audit-${audit.length + 1}`, create: async (value: Row) => { audit.push(value); } }),
      };
      if (name === 'admin_command_operations') return {
        doc: (id: string) => ({ kind: 'operation', id }),
      };
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async <T>(worker: (tx: {
      get: (ref: { kind: string; id: string }) => Promise<{ exists: boolean; data: () => Row }>;
      create: (ref: { kind: string; id: string }, value: Row) => void;
    }) => Promise<T>) => worker({
      get: async (ref) => ({ exists: !!operations[ref.id], data: () => operations[ref.id] || {} }),
      create: (ref, value) => {
        if (ref.kind === 'operation') operations[ref.id] = value;
        else if (ref.kind === 'audit') audit.push(value);
      },
    }),
  };
  currentDb = db;
  return { db, audit, get reads() { return reads; } };
}

function request(data: Row, role = 'owner', uid = 'admin-a') {
  return {
    auth: { uid, token: { admin: true, adminRole: role, email: `${uid}@example.com` } },
    data,
    rawRequest: { headers: {} },
    app: {},
  };
}

function run(fn: any, req: ReturnType<typeof request>) {
  return typeof fn.run === 'function' ? fn.run(req) : fn(req);
}

describe('admin email directory callables', () => {
  test('rejects support before reading contact PII', async () => {
    const state = makeDb();
    await expect(run(adminListEmailContacts, request({}, 'support')))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(state.reads).toBe(0);
  });

  test('returns a bounded projection without private identifiers', async () => {
    makeDb();
    const result = await run(adminListEmailContacts, request({ pageSize: 50 }));
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).not.toHaveProperty('appStableIds');
    expect(result.items[1]).not.toHaveProperty('siteOrderIds');
    expect(result.counts).toMatchObject({ all: 2, suppressed: 1 });
  });

  test('legacy 10,000-contact view performs one directory scan and returns only the visible 1,000 rows', async () => {
    const state = makeDb(10_000);
    const result = await run(adminListEmailContacts, request({ view: 'legacy_table', pageSize: 50_000 }));

    expect(state.reads).toBe(1);
    expect(result.items).toHaveLength(1_000);
    expect(result.filteredCount).toBe(10_000);
    expect(result.counts.all).toBe(10_000);
  });

  test('exports the filtered list only with reason and writes an audit record', async () => {
    const state = makeDb();
    await expect(run(adminExportEmailContacts, request({ source: 'app' })))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    const result = await run(adminExportEmailContacts, request({
      source: 'app',
      reason: 'Export for verified campaign review',
      requestId: 'request-1',
      idempotencyKey: 'export-1',
    }));
    expect(result.emails).toEqual(['person@example.com']);
    expect(state.audit).toHaveLength(1);
    expect(state.audit[0]).toMatchObject({ action: 'email_directory.export', actorUid: 'admin-a' });

    const replay = await run(adminExportEmailContacts, request({
      source: 'app',
      reason: 'Export for verified campaign review',
      requestId: 'request-1',
      idempotencyKey: 'export-1',
    }));
    expect(replay).toMatchObject({ replayed: true, emails: ['person@example.com'] });
    expect(state.audit).toHaveLength(1);

    await expect(run(adminExportEmailContacts, request({
      source: 'site',
      reason: 'Different export',
      requestId: 'request-2',
      idempotencyKey: 'export-1',
    }))).rejects.toMatchObject({ code: 'already-exists' });
  });
});
