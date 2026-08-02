import { runContentDepartment, LOW_SCORE_THRESHOLD } from './content_department';
import type { FetchContentSourceResult } from './content_firestore_fetcher';

function fetchResult(overrides: Partial<FetchContentSourceResult> = {}): FetchContentSourceResult {
  return {
    sourceId: 'lesson_stats',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

const HEALTHY = { lessonId: 1, target: 'en' as const, averageScore: 4.5, sampleCount: 100 };
const WEAK = { lessonId: 7, target: 'en' as const, averageScore: 1.8, sampleCount: 100 };
const WEAK_BUT_TINY_SAMPLE = { lessonId: 9, target: 'en' as const, averageScore: 0.5, sampleCount: 3 };

describe('Jarvis content department — flags weak lessons only when the sample supports it', () => {
  test('no decision when every lesson scores well', () => {
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [HEALTHY] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toEqual([]);
  });

  test('raises a decision for a lesson below the score threshold', () => {
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [HEALTHY, WEAK] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toHaveLength(1);
    const [decision] = result.decisions;
    expect(decision.department).toBe('content');
    expect(decision.status).toBe('awaiting_owner');
    expect(decision.finding).toMatch(/7/);
    expect(decision.options.length).toBeGreaterThanOrEqual(2);
    expect(decision.options.length).toBeLessThanOrEqual(3);
  });

  test('a low score on a tiny sample stays silent — that is noise, not a content problem', () => {
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [WEAK_BUT_TINY_SAMPLE] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toEqual([]);
  });

  test('picks the worst lesson when several are weak', () => {
    const worse = { lessonId: 12, target: 'en' as const, averageScore: 0.9, sampleCount: 100 };
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [WEAK, worse] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions[0].finding).toMatch(/12/);
  });

  test('a failed source yields insufficient_evidence, not silence', () => {
    const result = runContentDepartment({ fetches: [fetchResult({ state: 'error' })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request always answers even with healthy content', () => {
    const result = runContentDepartment({
      fetches: [fetchResult({ rows: [HEALTHY] })],
      trigger: 'owner_request',
      question: 'Какие уроки самые сложные?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].question).toBe('Какие уроки самые сложные?');
  });

  test('the finding names the language target so en and fr lessons are not confused', () => {
    const frWeak = { lessonId: 4, target: 'fr' as const, averageScore: 1.2, sampleCount: 100 };
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [frWeak] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions[0].finding).toMatch(/fr/i);
  });

  test('the score threshold sits inside the valid 0..5 range', () => {
    expect(LOW_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(LOW_SCORE_THRESHOLD).toBeLessThan(5);
  });

  test('evidence is carried on every decision', () => {
    const result = runContentDepartment({ fetches: [fetchResult({ rows: [WEAK] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions[0].evidence).toHaveLength(1);
  });
});
