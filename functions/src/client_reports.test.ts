export {};

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
  collection: (name: string) => { doc: (id: string) => FakeRef };
};

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

const docs = new Map<string, DocData>();
let autoId = 0;

function deepMerge(target: DocData, source: DocData): DocData {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(existing as DocData, value as DocData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
    },
    collection: (name: string) => ({ doc: (id: string) => refFor(`${path}/${name}/${id}`) }),
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return {
    id: path.split('/').pop() || path,
    exists: data !== undefined,
    data: () => data,
  };
}

function collectionDocs(path: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${path}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({
      id: docPath.slice(prefix.length),
      path: docPath,
      data,
    }));
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
      where: (field: string, op: string, value: unknown) => {
        if (op !== '==') throw new Error(`unsupported op ${op}`);
        return {
          limit: (count: number) => ({
            get: async () => {
              const matches = collectionDocs(name)
                .filter((doc) => doc.data[field] === value)
                .slice(0, count)
                .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
              return { empty: matches.length === 0, docs: matches };
            },
          }),
        };
      },
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref: FakeRef) => ref.get(),
        set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
          writes.push(() => {
            docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
          });
        },
        create: (ref: FakeRef, data: DocData) => {
          writes.push(() => {
            if (docs.has(ref.path)) throw new Error('already exists');
            docs.set(ref.path, { ...data });
          });
        },
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    increment: (value: number) => ({ __op: 'increment', value }),
  };
  return { firestore };
});

function reportDocs(collection: string): DocData[] {
  return collectionDocs(collection).map((doc) => doc.data);
}

