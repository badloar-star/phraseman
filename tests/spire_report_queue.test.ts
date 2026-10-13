import {
  SPIRE_REPORT_FLUSH_INTERVAL_MS,
  spireApplyFlushFailure,
  spireApplyFlushResponse,
  spireApplyStepReport,
  spireClassifyFlushError,
  spireCreateWeekLocal,
  spireReportFromStepState,
  spireShouldFlush,
  type SpireStepReport,
} from '../modules/spire/report_queue';
import { spireFlushReports, spireLoadWeekLocal, spireRecordStep } from '../modules/spire/report_store';
import type { SpireStepState } from '../modules/spire/step_machine';

// PM-275: локальный прогресс Шпиля (optimistic) и очередь отчётов с досылкой.
const WEEK = '2026-W39';
const T0 = Date.UTC(2026, 8, 24, 9, 0, 0);

function stepState(phase: SpireStepState['phase'], elapsed = 60_000): SpireStepState {
  return {
    schemaVersion: 'spire-step-local.v1',
    packHash: 'pack_hash_abc123',
    step: 1,
    phase,
    taskIndex: 10,
    hearts: phase === 'failed' ? 0 : 3,
    elapsedBudgetMs: elapsed,
    budgetMs: 120_000,
    phaseBeforePauseKind: null,
    pausedAtElapsedMs: 0,
    voiceRetriesByTask: {},
    outcomes: [],
    failReason: phase === 'failed' ? 'hearts' : null,
  };
}

function reportAt(i: number, phase: 'passed' | 'failed' = 'passed'): SpireStepReport {
  const r = spireReportFromStepState(stepState(phase), {
    lang: 'en', weekKey: WEEK, tier: 1, floor: 1, stepInFloor: i, completedAtMs: T0 + i * 120_000,
  });
  if (!r) throw new Error('report expected');
  return r;
}

const silent = { info: () => undefined, warn: () => undefined };

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => { data.set(k, v); },
  };
}

