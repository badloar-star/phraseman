import { runQualityDepartment } from './quality_department';
import { aggregateQualityRows } from './quality_source_reader';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';

function fetchResult(overrides: Partial<FetchQualitySourceResult> = {}): FetchQualitySourceResult {
  return {
    sourceId: 'error_reports',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

const CRASH_ROWS = Array.from({ length: 20 }, () => ({ category: 'crash', screen: 'lesson', createdAtMs: 5_000 }));

describe('Jarvis quality department — a decision per fetch round', () => {
  test('no decision when nothing crosses the crash-spike threshold and reports are ordinary', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: [{ category: 'typo', screen: 'lesson', createdAtMs: 1 }] }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toEqual([]);
  });

  test('raises a decision when crash reports cross the spike threshold', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    expect(decision.department).toBe('quality');
    expect(decision.status).toBe('awaiting_owner');
    expect(decision.options.length).toBeGreaterThanOrEqual(2);
    expect(decision.options.length).toBeLessThanOrEqual(3);
    expect(decision.finding).toMatch(/crash/i);
    expect(decision.finding).toMatch(/lesson/i);
  });

  test('a failed source does not block decisions built from the sources that worked', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'error' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].confidence).toBeLessThan(1);
  });

  test('every source failing yields an insufficient_evidence decision, not silence', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', state: 'error' }),
        fetchResult({ sourceId: 'user_reports', state: 'error' }),
        fetchResult({ sourceId: 'app_errors', state: 'error' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request always produces a status decision even with no spike', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: [{ category: 'typo', screen: 'home', createdAtMs: 1 }] }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'owner_request',
      question: 'Есть ли рост крашей?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].trigger).toBe('owner_request');
    expect(result.decisions[0].question).toBe('Есть ли рост крашей?');
  });

  test('every decision carries all three evidence rows even when only one spiked', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions[0].evidence).toHaveLength(3);
  });
});

/**
 * зачем этот блок (владелец 2026-08-04): Джарвис называл «репортами» и
 * автоматические краши из app_errors, и жалобы живых людей из user_reports,
 * и советовал «откатить релиз» на технические логи. Владелец: «это
 * автоматические краши/логи, не жалобы» — источники обязаны звучать по-разному.
 */
describe('Jarvis quality department — жалобы людей и автоматические краши это РАЗНЫЕ находки', () => {
  test('error_reports are user-submitted reports, not automatic telemetry', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled', nowMs: 10_000,
    });
    expect(result.decisions[0].finding).toMatch(/жалоб|сообщен/i);
    expect(result.decisions[0].finding).not.toMatch(/приложение записало/i);
  });

  const SPIKE = (category: string, screen: string) =>
    Array.from({ length: 20 }, () => ({ category, screen, createdAtMs: 5_000 }));

  test('скачок в app_errors описывается как технические ошибки, а не как жалобы людей', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', state: 'empty' }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', rows: SPIKE('unknown', 'friends') }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    // Автоматические краши НЕ должны называться жалобами/репортами пользователей.
    expect(decision.finding).toMatch(/ошиб|сбо|краш/i);
    expect(decision.finding).not.toMatch(/жалоб/i);
    expect(decision.question).not.toMatch(/жалоб/i);
  });

  test('скачок в user_reports описывается как жалобы людей', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', state: 'empty' }),
        fetchResult({ sourceId: 'user_reports', rows: SPIKE('bug', 'lesson') }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].finding).toMatch(/жалоб/i);
  });

  test('технический скачок не советует откатывать релиз вслепую', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', state: 'empty' }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', rows: SPIKE('unknown', 'friends') }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    // зачем: «откатить» на автоматических логах — совет вслепую. Сначала надо
    // посмотреть, что это за ошибка, а не откатывать рабочий релиз.
    expect(result.decisions[0].recommendation).not.toMatch(/^Откатить/i);
  });

  test('категория "unknown" не выдаётся за осмысленную категорию жалобы', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', state: 'empty' }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', rows: SPIKE('unknown', 'friends') }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    // «репортов категории "unknown"» — бессмысленная для владельца формулировка.
    expect(result.decisions[0].finding).not.toMatch(/категории "unknown"/i);
  });
});

test('aggregateQualityRows stays the single source of truth for counting', () => {
  expect(aggregateQualityRows(CRASH_ROWS).totalCount).toBe(20);
});

describe('Jarvis quality department — app tier scales the absolute spike threshold', () => {
  // зачем: владелец 2026-08-02 — «Качество» использует АБСОЛЮТНЫЙ порог
  // (число репортов), не долю. На большой базе то же абсолютное число —
  // капля в море, поэтому порог должен РАСТИ с тиром (обратно тому, как
  // масштабируется процентный порог у «Денег»).
  test('20 crash reports trip the base threshold on the seed tier', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'seed',
    });
    expect(result.decisions).toHaveLength(1);
  });

  test('the same 20 crash reports stay silent on the mature tier — same count, bigger base, noise', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
      appTier: 'mature',
    });
    expect(result.decisions).toEqual([]);
  });

  test('no appTier argument defaults to the most cautious tier (seed) — never silently loosens', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({ sourceId: 'error_reports', rows: CRASH_ROWS }),
        fetchResult({ sourceId: 'user_reports', state: 'empty' }),
        fetchResult({ sourceId: 'app_errors', state: 'empty' }),
      ],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
  });
});
describe('Jarvis quality department — release-aware exact vs degraded evidence', () => {
  test('an exact aggregate spike distinguishes event volume from the affected-user bucket', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({
          sourceId: 'app_errors', evidenceMode: 'exact_daily_aggregate',
          rows: [{
            category: 'auth', screen: 'sign_in', build: '319', platform: 'ios', createdAtMs: 10_000,
            eventCount: 20, affectedUserCount: 6,
          }],
        }),
        fetchResult({ sourceId: 'error_reports', state: 'empty', evidenceMode: 'exact_daily_aggregate' }),
        fetchResult({ sourceId: 'user_reports', state: 'empty', evidenceMode: 'exact_daily_aggregate' }),
      ],
      trigger: 'scheduled', nowMs: 10_000,
    });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].finding).toMatch(/20/);
    expect(result.decisions[0].finding).toMatch(/5-9/);
    expect(result.decisions[0].finding).toMatch(/319/);
    expect(result.decisions[0].finding).toMatch(/ios/i);
  });

  test('a degraded raw fallback is visible but cannot assert an exact event count', () => {
    const result = runQualityDepartment({
      fetches: [
        fetchResult({
          sourceId: 'app_errors', state: 'partial', evidenceMode: 'degraded_raw_fallback',
          rows: [{ category: 'auth', screen: 'sign_in', build: '319', platform: 'ios', createdAtMs: 10_000, eventCount: 20, affectedUserCount: null }],
        }),
        fetchResult({ sourceId: 'error_reports', state: 'partial', evidenceMode: 'degraded_raw_fallback' }),
        fetchResult({ sourceId: 'user_reports', state: 'partial', evidenceMode: 'degraded_raw_fallback' }),
      ],
      trigger: 'owner_request', nowMs: 10_000,
    });

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
    expect(result.decisions[0].finding).toMatch(/неполн|деград|точн/i);
    expect(result.decisions[0].finding).not.toMatch(/20/);
  });
});
