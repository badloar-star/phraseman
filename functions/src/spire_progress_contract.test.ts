import { SPIRE_CONFIG_DEFAULTS } from './spire_config_contract';
import {
  spireEvaluateBatch,
  spireParseWeekProgress,
  spireSerializeWeekProgress,
  spireWeekStartMsFromDate,
  type SpireEvaluateInput,
} from './spire_progress_contract';

// PM-275: проверка правдоподобия пачки отчётов Шпиля.
const NOW = Date.UTC(2026, 8, 24, 12, 0, 0); // четверг, неделя 2026-W39
const WEEK = '2026-W39';
const WEEK_START = spireWeekStartMsFromDate(new Date(NOW));
const HASH = 'pack_hash_abc123';
const MIN = SPIRE_CONFIG_DEFAULTS.integrity.minStepMs;

function report(i: number, over: Record<string, unknown> = {}) {
  return {
    reportId: `r${i}`,
    weekKey: WEEK,
    tier: 1,
    outcome: 'passed',
    durationMs: MIN + 5_000,
    completedAtMs: NOW - 3 * 60 * 60_000 + i * 2 * 60_000,
    packHash: HASH,
    ...over,
  };
}

function input(reports: unknown[], over: Partial<SpireEvaluateInput> = {}): SpireEvaluateInput {
  return {
    lang: 'en',
    existing: null,
    reports,
    serverNowMs: NOW,
    serverWeekKey: WEEK,
    weekStartMs: WEEK_START,
    integrity: SPIRE_CONFIG_DEFAULTS.integrity,
    expectedPackHashByTier: { 1: HASH },
    ...over,
  };
}

describe('spireEvaluateBatch', () => {
  test('честная пачка засчитывается одной агрегированной записью', () => {
    const out = spireEvaluateBatch(input([report(1), report(2), report(3)]));
    expect(out.acceptedPassed).toBe(3);
    expect(out.changed).toBe(true);
    expect(out.record.steps).toBe(3);
    expect(out.record.totalMs).toBe(3 * (MIN + 5_000));
    expect(out.record.reachedAtMs).toBe(report(3).completedAtMs);
  });

  test('повтор той же пачки — duplicate, без записи', () => {
    const first = spireEvaluateBatch(input([report(1), report(2)]));
    const again = spireEvaluateBatch(input([report(1), report(2)], { existing: first.record }));
    expect(again.changed).toBe(false);
    expect(again.results.every((r) => r.verdict === 'duplicate')).toBe(true);
    expect(again.record.steps).toBe(2);
  });

  test('быстрее minStepMs — too_fast; провал за то же время — принят без очков', () => {
    const out = spireEvaluateBatch(input([
      report(1, { durationMs: MIN - 1 }),
      report(2, { durationMs: 10_000, outcome: 'failed' }),
    ]));
    expect(out.results[0]).toEqual({ reportId: 'r1', verdict: 'rejected', reason: 'too_fast' });
    expect(out.results[1]).toEqual({ reportId: 'r2', verdict: 'accepted', outcome: 'failed' });
    expect(out.record.steps).toBe(0);
    expect(out.record.failedAttempts).toBe(1);
  });

  test('больше maxStepsPerHour за час — rate_limited', () => {
    const integrity = { minStepMs: 1_000, maxStepsPerHour: 3 };
    const rows = [1, 2, 3, 4].map((i) => report(i, { durationMs: 60_000 }));
    const out = spireEvaluateBatch(input(rows, { integrity }));
    expect(out.acceptedPassed).toBe(3);
    expect(out.results[3]).toEqual({ reportId: 'r4', verdict: 'rejected', reason: 'rate_limited' });
  });

  test('чужой отпечаток пакета — pack_mismatch; пакета нет — pack_unknown', () => {
    expect(spireEvaluateBatch(input([report(1, { packHash: 'other_hash_999' })])).results[0])
      .toEqual({ reportId: 'r1', verdict: 'rejected', reason: 'pack_mismatch' });
    expect(spireEvaluateBatch(input([report(1)], { expectedPackHashByTier: { 1: null } })).results[0])
      .toEqual({ reportId: 'r1', verdict: 'rejected', reason: 'pack_unknown' });
  });

  test('шпиль отчёта не совпал с шпилем игрока на сервере — tier_mismatch', () => {
    const out = spireEvaluateBatch(input([report(1, { tier: 0 }), report(2)], {
      expectedTier: 1,
      expectedPackHashByTier: { 0: HASH, 1: HASH },
    }));
    expect(out.results[0]).toEqual({ reportId: 'r1', verdict: 'rejected', reason: 'tier_mismatch' });
    expect(out.acceptedPassed).toBe(1);
  });

  test('прошлая неделя, будущее время и пересечение ступеней отвергаются', () => {
    const out = spireEvaluateBatch(input([
      report(1, { weekKey: '2026-W38' }),
      report(2, { completedAtMs: NOW + 10 * 60_000 }),
      report(3),
      report(4, { completedAtMs: report(3).completedAtMs + 10_000 }),
    ]));
    const byId = Object.fromEntries(out.results.map((r) => [r.reportId, r]));
    expect(byId.r1).toMatchObject({ verdict: 'rejected', reason: 'stale_week' });
    expect(byId.r2).toMatchObject({ verdict: 'rejected', reason: 'clock_ahead' });
    expect(byId.r3).toMatchObject({ verdict: 'accepted' });
    expect(byId.r4).toMatchObject({ verdict: 'rejected', reason: 'overlap' });
  });

  test('мусорная строка — malformed, остальные не страдают', () => {
    const out = spireEvaluateBatch(input([{ reportId: 'bad', outcome: 'won' }, report(1)]));
    expect(out.results[0]).toEqual({ reportId: 'bad', verdict: 'rejected', reason: 'malformed' });
    expect(out.acceptedPassed).toBe(1);
  });

  test('новая неделя обнуляет прогресс языка', () => {
    const old = spireEvaluateBatch(input([report(1)])).record;
    const out = spireEvaluateBatch(input([report(5)], { existing: { ...old, weekKey: '2026-W38' } }));
    expect(out.record.weekKey).toBe(WEEK);
    expect(out.record.steps).toBe(1);
  });
});

describe('spire_week_v1 сериализация', () => {
  test('туда-обратно без потерь, битое — пусто', () => {
    const record = spireEvaluateBatch(input([report(1)])).record;
    const raw = spireSerializeWeekProgress({ en: record });
    expect(spireParseWeekProgress(raw).en).toEqual(record);
    expect(spireParseWeekProgress('{oops')).toEqual({});
  });
});
