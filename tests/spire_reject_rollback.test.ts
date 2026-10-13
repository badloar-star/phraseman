import {
  spireApplyFlushResponse,
  spireApplyStepReport,
  spireCreateWeekLocal,
  spireMarkerFromSteps,
  spireReportFromStepState,
  spireRollbackSteps,
  type SpireStepReport,
  type SpireWeekLocal,
} from '../modules/spire/report_queue';
import { spireFlushReports, spireLoadWeekLocal, spireRecordStep } from '../modules/spire/report_store';
import type { SpireStepState } from '../modules/spire/step_machine';

// зачем (решение владельца 13.10, журнал п.86): сервер отверг пройденную ступень → локальный маркер откатывается, но поздний/повторный отказ
// не стирает принятое. Раньше правило было обратным («маркер не трогаем») — см. комментарий в report_queue.ts.
const WEEK = '2026-W39';
const T0 = Date.UTC(2026, 8, 24, 9, 0, 0);

function stepState(phase: SpireStepState['phase'], elapsed = 60_000): SpireStepState {
  return {
    schemaVersion: 'spire-step-local.v1', packHash: 'pack_hash_abc123', step: 1, phase, taskIndex: 10,
    hearts: phase === 'failed' ? 0 : 3, elapsedBudgetMs: elapsed, budgetMs: 120_000, phaseBeforePauseKind: null,
    pausedAtElapsedMs: 0, voiceRetriesByTask: {}, outcomes: [], failReason: phase === 'failed' ? 'hearts' : null,
  };
}

function reportAt(i: number, phase: 'passed' | 'failed' = 'passed', weekKey = WEEK): SpireStepReport {
  const r = spireReportFromStepState(stepState(phase), { lang: 'en', weekKey, tier: 1, floor: 1, stepInFloor: i, completedAtMs: T0 + i * 120_000 });
  if (!r) throw new Error('report expected');
  return r;
}

function weekWith(n: number): SpireWeekLocal {
  let local = spireCreateWeekLocal({ lang: 'en', weekKey: WEEK, tier: 1, packHash: 'pack_hash_abc123' });
  for (let i = 1; i <= n; i += 1) local = spireApplyStepReport(local, reportAt(i)).local;
  return local;
}

const silent = { info: () => undefined, warn: () => undefined };
function memoryStore() {
  const data = new Map<string, string>();
  return { data, getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => { data.set(k, v); } };
}

describe('лестница этажей: ступени → маркер', () => {
  test('5,6,7,8,9 ступеней на этажах 1–5, дальше по 10', () => {
    expect(spireMarkerFromSteps(0)).toEqual({ floor: 1, stepInFloor: 0 });
    expect(spireMarkerFromSteps(4)).toEqual({ floor: 1, stepInFloor: 4 });
    expect(spireMarkerFromSteps(5)).toEqual({ floor: 2, stepInFloor: 0 });
    expect(spireMarkerFromSteps(11)).toEqual({ floor: 3, stepInFloor: 0 });
    expect(spireMarkerFromSteps(35)).toEqual({ floor: 6, stepInFloor: 0 });
    expect(spireMarkerFromSteps(36)).toEqual({ floor: 6, stepInFloor: 1 });
  });

  test('совпадает с тем, что накопили по одной ступени', () => {
    for (let n = 0; n <= 60; n += 1) {
      const local = weekWith(n);
      expect({ floor: local.floor, stepInFloor: local.stepInFloor }).toEqual(spireMarkerFromSteps(n));
    }
  });
});

