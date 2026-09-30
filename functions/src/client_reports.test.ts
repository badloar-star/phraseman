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
const storageObjects = new Map<string, { bytes: Buffer; metadata: DocData }>();
let autoId = 0;
let storageDownloadCalls = 0;

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
  const storage = jest.fn(() => ({
    bucket: () => ({
      file: (path: string) => ({
        getMetadata: async () => {
          const object = storageObjects.get(path);
          if (!object) throw new Error('not found');
          return [{ size: String(object.bytes.byteLength), metadata: object.metadata }];
        },
        download: async () => {
          storageDownloadCalls += 1;
          const object = storageObjects.get(path);
          if (!object) throw new Error('not found');
          return [object.bytes];
        },
      }),
    }),
  }));
  return { firestore, storage };
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
  storageObjects.clear();
  autoId = 0;
  storageDownloadCalls = 0;
  docs.set('users/stable-reporter', { firebaseAuthUid: 'auth-reporter' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('submitClientReport', () => {
  test('verifies exact published-pack membership and atomically quarantines the first reported Spire task', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const packBody = {
      schema: 'spire-pack-v1', weekId: '2026-W40', lang: 'es', tier: 2,
      floors: [{ floor: 1, steps: [{ step: 1, sets: [{ tasks: [{
        taskId: 'arena-es-fill_gap-1-0000', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {},
      }] }] }] }],
    };
    const { spirePackHash } = require('./spire_pack_contract');
    const packHash = spirePackHash(packBody);
    const pack = { ...packBody, packHash };
    storageObjects.set('spire_packs/es/2/2026-W40.json', {
      bytes: Buffer.from(JSON.stringify(pack), 'utf8'), metadata: { packHash },
    });
    const request = {
      kind: 'spire_task_report', expectedStableUid: 'stable-reporter', idempotencyKey: 'spire-report-1',
      payload: {
        taskId: 'arena-es-fill_gap-1-0000', studyTarget: 'es', weekId: '2026-W40', tier: 2, packHash,
        floor: 1, step: 1, setIndex: 0, taskIndex: 0, reason: 'В вариантах два правильных ответа',
      },
    };

    const first = await callSubmitClientReport(request);
    const retry = await callSubmitClientReport(request);

    expect(retry).toEqual(first);
    expect(reportDocs('error_reports')).toHaveLength(1);
    expect(reportDocs('error_reports')[0]).toMatchObject({
      contentScope: 'spire', spireTaskId: 'arena-es-fill_gap-1-0000', spireLang: 'es',
      spireQuarantineState: 'quarantined', status: 'new', category: 'spire_task_report',
    });
    const flags = docs.get('config/spire_task_flags_es');
    expect(flags).toMatchObject({
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: {
        'arena-es-fill_gap-1-0000': {
          taskId: 'arena-es-fill_gap-1-0000',
          reason: 'Жалоба игрока',
          flaggedByUid: 'server:client-report',
        },
      },
    });
    expect(JSON.stringify(flags)).not.toContain('stable-reporter');
    expect(Object.keys(flags ?? {})).toEqual(['schemaVersion', 'studyTarget', 'flagged']);
    expect(reportDocs('spire_task_report_receipts')).toHaveLength(1);
    expect(reportDocs('spire_task_incidents')).toHaveLength(1);
    expect(reportDocs('spire_task_incidents')[0]).toMatchObject({
      state: 'quarantined', revision: 1, reportCount: 1, latestReportId: first.id,
    });
    expect(collectionDocs('client_report_rate_limits')[0]?.data).toMatchObject({ count: 1 });
    expect(storageDownloadCalls).toBe(1);
  });

  test('rejects finalized replay when the same idempotency key carries a different canonical payload', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const packBody = {
      schema: 'spire-pack-v1', weekId: '2026-W40', lang: 'es', tier: 2,
      floors: [{ floor: 1, steps: [{ step: 1, sets: [{ tasks: [{
        taskId: 'arena-es-fill_gap-1-0000', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {},
      }] }] }] }],
    };
    const { spirePackHash } = require('./spire_pack_contract');
    const packHash = spirePackHash(packBody);
    storageObjects.set('spire_packs/es/2/2026-W40.json', {
      bytes: Buffer.from(JSON.stringify({ ...packBody, packHash }), 'utf8'), metadata: { packHash },
    });
    const base = {
      taskId: 'arena-es-fill_gap-1-0000', studyTarget: 'es', weekId: '2026-W40', tier: 2, packHash,
      floor: 1, step: 1, setIndex: 0, taskIndex: 0, reason: 'Первое описание',
    };
    await callSubmitClientReport({ kind: 'spire_task_report', idempotencyKey: 'same-key', payload: base });
    await expect(callSubmitClientReport({
      kind: 'spire_task_report', idempotencyKey: 'same-key', payload: { ...base, reason: 'Другое описание' },
    })).rejects.toMatchObject({ code: 'already-exists', message: 'spire_task_report_idempotency_mismatch' });
    expect(reportDocs('error_reports')).toHaveLength(1);
    expect(reportDocs('spire_task_report_receipts')[0]).toMatchObject({ requestFingerprint: expect.any(String) });
    expect(storageDownloadCalls).toBe(1);
  });

  test('rejects a forged Spire task location without writing a report or quarantine', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const packBody = {
      schema: 'spire-pack-v1', weekId: '2026-W40', lang: 'fr', tier: 0,
      floors: [{ floor: 1, steps: [{ step: 1, sets: [{ tasks: [{ taskId: 'arena-fr-fill_gap-1-0000' }] }] }] }],
    };
    const { spirePackHash } = require('./spire_pack_contract');
    const packHash = spirePackHash(packBody);
    const pack = { ...packBody, packHash };
    storageObjects.set('spire_packs/fr/0/2026-W40.json', {
      bytes: Buffer.from(JSON.stringify(pack), 'utf8'), metadata: { packHash },
    });
    await expect(callSubmitClientReport({
      kind: 'spire_task_report', idempotencyKey: 'forged-1',
      payload: {
        taskId: 'arena-fr-fill_gap-1-9999', studyTarget: 'fr', weekId: '2026-W40', tier: 0, packHash,
        floor: 1, step: 1, setIndex: 0, taskIndex: 0, reason: 'Подмена',
      },
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'spire_task_report_pack_mismatch' });
    expect(reportDocs('error_reports')).toHaveLength(0);
    expect(docs.has('config/spire_task_flags_fr')).toBe(false);
    expect(collectionDocs('client_report_rate_limits')[0]?.data).toMatchObject({ count: 1 });
  });

  test('counts each new invalid Spire attempt before Storage but retries one reservation without another count', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const payload = {
      taskId: 'arena-fr-fill_gap-1-0000', studyTarget: 'fr', weekId: '2026-W40', tier: 0,
      packHash: 'sp1_missing12345678', floor: 1, step: 1, setIndex: 0, taskIndex: 0, reason: 'Ошибка',
    };
    await expect(callSubmitClientReport({ kind: 'spire_task_report', idempotencyKey: 'invalid-1', payload }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callSubmitClientReport({ kind: 'spire_task_report', idempotencyKey: 'invalid-1', payload }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(callSubmitClientReport({ kind: 'spire_task_report', idempotencyKey: 'invalid-2', payload }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(collectionDocs('client_report_rate_limits')[0]?.data).toMatchObject({ count: 2 });
    expect(reportDocs('spire_task_report_reservations')).toHaveLength(2);
  });

  test('rejects a stale restored-pack replay before downloading the old Storage object', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const taskId = 'arena-es-fill_gap-1-0000';
    const oldBody = {
      schema: 'spire-pack-v1', weekId: '2026-W39', lang: 'es', tier: 2,
      floors: [{ floor: 1, steps: [{ step: 1, sets: [{ tasks: [{
        taskId, mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {},
      }] }] }] }],
    };
    const { spirePackHash } = require('./spire_pack_contract');
    const oldHash = spirePackHash(oldBody);
    storageObjects.set('spire_packs/es/2/2026-W39.json', {
      bytes: Buffer.from(JSON.stringify({ ...oldBody, packHash: oldHash }), 'utf8'), metadata: { packHash: oldHash },
    });
    const restoredIncident = {
      schemaVersion: 'spire-task-incident-v1', studyTarget: 'es', taskId, state: 'restored',
      quarantineOwner: 'incident', manualHoldActive: false,
      revision: 2, reportCount: 1, firstReportedAtMs: 1, latestReportedAtMs: 2,
      latestReportId: 'old-report', latestWeekId: '2026-W39', latestTier: 2,
      latestPackHash: oldHash, latestReason: 'Исправлено', latestMode: 'fill_gap',
      latestDifficulty: 1, updatedAtMs: 3,
    };
    docs.set(`spire_task_incidents/es__${taskId}`, restoredIncident);
    await expect(callSubmitClientReport({
      kind: 'spire_task_report', idempotencyKey: 'stale-after-restore',
      payload: {
        taskId, studyTarget: 'es', weekId: '2026-W39', tier: 2,
        packHash: oldHash, floor: 1, step: 1, setIndex: 0, taskIndex: 0,
        reason: 'Старая жалоба',
      },
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'spire_task_report_week_not_current' });
    expect(storageDownloadCalls).toBe(0);
    expect(collectionDocs('client_report_rate_limits')[0]?.data).toMatchObject({ count: 1 });
    expect(docs.get(`spire_task_incidents/es__${taskId}`)).toEqual(restoredIncident);
    expect(docs.has('config/spire_task_flags_es')).toBe(false);
  });

  test('damaged strict v1 flags reject finalization without changing the damaged document', async () => {
    jest.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    const packBody = {
      schema: 'spire-pack-v1', weekId: '2026-W40', lang: 'es', tier: 2,
      floors: [{ floor: 1, steps: [{ step: 1, sets: [{ tasks: [{
        taskId: 'arena-es-fill_gap-1-0000', mode: 'fill_gap', kind: 'choice', difficulty: 1, payload: {},
      }] }] }] }],
    };
    const { spirePackHash } = require('./spire_pack_contract');
    const packHash = spirePackHash(packBody);
    storageObjects.set('spire_packs/es/2/2026-W40.json', {
      bytes: Buffer.from(JSON.stringify({ ...packBody, packHash }), 'utf8'), metadata: { packHash },
    });
    const damaged = {
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: { bad: { taskId: 'different', reason: 'x', flaggedAtMs: 1, flaggedByUid: 'admin' } },
    };
    docs.set('config/spire_task_flags_es', damaged);
    await expect(callSubmitClientReport({
      kind: 'spire_task_report', idempotencyKey: 'damaged-flags',
      payload: {
        taskId: 'arena-es-fill_gap-1-0000', studyTarget: 'es', weekId: '2026-W40', tier: 2, packHash,
        floor: 1, step: 1, setIndex: 0, taskIndex: 0, reason: 'Ошибка',
      },
    })).rejects.toThrow('spire_task_flags_invalid');
    expect(docs.get('config/spire_task_flags_es')).toEqual(damaged);
    expect(reportDocs('error_reports')).toHaveLength(0);
  });

  test('requires a durable idempotency key for every Spire quarantine report', async () => {
    await expect(callSubmitClientReport({
      kind: 'spire_task_report',
      payload: {
        taskId: 'arena-es-fill_gap-1-0000', studyTarget: 'es', weekId: '2026-W40', tier: 2,
        packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 1, step: 1, setIndex: 0, taskIndex: 0,
        reason: 'Ошибка',
      },
    })).rejects.toMatchObject({ code: 'invalid-argument', message: 'spire_task_report_idempotency_required' });
    expect(reportDocs('error_reports')).toHaveLength(0);
  });

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

  // зачем (PM-227, 2026-09-24): аудит цепи "ошибка → очередь → транспорт →
  // запись → отображение" (docs/phraseman-2.0/evidence/PM-227_error_visibility_audit.md)
  // нашёл, что ни один существующий тест не доходит до самого документа
  // `app_errors` — только до побочного агрегата jarvis_quality_daily ниже.
  // Это и есть проверка acceptance PM-227-A2: инъецированная тестовая ошибка
  // реально создаёт документ в `app_errors` с ожидаемыми контрактными полями
  // (не просто "logger был вызван").
  test('writes the app_errors document itself with the full field contract', async () => {
    await callSubmitClientReport({
      kind: 'app_error',
      payload: {
        platform: 'ios', appVersion: '2.4.1', buildNumber: '319', feature: 'auth', screen: 'sign_in',
        severity: 'critical', context: 'auth:sign_in_failed', fingerprint: 'abc123',
        errorName: 'FirebaseAuthError', message: 'person@example.com could not sign in',
        stack: 'private stack text', tags: { retry: 2 },
      },
    });

    const errorDocs = reportDocs('app_errors');
    expect(errorDocs).toHaveLength(1);
    expect(errorDocs[0]).toMatchObject({
      platform: 'ios', appVersion: '2.4.1', buildNumber: '319', feature: 'auth', screen: 'sign_in',
      severity: 'critical', context: 'auth:sign_in_failed', fingerprint: 'abc123',
      errorName: 'FirebaseAuthError', message: 'person@example.com could not sign in',
      stack: 'private stack text', status: 'new',
    });
    // зачем: PM-227 audit нашёл, что uid НЕ псевдонимизируется по контракту
    // BACKEND.md ("псевдонимизация account identifier при необходимости") —
    // это осознанный компромисс поддержки (админ должен видеть, кому чинить),
    // зафиксирован явно как контракт, а не проверен по ошибке.
    expect(errorDocs[0]).toMatchObject({ uid: 'stable-reporter' });
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

  // зачем (владелец 17.09.2026: «может пожаловаться» — про отдельный отклик под
  // набором, ReportCommentModal.tsx): тот же callable/коллекция что жалоба на
  // набор целиком — их различает только присутствие commentId.
  test('records a report against the whole pack unchanged when no commentId is sent', async () => {
    const result = await callSubmitClientReport({
      kind: 'community_pack_report',
      payload: {
        packId: 'pack-1',
        packTitle: 'Airport phrases',
        authorStableId: 'author-1',
        reason: 'spam',
        comment: 'Whole pack is spam',
      },
    });

    expect(result).toMatchObject({ ok: true, collection: 'community_pack_reports' });
    const report = reportDocs('community_pack_reports')[0];
    expect(report).toMatchObject({ packId: 'pack-1', reason: 'spam', status: 'new' });
    expect(report).not.toHaveProperty('commentId');
    expect(report).not.toHaveProperty('commentAuthorStableId');
    expect(report).not.toHaveProperty('commentText');
  });

  test('records a report against a specific pack comment with its author and text', async () => {
    const result = await callSubmitClientReport({
      kind: 'community_pack_report',
      payload: {
        packId: 'pack-1',
        packTitle: 'Airport phrases',
        authorStableId: 'author-1',
        commentId: 'comment-42',
        commentAuthorStableId: 'commenter-9',
        commentText: 'Spammy comment text',
        reason: 'offensive',
        comment: 'Please review this comment',
      },
    });

    expect(result).toMatchObject({ ok: true, collection: 'community_pack_reports' });
    const report = reportDocs('community_pack_reports')[0];
    expect(report).toMatchObject({
      packId: 'pack-1',
      commentId: 'comment-42',
      commentAuthorStableId: 'commenter-9',
      commentText: 'Spammy comment text',
      reason: 'offensive',
      status: 'new',
      reporterUid: 'stable-reporter',
    });
  });
});
