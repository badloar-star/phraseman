export {};

type Row = Record<string, unknown>;
type Ref = { id: string; path: string };
type Snap = { exists: boolean; data(): Row | undefined };

const docs = new Map<string, Row>();
let autoId = 0;

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));
jest.mock('firebase-admin', () => {
  const firestore = jest.fn();
  (firestore as unknown as { FieldValue: Row }).FieldValue = { serverTimestamp: () => ({ server: true }) };
  (firestore as unknown as { FieldPath: Row }).FieldPath = { documentId: () => '__name__' };
  return { firestore };
});

function ref(path: string): Ref { return { id: path.split('/').pop() || path, path }; }
function snap(reference: Ref): Snap {
  const data = docs.get(reference.path);
  return { exists: data !== undefined, data: () => data };
}

function fakeDb() {
  return {
    collection(name: string) {
      return { doc(id?: string) { return ref(`${name}/${id || `auto-${++autoId}`}`); } };
    },
    async runTransaction<T>(work: (tx: {
      get(reference: Ref): Promise<Snap>;
      set(reference: Ref, data: Row): void;
      create(reference: Ref, data: Row): void;
      update(reference: Ref, data: Row): void;
    }) => Promise<T>): Promise<T> {
      const writes: Array<() => void> = [];
      const result = await work({
        get: async (reference) => snap(reference),
        set: (reference, data) => writes.push(() => docs.set(reference.path, { ...data })),
        create: (reference, data) => writes.push(() => {
          if (docs.has(reference.path)) throw new Error('already exists');
          docs.set(reference.path, { ...data });
        }),
        update: (reference, data) => writes.push(() => {
          const existing = docs.get(reference.path);
          if (!existing) throw new Error('missing');
          docs.set(reference.path, { ...existing, ...data });
        }),
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

const taskId = 'arena-es-fill_gap-1-0000';
function incident(overrides: Row = {}): Row {
  return {
    schemaVersion: 'spire-task-incident-v1', studyTarget: 'es', taskId,
    state: 'quarantined', quarantineOwner: 'incident', manualHoldActive: false, revision: 1, reportCount: 1,
    firstReportedAtMs: 1, latestReportedAtMs: 2, latestReportId: 'report-1',
    latestWeekId: '2026-W40', latestTier: 1, latestPackHash: 'sp1_hash',
    latestReason: 'wrong', latestMode: 'fill_gap', latestDifficulty: 1, updatedAtMs: 2,
    ...overrides,
  };
}
function flags(overrides: Row = {}): Row {
  return {
    schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
    flagged: { [taskId]: { taskId, reason: 'Жалоба игрока', flaggedAtMs: 2, flaggedByUid: 'server:client-report' } },
    ...overrides,
  };
}
function selectedReport(overrides: Row = {}): Row {
  return { contentScope: 'spire', spireLang: 'es', spireTaskId: taskId, status: 'new', ...overrides };
}

beforeEach(() => { docs.clear(); autoId = 0; });

describe('Spire incident state transaction', () => {
  test('dedicated queue fetches the first actionable incident even after more than 50 restored incidents', async () => {
    const { listActionableSpireTaskIncidents } = require('./admin_spire_task_flag');
    const records = [
      ...Array.from({ length: 60 }, (_, index) => {
        const id = `arena-es-fill_gap-1-${String(index).padStart(4, '0')}`;
        return { id: `es__${id}`, data: incident({ taskId: id, state: 'restored', latestReportedAtMs: 10_000 - index }) };
      }),
      { id: 'es__arena-es-fill_gap-1-9999', data: incident({
        taskId: 'arena-es-fill_gap-1-9999', state: 'quarantined', latestReportedAtMs: 1,
      }) },
    ];
    const whereCalls: unknown[][] = [];
    const orderCalls: unknown[][] = [];
    let requestedLimit = 0;
    const query: Record<string, unknown> = {};
    query.where = (...args: unknown[]) => { whereCalls.push(args); return query; };
    query.orderBy = (...args: unknown[]) => { orderCalls.push(args); return query; };
    query.startAfter = () => query;
    query.limit = (value: number) => { requestedLimit = value; return query; };
    query.get = async () => {
      const actionable = records
        .filter((row) => row.data.studyTarget === 'es' && row.data.state === 'quarantined')
        .sort((left, right) => Number(right.data.latestReportedAtMs) - Number(left.data.latestReportedAtMs))
        .slice(0, requestedLimit)
        .map((row) => ({ id: row.id, data: () => row.data }));
      return { docs: actionable, size: actionable.length };
    };
    const result = await listActionableSpireTaskIncidents({
      db: { collection: () => query }, lang: 'es', limit: 50, cursor: '',
    });
    expect(whereCalls).toEqual([
      ['studyTarget', '==', 'es'],
      ['state', '==', 'quarantined'],
    ]);
    expect(orderCalls).toEqual([
      ['latestReportedAtMs', 'desc'],
      ['__name__', 'asc'],
    ]);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toMatchObject({ taskId: 'arena-es-fill_gap-1-9999', state: 'quarantined' });
  });

  test('round-trips a cursor containing the maximum 200-character task id', async () => {
    const { listActionableSpireTaskIncidents, requireSpireIncidentCursor } = require('./admin_spire_task_flag');
    const maxTaskId = `arena-es-${'x'.repeat(191)}`;
    expect(maxTaskId).toHaveLength(200);
    const maxDocId = `es__${maxTaskId}`;
    const firstQuery: Record<string, unknown> = {};
    firstQuery.where = () => firstQuery;
    firstQuery.orderBy = () => firstQuery;
    firstQuery.startAfter = () => firstQuery;
    firstQuery.limit = () => firstQuery;
    firstQuery.get = async () => ({
      docs: [
        { id: maxDocId, data: () => incident({ taskId: maxTaskId, latestReportedAtMs: 999 }) },
        { id: `es__${taskId}`, data: () => incident({ latestReportedAtMs: 998 }) },
      ],
      size: 2,
    });
    const first = await listActionableSpireTaskIncidents({
      db: { collection: () => firstQuery }, lang: 'es', limit: 1, cursor: '',
    });
    expect(typeof first.nextCursor).toBe('string');
    expect(String(first.nextCursor).length).toBeGreaterThan(240);
    expect(requireSpireIncidentCursor(first.nextCursor)).toBe(first.nextCursor);

    const startAfter = jest.fn();
    const secondQuery: Record<string, unknown> = {};
    secondQuery.where = () => secondQuery;
    secondQuery.orderBy = () => secondQuery;
    secondQuery.startAfter = (...args: unknown[]) => { startAfter(...args); return secondQuery; };
    secondQuery.limit = () => secondQuery;
    secondQuery.get = async () => ({ docs: [], size: 0 });
    await listActionableSpireTaskIncidents({
      db: { collection: () => secondQuery }, lang: 'es', limit: 1, cursor: String(first.nextCursor),
    });
    expect(startAfter).toHaveBeenCalledWith(999, maxDocId);
  });

  test('declares the exact composite index used by the actionable incident query', () => {
    const { readFileSync } = require('node:fs');
    const { join } = require('node:path');
    const config = JSON.parse(readFileSync(join(__dirname, '..', '..', 'firestore.indexes.json'), 'utf8')) as {
      indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order: string }> }>;
    };
    expect(config.indexes).toContainEqual({
      collectionGroup: 'spire_task_incidents', queryScope: 'COLLECTION', fields: [
        { fieldPath: 'studyTarget', order: 'ASCENDING' },
        { fieldPath: 'state', order: 'ASCENDING' },
        { fieldPath: 'latestReportedAtMs', order: 'DESCENDING' },
        { fieldPath: '__name__', order: 'ASCENDING' },
      ],
    });
  });

  test.each(['support', 'moderator', 'analyst', 'admin'])(
    'allows %s to hydrate canonical incident state with reports.read only',
    (role) => {
      const { requireSpireTaskIncidentReader } = require('./admin_spire_task_flag');
      expect(requireSpireTaskIncidentReader({ auth: { uid: 'reader-1', token: { admin: true, adminRole: role } } }))
        .toMatchObject({ actorUid: 'reader-1', role });
    },
  );

  test('does not grant incident hydration to a content-only role', () => {
    const { requireSpireTaskIncidentReader } = require('./admin_spire_task_flag');
    expect(() => requireSpireTaskIncidentReader({
      auth: { uid: 'editor-1', token: { admin: true, adminRole: 'content_editor' } },
    })).toThrow('Role cannot use reports.read');
  });

  test('lost-response replay produces exactly one state mutation, audit, and durable operation', async () => {
    const { setSpireTaskIncidentStateCore } = require('./admin_spire_task_flag');
    docs.set(`spire_task_incidents/es__${taskId}`, incident());
    docs.set('config/spire_task_flags_es', flags());
    docs.set('error_reports/report-1', selectedReport());
    const input = {
      db: fakeDb(), actor: { actorUid: 'admin-1', role: 'owner' as const }, lang: 'es' as const,
      taskId, reportId: 'report-1', nextState: 'restored' as const, expectedRevision: 1, reason: 'verified', nowMs: 100,
    };
    const first = await setSpireTaskIncidentStateCore(input);
    const retry = await setSpireTaskIncidentStateCore(input);
    expect(first).toMatchObject({ replayed: false, revision: 2 });
    expect(retry).toMatchObject({ replayed: true, revision: 2, operationId: first.operationId });
    expect(Array.from(docs.keys()).filter((path) => path.startsWith('admin_log/'))).toHaveLength(1);
    expect(Array.from(docs.keys()).filter((path) => path.startsWith('admin_command_operations/'))).toHaveLength(1);
    expect(docs.get(`spire_task_incidents/es__${taskId}`)).toMatchObject({ state: 'restored', revision: 2 });
    expect(docs.get('error_reports/report-1')).toMatchObject({
      status: 'fixed', fixedAtMs: 100, adminStatusUpdatedBy: 'admin-1',
    });
    const { reportDocumentAllowsReward } = require('./report_replies');
    expect(reportDocumentAllowsReward(docs.get('error_reports/report-1') ?? {}, 'confirmed_fixed')).toBe(true);
  });

  test('revision conflict is fail-closed with no writes', async () => {
    const { setSpireTaskIncidentStateCore } = require('./admin_spire_task_flag');
    docs.set(`spire_task_incidents/es__${taskId}`, incident({ revision: 2 }));
    docs.set('config/spire_task_flags_es', flags());
    docs.set('error_reports/report-1', selectedReport());
    const before = JSON.stringify(Array.from(docs.entries()));
    await expect(setSpireTaskIncidentStateCore({
      db: fakeDb(), actor: { actorUid: 'admin-1', role: 'owner' }, lang: 'es', taskId, reportId: 'report-1',
      nextState: 'restored', expectedRevision: 1, reason: 'stale', nowMs: 100,
    })).rejects.toMatchObject({ code: 'aborted', message: 'spire_task_incident_revision_changed' });
    expect(JSON.stringify(Array.from(docs.entries()))).toBe(before);
  });

  test('reopen persists the selected source report as open without scanning duplicates', async () => {
    const { setSpireTaskIncidentStateCore } = require('./admin_spire_task_flag');
    docs.set(`spire_task_incidents/es__${taskId}`, incident({ state: 'restored', revision: 2 }));
    docs.set('config/spire_task_flags_es', { schemaVersion: 'spire-task-flags-v1', studyTarget: 'es', flagged: {} });
    docs.set('error_reports/report-1', selectedReport({ status: 'fixed', fixedAt: 'old', fixedAtMs: 90 }));
    docs.set('error_reports/duplicate-report', selectedReport({ status: 'new' }));
    await setSpireTaskIncidentStateCore({
      db: fakeDb(), actor: { actorUid: 'admin-1', role: 'owner' }, lang: 'es', taskId, reportId: 'report-1',
      nextState: 'quarantined', expectedRevision: 2, reason: 'regression', nowMs: 200,
    });
    expect(docs.get('error_reports/report-1')).toMatchObject({
      status: 'open', fixedAt: null, fixedAtMs: null, adminStatusUpdatedBy: 'admin-1',
    });
    expect(docs.get('error_reports/duplicate-report')).toMatchObject({ status: 'new' });
  });

  test('manual flag lifecycle clears the canonical active hold after verified restore and manual unflag', async () => {
    const { planAcceptedSpireTaskReport } = require('./spire_task_incident_contract');
    const { parseSpireTaskFlagsDocStrict } = require('./spire_task_flag_contract');
    const { setSpireTaskIncidentStateCore, removeSpireTaskFlagCore } = require('./admin_spire_task_flag');
    const manualFlags = parseSpireTaskFlagsDocStrict({
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: { [taskId]: { taskId, reason: 'Manual QA', flaggedAtMs: 1, flaggedByUid: 'admin-1' } },
    }, 'es');
    const accepted = planAcceptedSpireTaskReport({
      existing: null,
      evidence: {
        reportId: 'report-1', studyTarget: 'es', taskId, weekId: '2026-W40', tier: 1,
        packHash: 'sp1_hash', reason: 'wrong', mode: 'fill_gap', difficulty: 1,
      },
      nowMs: 2,
      flags: manualFlags,
    });
    docs.set(`spire_task_incidents/es__${taskId}`, accepted.incident);
    docs.set('config/spire_task_flags_es', accepted.nextFlags);
    docs.set('error_reports/report-1', selectedReport());
    const db = fakeDb();
    const restored = await setSpireTaskIncidentStateCore({
      db, actor: { actorUid: 'admin-1', role: 'owner' }, lang: 'es', taskId, reportId: 'report-1',
      nextState: 'restored', expectedRevision: 1, reason: 'verified', nowMs: 100,
    });
    expect(restored).toMatchObject({ manualHoldRemains: true, revision: 2 });
    expect(docs.get('config/spire_task_flags_es')).toMatchObject({
      flagged: { [taskId]: expect.objectContaining({ reason: 'Manual QA' }) },
    });

    const unflagged = await removeSpireTaskFlagCore({
      db, actor: { actorUid: 'admin-1', role: 'owner' }, lang: 'es', taskId,
      reason: 'manual QA complete', nowMs: 200,
    });
    expect(unflagged).toMatchObject({ manualHoldRemains: false, revision: 3 });
    expect(docs.get('config/spire_task_flags_es')).toMatchObject({ flagged: {} });
    expect(docs.get(`spire_task_incidents/es__${taskId}`)).toMatchObject({
      state: 'restored', quarantineOwner: 'manual', manualHoldActive: false, revision: 3,
    });
  });

  test('strict cross-language flag corruption remains byte/logically unchanged and writes no audit or operation', async () => {
    const { setSpireTaskIncidentStateCore } = require('./admin_spire_task_flag');
    docs.set(`spire_task_incidents/es__${taskId}`, incident());
    docs.set('config/spire_task_flags_es', flags({
      flagged: { 'arena-de-fill_gap-1-0000': {
        taskId: 'arena-de-fill_gap-1-0000', reason: 'bad', flaggedAtMs: 2, flaggedByUid: 'admin-1',
      } },
    }));
    docs.set('error_reports/report-1', selectedReport());
    const before = JSON.stringify(Array.from(docs.entries()));
    await expect(setSpireTaskIncidentStateCore({
      db: fakeDb(), actor: { actorUid: 'admin-1', role: 'owner' }, lang: 'es', taskId, reportId: 'report-1',
      nextState: 'restored', expectedRevision: 1, reason: 'verified', nowMs: 100,
    })).rejects.toThrow('spire_task_flags_invalid');
    expect(JSON.stringify(Array.from(docs.entries()))).toBe(before);
    expect(Array.from(docs.keys()).some((path) => path.startsWith('admin_log/'))).toBe(false);
    expect(Array.from(docs.keys()).some((path) => path.startsWith('admin_command_operations/'))).toBe(false);
  });
});