describe('откат маркера по отказу сервера', () => {
  test('отвергнутая пройденная ступень: маркер и время откатываются, строка снимается из очереди', () => {
    const local = weekWith(3);
    const [a] = local.pending;
    const applied = spireApplyFlushResponse(local, { ok: true, weekKey: WEEK, serverSteps: 0, results: [{ reportId: a.reportId, verdict: 'rejected', reason: 'pack_mismatch' }] }, T0);
    expect(applied.local.stepsCleared).toBe(2);
    expect(applied.local.totalMs).toBe(local.totalMs - a.durationMs);
    expect(applied.rollback).toMatchObject({ steps: 1, durationMs: a.durationMs });
    expect(applied.rollback?.reports.map((r) => r.reportId)).toEqual([a.reportId]);
    expect(applied.local.pending.map((r) => r.reportId)).not.toContain(a.reportId);
  });

  test('граница этажа: пятая ступень (этаж 2) отвергнута → снова этаж 1, ступень 4', () => {
    const local = weekWith(5);
    expect(local.floor).toBe(2);
    const last = local.pending[4];
    const applied = spireApplyFlushResponse(local, { ok: true, weekKey: WEEK, serverSteps: 4, results: [{ reportId: last.reportId, verdict: 'rejected', reason: 'tier_mismatch' }] }, T0);
    expect(applied.local.floor).toBe(1);
    expect(applied.local.stepInFloor).toBe(4);
    expect(applied.local.stepsCleared).toBe(4);
  });

  test('отвергнутый ПРОВАЛ маркер не двигает', () => {
    let local = weekWith(2);
    local = spireApplyStepReport(local, reportAt(3, 'failed')).local;
    const failed = local.pending[2];
    const applied = spireApplyFlushResponse(local, { ok: true, weekKey: WEEK, serverSteps: 0, results: [{ reportId: failed.reportId, verdict: 'rejected', reason: 'malformed' }] }, T0);
    expect(applied.local.stepsCleared).toBe(2);
    expect(applied.rollback).toBeNull();
  });

  test('повтор: строки уже нет в очереди → второй ответ ничего не откатывает (идемпотентно)', () => {
    const local = weekWith(3);
    const [a] = local.pending;
    const response = { ok: true, weekKey: WEEK, serverSteps: 0, results: [{ reportId: a.reportId, verdict: 'rejected' as const, reason: 'pack_mismatch' }] };
    const first = spireApplyFlushResponse(local, response, T0);
    const second = spireApplyFlushResponse(first.local, response, T0 + 1000);
    expect(first.local.stepsCleared).toBe(2);
    expect(second.local.stepsCleared).toBe(2);
    expect(second.rollback).toBeNull();
  });

  test('ниже подтверждённого сервером числа не опускаемся (поздний отказ не стирает принятое)', () => {
    // На диске три пройденных, сервер ранее подтвердил 3 (в т.ч. по этой же цепочке), а теперь «отвергает» одну повторно присланную строку.
    const base = weekWith(3);
    const confirmed: SpireWeekLocal = { ...base, serverAck: { steps: 3, reachedAtMs: base.reachedAtMs, totalMs: base.totalMs, atMs: T0 } };
    const row = confirmed.pending[0];
    const applied = spireApplyFlushResponse(confirmed, { ok: true, weekKey: WEEK, serverSteps: 3, results: [{ reportId: row.reportId, verdict: 'rejected', reason: 'clock_ahead' }] }, T0);
    expect(applied.local.stepsCleared).toBe(3);
    expect(applied.rollback).toBeNull();
  });

  test('строка чужой недели маркер текущей недели не откатывает', () => {
    const local = weekWith(2);
    const foreign = reportAt(9, 'passed', '2026-W38');
    const withForeign: SpireWeekLocal = { ...local, pending: [...local.pending, foreign] };
    const applied = spireApplyFlushResponse(withForeign, { ok: true, weekKey: WEEK, serverSteps: 0, results: [{ reportId: foreign.reportId, verdict: 'rejected', reason: 'stale_week' }] }, T0);
    expect(applied.local.stepsCleared).toBe(2);
    expect(applied.rollback).toBeNull();
  });

  test('не ok-ответ (Шпиль выключен) маркер не трогает', () => {
    const local = weekWith(2);
    const applied = spireApplyFlushResponse(local, { ok: false, reason: 'spire_not_live' }, T0);
    expect(applied.local.stepsCleared).toBe(2);
    expect(applied.rollback).toBeNull();
  });
});

describe('откат на экране: ступень, пройденная за время запроса, остаётся', () => {
  test('экран на две ступени впереди диска → откат вычитает ровно отвергнутое', () => {
    const screen = weekWith(5); // экран: 5
    const next = spireRollbackSteps(screen, { steps: 1, durationMs: 60_000, reachedAtMs: null });
    expect(next.stepsCleared).toBe(4);
    expect(next.floor).toBe(1);
    expect(next.stepInFloor).toBe(4);
    expect(next.totalMs).toBe(screen.totalMs - 60_000);
    expect(next.reachedAtMs).toBe(screen.reachedAtMs); // прежнего «дошёл в» не знаем — остаётся как было
  });

  test('нулевой откат и откат ниже подтверждённого возвращают ту же неделю', () => {
    const screen = weekWith(3);
    expect(spireRollbackSteps(screen, { steps: 0, durationMs: 0 })).toBe(screen);
    const acked: SpireWeekLocal = { ...screen, serverAck: { steps: 3, reachedAtMs: 1, totalMs: 1, atMs: 1 } };
    expect(spireRollbackSteps(acked, { steps: 2, durationMs: 1 })).toBe(acked);
  });

  test('откат до нуля сбрасывает reachedAtMs', () => {
    const screen = weekWith(1);
    const next = spireRollbackSteps(screen, { steps: 1, durationMs: screen.totalMs });
    expect(next.stepsCleared).toBe(0);
    expect(next.reachedAtMs).toBe(0);
    expect(next.totalMs).toBe(0);
  });
});

