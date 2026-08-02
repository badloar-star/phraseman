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
