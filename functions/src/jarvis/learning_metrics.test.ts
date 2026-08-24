import fs from 'node:fs';
import path from 'node:path';
import {
  fetchCohortRetentionMetrics,
  hashLearningMemberKey,
  prepareLearningCompletionMetrics,
  type LearningMetricFields,
} from './learning_metrics';

type Snapshot = { exists: boolean; data(): Record<string, unknown> | undefined };

function snapshot(data?: Record<string, unknown>): Snapshot {
  return { exists: data !== undefined, data: () => data };
}

function ref(pathValue: string): FirebaseFirestore.DocumentReference {
  return {
    path: pathValue,
    collection(name: string) {
      return { doc: (id: string) => ref(`${pathValue}/${name}/${id}`) };
    },
  } as unknown as FirebaseFirestore.DocumentReference;
}

function db(): FirebaseFirestore.Firestore {
  return {
    collection(name: string) {
      return { doc: (id: string) => ref(`${name}/${id}`) };
    },
  } as unknown as FirebaseFirestore.Firestore;
}

function txWith(reads: Record<string, Snapshot>) {
  return {
    get: jest.fn(async (documentRef: FirebaseFirestore.DocumentReference) => reads[documentRef.path] ?? snapshot()),
  } as unknown as FirebaseFirestore.Transaction & { get: jest.Mock };
}