describe('досылка с диска: исход несёт откат и пишет [SPIRE-REJECT]', () => {
  test('сервер отверг первую из двух: на диске одна ступень, в исходе rollback, в журнале причина и маркер до/после', async () => {
    const store = memoryStore();
    await spireRecordStep(store, { uid: 'u1', lang: 'en', report: reportAt(1), logger: silent });
    await spireRecordStep(store, { uid: 'u1', lang: 'en', report: reportAt(2), logger: silent });
    const warnings: string[] = [];
    const logger = { info: () => undefined, warn: (ctx: string, msg: string) => { warnings.push(`${ctx} ${msg}`); } };
    const rejectedId = reportAt(1).reportId;
    const out = await spireFlushReports(store, {
      uid: 'u1', lang: 'en', trigger: 'screen_leave', nowMs: () => T0 + 600_000, logger,
      send: async (payload) => ({
        ok: true, weekKey: WEEK, serverSteps: 1,
        results: payload.reports.map((r) => (String(r.reportId) === rejectedId
          ? { reportId: String(r.reportId), verdict: 'rejected' as const, reason: 'pack_mismatch' }
          : { reportId: String(r.reportId), verdict: 'accepted' as const })),
      }),
    });
    expect(out.status).toBe('sent');
    expect(out.rollback?.steps).toBe(1);
    expect(out.local?.stepsCleared).toBe(1);
    expect((await spireLoadWeekLocal(store, 'u1', 'en', silent))?.stepsCleared).toBe(1);
    const joined = warnings.filter((w) => w.startsWith('[SPIRE-REJECT]')).join('\n');
    expect(joined).toContain(rejectedId);
    expect(joined).toContain('pack_mismatch');
    expect(joined).toMatch(/маркер до: этаж=1 ступень=2 пройдено=2.*после: этаж=1 ступень=1 пройдено=1/);
  });
});

// ── Экран: контракт по строкам файлов (откат один раз, плашка, журнал) ──
describe('экран Шпиля: откат по исходу досылки', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('node:path') as typeof import('node:path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  const game = read('app/spire/use_spire_game.ts');
  const screen = read('app/spire/spire_screen_rollback.ts');
  const home = read('components/spire/SpireHomeScreen.tsx');

  it('откат применяется к текущей неделе экрана, один раз на строку, с журналом [SPIRE-REJECT]', () => {
    expect(screen).toMatch(/rolledIdsRef/);
    expect(screen).toMatch(/уже применён раньше — второй раз не откатываем/);
    expect(screen).toMatch(/spireRollbackSteps\(cur, \{ steps: rb\.steps/);
    expect(screen).toMatch(/\[SPIRE-REJECT\][\s\S]*маркер экрана до/);
    // каждый ранний выход пишет причину
    expect((screen.match(/DebugLogger\.(warn|info)\(LOG/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(screen).toMatch(/const LOG = '\[SPIRE-REJECT\]'/);
  });

  it('flush сперва откатывает, потом сверяет снимок с диска (снимок не затирает откат)', () => {
    expect(game).toMatch(/if \(out\) applyRollback\(out\);\n\s*if \(out\?\.local && out\.status === 'sent'\)/);
  });

  it('строка про отказ — только память экрана, гасится на новом старте ступени и смене языка', () => {
    expect((game.match(/setRejectNotice\(false\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(game).toMatch(/dismissWeekResult, rejectNotice,/);
    expect(game).toMatch(/useSpireRejectRollback\(\{ weekRef, setWeek, setOutcome \}\)/);
  });

  it('главный экран показывает плашку существующей строкой на 9 языках', () => {
    expect(home).toMatch(/game\.rejectNotice \? \(/);
    // 13.10 (Ядро, 78726f65c): общую строку «не сохранилась» заменила точная «Ступень не засчиталась» — ключ stepNotCounted на 9 языках
    expect(home).toMatch(/spireGameText\(lang, 'stepNotCounted'\)/);
    expect(read('components/spire/spire_game_strings.ts')).toMatch(/stepNotCounted: \['Ступень не засчиталась/);
    expect(home).toMatch(/testID="spire-reject-notice"/);
  });
});
