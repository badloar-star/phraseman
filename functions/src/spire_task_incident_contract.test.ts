import {
  parseSpireTaskIncident,
  planAcceptedSpireTaskReport,
  planSpireTaskIncidentStateChange,
  spireTaskIncidentId,
  spireTaskIncidentOperationId,
  type SpireTaskIncident,
} from './spire_task_incident_contract';
import { parseSpireTaskFlagsDocStrict } from './spire_task_flag_contract';

const TASK_ID = 'arena-es-fill_gap-1-0000';

function evidence(reportId = 'r-1') {
  return {
    reportId, studyTarget: 'es' as const, taskId: TASK_ID, weekId: '2026-W40', tier: 1,
    packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', reason: 'Неверный ответ', mode: 'fill_gap', difficulty: 1,
  };
}

function accepted(existing: SpireTaskIncident | null, reportId: string, nowMs: number) {
  return planAcceptedSpireTaskReport({
    existing,
    evidence: evidence(reportId),
    nowMs,
    flags: parseSpireTaskFlagsDocStrict(null, 'es'),
  });
}

describe('Spire canonical incident contract', () => {
  test('German report quarantines its exact task and verified restore returns it to future packs', () => {
    const germanTaskId = 'arena-de-fill_gap-1-0000';
    const first = planAcceptedSpireTaskReport({
      existing: null,
      evidence: {
        reportId: 'de-report-1', studyTarget: 'de', taskId: germanTaskId, weekId: '2026-W40', tier: 1,
        packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', reason: 'Неверный ответ', mode: 'fill_gap', difficulty: 1,
      },
      nowMs: 100,
      flags: parseSpireTaskFlagsDocStrict(null, 'de'),
    });
    expect(first.incident).toMatchObject({ studyTarget: 'de', taskId: germanTaskId, state: 'quarantined' });
    expect(first.nextFlags.flagged[germanTaskId]).toBeDefined();
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    expect(restored.incident).toMatchObject({ studyTarget: 'de', state: 'restored', revision: 2 });
    expect(restored.nextFlags.flagged[germanTaskId]).toBeUndefined();
    expect(spireTaskIncidentId('de', germanTaskId)).toBe(`de__${germanTaskId}`);
  });

  test('Italian report quarantines config/spire_task_flags_it and verified restore returns it to future packs', () => {
    const italianTaskId = 'arena-it-fill_gap-1-0000';
    const first = planAcceptedSpireTaskReport({
      existing: null,
      evidence: {
        reportId: 'it-report-1', studyTarget: 'it', taskId: italianTaskId, weekId: '2026-W40', tier: 1,
        packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', reason: 'Неверный ответ', mode: 'fill_gap', difficulty: 1,
      },
      nowMs: 100,
      flags: parseSpireTaskFlagsDocStrict(null, 'it'),
    });
    expect(first.incident).toMatchObject({ studyTarget: 'it', taskId: italianTaskId, state: 'quarantined' });
    expect(first.nextFlags).toMatchObject({ studyTarget: 'it' });
    expect(first.nextFlags.flagged[italianTaskId]).toBeDefined();
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    expect(restored.incident).toMatchObject({ studyTarget: 'it', state: 'restored', revision: 2 });
    expect(restored.nextFlags.flagged[italianTaskId]).toBeUndefined();
    expect(spireTaskIncidentId('it', italianTaskId)).toBe(`it__${italianTaskId}`);
  });

  test('English Spire report quarantines and restores its exact published task ID', () => {
    const englishTaskId = 'spire-en-listen-en:lesson-03:session-43:i02';
    const first = planAcceptedSpireTaskReport({
      existing: null,
      evidence: {
        reportId: 'en-report-1', studyTarget: 'en', taskId: englishTaskId, weekId: '2026-W40', tier: 1,
        packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', reason: 'Wrong audio', mode: 'listen', difficulty: 1,
      },
      nowMs: 100,
      flags: parseSpireTaskFlagsDocStrict(null, 'en'),
    });
    expect(first.incident).toMatchObject({ studyTarget: 'en', taskId: englishTaskId, state: 'quarantined' });
    expect(first.nextFlags.flagged[englishTaskId]).toBeDefined();
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    expect(restored.nextFlags.flagged[englishTaskId]).toBeUndefined();
  });

  test('first report quarantines and later reports increment a bounded incident without changing revision', () => {
    let plan = accepted(null, 'r-1', 100);
    expect(plan.incident).toMatchObject({ state: 'quarantined', quarantineOwner: 'incident', manualHoldActive: false, revision: 1, reportCount: 1, latestReportId: 'r-1' });
    expect(plan.nextFlags.flagged[TASK_ID]).toBeDefined();
    for (let index = 2; index <= 101; index += 1) plan = accepted(plan.incident, `r-${index}`, 100 + index);
    expect(plan.incident).toMatchObject({ state: 'quarantined', revision: 1, reportCount: 101, latestReportId: 'r-101' });
  });

  test('restore then reopen then restore uses a fresh monotonic revision every lifecycle', () => {
    const first = accepted(null, 'r-1', 100);
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    const reopened = planSpireTaskIncidentStateChange({
      incident: restored.incident, nextState: 'quarantined', actorUid: 'admin-1', nowMs: 300, flags: restored.nextFlags,
    });
    const restoredAgain = planSpireTaskIncidentStateChange({
      incident: reopened.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 400, flags: reopened.nextFlags,
    });
    expect([restored.incident.revision, reopened.incident.revision, restoredAgain.incident.revision]).toEqual([2, 3, 4]);
    expect(restoredAgain.nextFlags.flagged[TASK_ID]).toBeUndefined();
  });

  test('a report after restoration starts a new quarantine revision', () => {
    const first = accepted(null, 'r-1', 100);
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    const replayedTask = planAcceptedSpireTaskReport({
      existing: restored.incident, evidence: evidence('r-2'), nowMs: 300, flags: restored.nextFlags,
    });
    expect(replayedTask.incident).toMatchObject({ state: 'quarantined', revision: 3, reportCount: 2 });
  });

  test('lost-response retry keeps one operation id while a later lifecycle gets a new one', () => {
    const firstRestore = spireTaskIncidentOperationId('es', TASK_ID, 1, 'restored');
    expect(spireTaskIncidentOperationId('es', TASK_ID, 1, 'restored')).toBe(firstRestore);
    expect(spireTaskIncidentOperationId('es', TASK_ID, 2, 'quarantined')).not.toBe(firstRestore);
    expect(spireTaskIncidentOperationId('es', TASK_ID, 3, 'restored')).not.toBe(firstRestore);
  });

  test('strictly decodes canonical incident identity', () => {
    const incident = accepted(null, 'r-1', 100).incident;
    expect(spireTaskIncidentId('es', TASK_ID)).toBe(`es__${TASK_ID}`);
    expect(parseSpireTaskIncident(incident, 'es', TASK_ID)).toEqual(incident);
    expect(() => parseSpireTaskIncident({ ...incident, taskId: 'arena-es-other' }, 'es', TASK_ID))
      .toThrow('spire_task_incident_invalid');
  });

  test('strict flag decode rejects damaged state without sanitizing or dropping entries', () => {
    const damaged = {
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: { [TASK_ID]: { taskId: 'different', reason: 'bad', flaggedAtMs: 1, flaggedByUid: 'admin' } },
    };
    const before = JSON.stringify(damaged);
    expect(() => parseSpireTaskFlagsDocStrict(damaged, 'es')).toThrow('spire_task_flags_invalid');
    expect(JSON.stringify(damaged)).toBe(before);
  });

  test('preexisting manual hold remains after verified restore', () => {
    const manualFlags = parseSpireTaskFlagsDocStrict({
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: { [TASK_ID]: { taskId: TASK_ID, reason: 'Manual QA', flaggedAtMs: 90, flaggedByUid: 'admin-1' } },
    }, 'es');
    const first = planAcceptedSpireTaskReport({ existing: null, evidence: evidence(), nowMs: 100, flags: manualFlags });
    expect(first.incident).toMatchObject({ quarantineOwner: 'manual', manualHoldActive: true });
    const restored = planSpireTaskIncidentStateChange({
      incident: first.incident, nextState: 'restored', actorUid: 'admin-1', nowMs: 200, flags: first.nextFlags,
    });
    expect(restored.nextFlags.flagged[TASK_ID]).toEqual(manualFlags.flagged[TASK_ID]);
    expect(restored.incident.manualHoldActive).toBe(true);
  });

  test('strict flag decode rejects an exact-shaped cross-language task without mutation', () => {
    const damaged = {
      schemaVersion: 'spire-task-flags-v1', studyTarget: 'es',
      flagged: { 'arena-de-fill_gap-1-0000': {
        taskId: 'arena-de-fill_gap-1-0000', reason: 'wrong language', flaggedAtMs: 1, flaggedByUid: 'admin',
      } },
    };
    const before = JSON.stringify(damaged);
    expect(() => parseSpireTaskFlagsDocStrict(damaged, 'es')).toThrow('spire_task_flags_invalid');
    expect(JSON.stringify(damaged)).toBe(before);
  });
});