const fields: LearningMetricFields = {
  increment: (value) => ({ increment: value }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
};

describe('server-owned learning cohort metrics', () => {
  const stableUid = 'stable-user-raw-value';
  const memberKey = hashLearningMemberKey(stableUid);

  test('first trusted completion prepares one anonymous cohort member and one cohort increment', async () => {
    const tx = txWith({});
    const prepared = await prepareLearningCompletionMetrics({
      db: db(), tx, stableUid, eventType: 'lesson_complete', occurredAt: new Date('2026-08-01T23:50:00Z'), fields,
    });

    expect(memberKey).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared).toMatchObject({ recorded: true, cohortDate: '2026-08-01', horizonDays: 0 });
    expect(prepared.writes.map((write) => [write.operation, write.ref.path])).toEqual([
      ['create', `jarvis_learning_cohort_members/${memberKey}`],
      ['create', `jarvis_learning_cohort_members/${memberKey}/activity_days/2026-08-01`],
      ['set_merge', 'jarvis_learning_cohorts/2026-08-01'],
    ]);
    expect(JSON.stringify(prepared)).not.toContain(stableUid);
    expect(prepared.writes[2].data).toMatchObject({
      cohortDate: '2026-08-01', cohortSize: { increment: 1 }, d1ReturningUsers: { increment: 0 }, d7ReturningUsers: { increment: 0 },
    });
  });

  test.each(['lesson_complete', 'dialog_complete', 'exam_complete', 'plan_task_complete'])(
    'records %s as a trusted learning completion',
    async (eventType) => {
      const prepared = await prepareLearningCompletionMetrics({
        db: db(), tx: txWith({}), stableUid, eventType, occurredAt: new Date('2026-08-01T12:00:00Z'), fields,
      });

      expect(prepared).toMatchObject({ recorded: true, cohortDate: '2026-08-01', horizonDays: 0 });
    },
  );

  test('does not record an unapplied personal-plan completion', async () => {
    const prepared = await prepareLearningCompletionMetrics({
      db: db(), tx: txWith({}), stableUid, eventType: 'plan_task_complete',
      completionApplied: false,
      occurredAt: new Date('2026-08-01T12:00:00Z'), fields,
    });

    expect(prepared).toMatchObject({ recorded: false, writes: [] });
  });

  test.each([
    [1, '2026-08-02', 'd1ReturningUsers'],
    [7, '2026-08-08', 'd7ReturningUsers'],
  ] as const)('increments D%s once for a returning member on %s', async (horizonDays, day, field) => {
    const memberPath = `jarvis_learning_cohort_members/${memberKey}`;
    const tx = txWith({ [memberPath]: snapshot({ cohortDate: '2026-08-01' }) });
    const prepared = await prepareLearningCompletionMetrics({
      db: db(), tx, stableUid, eventType: 'lesson_complete', occurredAt: new Date(`${day}T09:00:00Z`), fields,
    });

    expect(prepared).toMatchObject({ recorded: true, cohortDate: '2026-08-01', horizonDays });
    expect(prepared.writes[1].data).toMatchObject({ [field]: { increment: 1 } });
  });

  test('a second completion on the same return day is idempotent', async () => {
    const memberPath = `jarvis_learning_cohort_members/${memberKey}`;
    const activityPath = `${memberPath}/activity_days/2026-08-02`;
    const tx = txWith({
      [memberPath]: snapshot({ cohortDate: '2026-08-01' }),
      [activityPath]: snapshot({ day: '2026-08-02', horizonDays: 1 }),
    });
    const prepared = await prepareLearningCompletionMetrics({
      db: db(), tx, stableUid, eventType: 'lesson_complete', occurredAt: new Date('2026-08-02T18:00:00Z'), fields,
    });

    expect(prepared).toMatchObject({ recorded: false, duplicate: true, horizonDays: 1 });
    expect(prepared.writes).toEqual([]);
  });

  test('does not treat answer spam as a cohort completion', async () => {
    const tx = txWith({});
    const prepared = await prepareLearningCompletionMetrics({
      db: db(), tx, stableUid, eventType: 'lesson_answer', occurredAt: new Date('2026-08-01T12:00:00Z'), fields,
    });
    expect(prepared).toMatchObject({ recorded: false, duplicate: false, horizonDays: null });
    expect(tx.get).not.toHaveBeenCalled();
  });

  test('owner reader fetches only the D1/D7 aggregate documents', async () => {
    const get = jest.fn(async (documentRef: FirebaseFirestore.DocumentReference) => snapshot({
      cohortDate: documentRef.path.endsWith('2026-08-07') ? '2026-08-07' : '2026-08-01',
      cohortSize: 100,
      d1ReturningUsers: 42,
      d7ReturningUsers: 20,
    }));
    const aggregateDb = {
      collection(name: string) {
        return { doc: (id: string) => ref(`${name}/${id}`) };
      },
      getAll: async (...refs: FirebaseFirestore.DocumentReference[]) => Promise.all(refs.map(get)),
    } as unknown as FirebaseFirestore.Firestore;

    const metrics = await fetchCohortRetentionMetrics({
      db: aggregateDb,
      now: new Date('2026-08-08T12:00:00Z'),
    });

    expect(get.mock.calls.map(([documentRef]) => documentRef.path)).toEqual([
      'jarvis_learning_cohorts/2026-08-07',
      'jarvis_learning_cohorts/2026-08-01',
    ]);
    expect(metrics).toEqual([
      expect.objectContaining({ horizonDays: 1, cohortSize: 100, returningUsers: 42 }),
      expect.objectContaining({ horizonDays: 7, cohortSize: 100, returningUsers: 20 }),
    ]);
    expect(JSON.stringify(metrics)).not.toMatch(/uid|memberKey/i);
  });

  test('progress writer prepares metrics before spin reads and commits them only after all reads', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../progress_events.ts'), 'utf8');
    const prepareIndex = source.indexOf('prepareLearningCompletionMetrics({');
    const spinIndex = source.indexOf('applyLevelSpinMinting({');
    const commitIndex = source.indexOf('commitPreparedLearningMetrics(tx, learningMetrics)');
    expect(prepareIndex).toBeGreaterThan(0);
    expect(spinIndex).toBeGreaterThan(prepareIndex);
    expect(commitIndex).toBeGreaterThan(spinIndex);
    expect(source).toContain(
      "completionApplied: event.type !== 'plan_task_complete' || applied.xpDelta > 0",
    );
  });

  test('both aggregate roots are denied to browser clients and excluded from the admin catch-all', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8');
    for (const collection of ['jarvis_learning_cohort_members', 'jarvis_learning_cohorts']) {
      expect(rules).toContain(`match /${collection}/{document=**}`);
      expect(rules).toContain(`collection != '${collection}'`);
    }
  });
});