async function callSubmitClientReport(data: DocData, authUid = 'auth-reporter') {
  const { submitClientReport } = require('./client_reports');
  return submitClientReport({ auth: { uid: authUid }, data });
}

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers().setSystemTime(new Date('2026-05-24T12:00:00.000Z'));
  docs.clear();
  autoId = 0;
  docs.set('users/stable-reporter', { firebaseAuthUid: 'auth-reporter' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('submitClientReport', () => {
  test('writes user reports with the authenticated stable uid instead of spoofed payload ids', async () => {
    const result = await callSubmitClientReport({
      kind: 'user_report',
      payload: {
        reporterUid: 'victim',
        uid: 'victim',
        reportedUid: 'reported-1',
        reportedName: 'Bad Name',
        reason: 'offensive_nickname',
        screen: 'leaderboard',
        reporterName: 'Alice',
        platform: 'ios',
        appVersion: '1.2.3',
      },
    });

    expect(result).toMatchObject({ ok: true, collection: 'user_reports' });
    expect(reportDocs('user_reports')).toHaveLength(1);
    expect(reportDocs('user_reports')[0]).toMatchObject({
      reporterUid: 'stable-reporter',
      reporterAuthUid: 'auth-reporter',
      reportedUid: 'reported-1',
      reason: 'offensive_nickname',
      status: 'new',
    });
  });

  test('rate-limits repeated reports before creating another moderation document', async () => {
    const payload = {
      reportedUid: 'reported-1',
      reportedName: 'Bad Name',
      reason: 'offensive_nickname',
      screen: 'leaderboard',
    };

    for (let i = 0; i < 5; i += 1) {
      await callSubmitClientReport({ kind: 'user_report', payload: { ...payload, reportedUid: `reported-${i}` } });
    }

    await expect(callSubmitClientReport({ kind: 'user_report', payload })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'rate_limited',
    });
    expect(reportDocs('user_reports')).toHaveLength(5);
  });

  test('rejects a durable retry after the authenticated stable owner changes', async () => {
    await expect(callSubmitClientReport({
      kind: 'error_report',
      expectedStableUid: 'stable-other-account',
      idempotencyKey: 'support_123_owner_bound',
      payload: {
        screen: 'settings_support',
        dataId: 'settings_support_request',
        dataText: 'In-app support request',
        comment: 'The button does not respond after reconnecting.',
      },
    })).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'report_owner_changed',
    });
    expect(reportDocs('error_reports')).toHaveLength(0);
  });

  test('replays the same receipt for a retried idempotent support report', async () => {
    const request = {
      kind: 'error_report',
      expectedStableUid: 'stable-reporter',
      idempotencyKey: 'support_123_same_operation',
      payload: {
        screen: 'settings_support',
        dataId: 'settings_support_request',
        dataText: 'In-app support request',
        comment: 'The lesson button does not respond after reconnecting.',
      },
    };

    const first = await callSubmitClientReport(request);
    const retry = await callSubmitClientReport(request);

    expect(retry).toEqual(first);
    expect(reportDocs('error_reports')).toHaveLength(1);
    expect(collectionDocs('client_report_rate_limits')[0]?.data).toMatchObject({ count: 1 });
  });

  test('atomically records a release-aware server aggregate without uid or report text', async () => {
    await callSubmitClientReport({
      kind: 'app_error',
      payload: {
        platform: 'ios', appVersion: '2.4.1', buildNumber: '319', feature: 'auth', screen: 'sign_in',
        message: 'person@example.com could not sign in', stack: 'private stack text',
      },
    });

    const aggregates = collectionDocs('jarvis_quality_daily/2026-05-24/sources/app_errors/buckets');
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].data).toMatchObject({
      dayKey: '2026-05-24', sourceId: 'app_errors', build: '319', platform: 'ios', category: 'auth', screen: 'sign_in',
      eventCount: { __op: 'increment', value: 1 }, affectedUserCount: { __op: 'increment', value: 1 },
    });
    expect(JSON.stringify(aggregates[0])).not.toMatch(/auth-reporter|stable-reporter|person@example|private stack/i);
    const markers = Array.from(docs.entries()).filter(([path]) => path.includes('/affected_users/'));
    expect(markers).toHaveLength(1);
    expect(markers[0][0]).toMatch(/\/affected_users\/[a-f0-9]{64}$/);
    expect(JSON.stringify(markers[0])).not.toMatch(/auth-reporter|stable-reporter/i);
  });

  test('stores only independently allowlisted support diagnostics', async () => {
    const now = Date.now();
    await callSubmitClientReport({
      kind: 'error_report',
      payload: {
        screen: 'settings_support',
        dataId: 'settings_support_request',
        dataText: 'In-app support request',
        comment: 'Avatar purchase is stuck.',
        diagnostics: {
          version: 1,
          capturedAtMs: now,
          token: 'Bearer private-token',
          events: [{
            atMs: now - 100,
            event: 'customization_purchase',
            screen: '/avatar_select',
            result: 'error',
            reason: 'transaction_failed',
            subject: 'avatar',
            action: 'avatar:purchase_confirm',
            email: 'person@example.com',
            stack: 'private stack',
            tags: { receipt: 'secret' },
          }],
        },
      },
    });

    const report = reportDocs('error_reports')[0];
    expect(report.diagnostics).toEqual({
      version: 1,
      capturedAtMs: now,
      events: [{
        atMs: now - 100,
        event: 'customization_purchase',
        screen: '/avatar_select',
        result: 'error',
        reason: 'transaction_failed',
        subject: 'avatar',
        action: 'avatar:purchase_confirm',
      }],
    });
    expect(JSON.stringify(report.diagnostics)).not.toMatch(/person@example|Bearer|private stack|receipt|secret/i);
  });

  test('accepts the report while dropping invalid diagnostics', async () => {
    const result = await callSubmitClientReport({
      kind: 'error_report',
      payload: {
        screen: 'settings_support',
        dataId: 'settings_support_request',
        dataText: 'In-app support request',
        comment: 'The settings screen is frozen.',
        diagnostics: { version: 99, events: [{ event: 'raw_log', message: 'private' }] },
      },
    });

    expect(result).toMatchObject({ ok: true, collection: 'error_reports' });
    expect(reportDocs('error_reports')[0]).not.toHaveProperty('diagnostics');
  });
});