describe('report_queue (чистая логика)', () => {
  test('Italian contour has its own isolated weekly progress key', () => {
    const local = spireCreateWeekLocal({ lang: 'it', weekKey: WEEK, tier: 1, packHash: 'pack_hash_it_abc123' });
    expect(local.lang).toBe('it');
  });

  test('незавершённая ступень отчёта не даёт', () => {
    expect(spireReportFromStepState(stepState('active'), {
      lang: 'en', weekKey: WEEK, tier: 1, floor: 1, stepInFloor: 0, completedAtMs: T0,
    })).toBeNull();
  });

  test('пройденная ступень поднимает маркер сразу, провал — нет; этаж 1 = 5 ступеней', () => {
    let local = spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' });
    const failed = spireApplyStepReport(local, reportAt(0, 'failed'));
    expect(failed.effect).toBe('stayed');
    expect(failed.local.stepsCleared).toBe(0);
    local = failed.local;
    const effects: string[] = [];
    for (let i = 1; i <= 5; i += 1) {
      const applied = spireApplyStepReport(local, reportAt(i));
      effects.push(applied.effect);
      local = applied.local;
    }
    expect(effects).toEqual(['marker_up', 'marker_up', 'marker_up', 'marker_up', 'floor_cleared']);
    expect(local.floor).toBe(2);
    expect(local.stepInFloor).toBe(0);
    expect(local.pending).toHaveLength(6);
  });

  test('двойной тап тем же отчётом не поднимает маркер дважды', () => {
    const local = spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' });
    const once = spireApplyStepReport(local, reportAt(1)).local;
    const twice = spireApplyStepReport(once, reportAt(1));
    expect(twice.effect).toBe('duplicate_ignored');
    expect(twice.local.stepsCleared).toBe(1);
  });

  test('интервал 5 минут и пустая очередь решаются без сети', () => {
    const empty = spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' });
    expect(spireShouldFlush(empty, T0, 'screen_leave').flush).toBe(false);
    const local = { ...spireApplyStepReport(empty, reportAt(1)).local, lastFlushAttemptAtMs: T0 };
    expect(spireShouldFlush(local, T0 + 60_000, 'interval').flush).toBe(false);
    expect(spireShouldFlush(local, T0 + SPIRE_REPORT_FLUSH_INTERVAL_MS, 'interval').flush).toBe(true);
    expect(spireShouldFlush(local, T0 + 1, 'screen_leave').flush).toBe(true);
  });

  // зачем (решение владельца 13.10, журнал п.86): прежнее правило «маркер не трогаем» заменено откатом отвергнутой ПРОЙДЕННОЙ ступени — подробности в tests/spire_reject_rollback.test.ts
  test('ответ сервера снимает отвеченные строки; отвергнутая пройденная ступень откатывает маркер на одну', () => {
    let local = spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' });
    local = spireApplyStepReport(local, reportAt(1)).local;
    local = spireApplyStepReport(local, reportAt(2)).local;
    const [a, b] = local.pending;
    const applied = spireApplyFlushResponse(local, {
      ok: true, weekKey: WEEK, serverSteps: 0,
      results: [{ reportId: a.reportId, verdict: 'rejected', reason: 'too_fast' }],
    }, T0);
    expect(applied.local.pending.map((r) => r.reportId)).toEqual([b.reportId]);
    expect(applied.local.stepsCleared).toBe(1);
    expect(applied.rollback?.steps).toBe(1);
    expect(applied.local.serverAck?.steps).toBe(0);
    expect(applied.local.rejectedTotal).toBe(1);
  });

  test('офлайн — очередь цела и backoff; ошибка формы — строки выбрасываются', () => {
    const local = spireApplyStepReport(
      spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' }),
      reportAt(1),
    ).local;
    expect(spireClassifyFlushError({ code: 'functions/unavailable' })).toBe('offline');
    const offline = spireApplyFlushFailure(local, 'offline', [local.pending[0].reportId], T0);
    expect(offline.local.pending).toHaveLength(1);
    expect(offline.local.nextAttemptAtMs).toBeGreaterThan(T0);
    const bad = spireApplyFlushFailure(local, 'bad_request', [local.pending[0].reportId], T0);
    expect(bad.local.pending).toHaveLength(0);
    expect(bad.local.stepsCleared).toBe(1);
  });
});

describe('report_store (очередь на диске)', () => {
  test('офлайн копит, потом досылает одной пачкой; ступень во время запроса не теряется', async () => {
    const store = memoryStore();
    await spireRecordStep(store, { uid: 'u1', lang: 'en', report: reportAt(1), logger: silent });
    await spireRecordStep(store, { uid: 'u1', lang: 'en', report: reportAt(2), logger: silent });

    let now = T0 + 10 * 60_000;
    const offline = await spireFlushReports(store, {
      uid: 'u1', lang: 'en', trigger: 'screen_leave', nowMs: () => now, logger: silent,
      send: async () => { throw Object.assign(new Error('network error'), { code: 'unavailable' }); },
    });
    expect(offline.status).toBe('failed');
    expect((await spireLoadWeekLocal(store, 'u1', 'en', silent))?.pending).toHaveLength(2);

    now += 60 * 60_000;
    let calls = 0;
    const sent = await spireFlushReports(store, {
      uid: 'u1', lang: 'en', trigger: 'app_start', nowMs: () => now, logger: silent,
      send: async (payload) => {
        calls += 1;
        // Пока идёт запрос, человек прошёл ещё одну ступень.
        await spireRecordStep(store, { uid: 'u1', lang: 'en', report: reportAt(3), logger: silent });
        return {
          ok: true, weekKey: WEEK, serverSteps: 2,
          results: payload.reports.map((r) => ({ reportId: String(r.reportId), verdict: 'accepted' as const })),
        };
      },
    });
    expect(calls).toBe(1);
    expect(sent.status).toBe('sent');
    const after = await spireLoadWeekLocal(store, 'u1', 'en', silent);
    expect(after?.stepsCleared).toBe(3);
    expect(after?.pending.map((r) => r.reportId)).toEqual([reportAt(3).reportId]);
  });
});
