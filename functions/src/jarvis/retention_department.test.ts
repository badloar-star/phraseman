import { runRetentionDepartment, RETENTION_MIN_BASE, RETENTION_WEAK_RATIO } from './retention_department';
import type { FetchRetentionSourceResult } from './retention_firestore_fetcher';

const NOW = 1_800_000_000_000;

function source(over: Partial<FetchRetentionSourceResult> = {}): FetchRetentionSourceResult {
  return { state: 'ready', activeWeek: 600, activeMonth: 1000, observedAtMs: NOW, ...over };
}

function run(
  over: Partial<FetchRetentionSourceResult> = {},
  trigger: 'scheduled' | 'owner_request' = 'scheduled',
  appTier: 'seed' | 'growth' | 'scale' | 'mature' = 'mature',
) {
  return runRetentionDepartment({ fetch: source(over), trigger, nowMs: NOW, appTier });
}

describe('Jarvis retention department — do people come back', () => {
  test('stays silent when most monthly users also came back this week', () => {
    expect(run({ activeWeek: 700, activeMonth: 1000 }).decisions).toHaveLength(0);
  });

  test('always answers the owner on request', () => {
    const { decisions } = run({}, 'owner_request');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].department).toBe('retention');
  });

  test('reports weak retention when few of the monthly users return', () => {
    const { decisions } = run({ activeWeek: 100, activeMonth: 1000 });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/возвра|верну/i);
  });

  test('a tiny base is never judged — percentages there are noise, not signal', () => {
    // 1 из 10 это 10%, но на такой базе это один человек, а не тренд.
    const { decisions } = run({ activeWeek: 1, activeMonth: RETENTION_MIN_BASE - 1 });
    expect(decisions).toHaveLength(0);
  });

  test('a young app gets a softer threshold than a mature one on the same numbers', () => {
    // Одинаковые числа: зрелое приложение обязано забеспокоиться, seed — нет.
    const weak = { activeWeek: 380, activeMonth: 1000 };
    expect(run(weak, 'scheduled', 'mature').decisions).toHaveLength(1);
    expect(run(weak, 'scheduled', 'seed').decisions).toHaveLength(0);
  });

  test('the finding states the actual share, not a vague verdict', () => {
    const { decisions } = run({ activeWeek: 250, activeMonth: 1000 });
    expect(decisions[0].finding).toContain('25');
  });

  test('an unreadable base is reported as unreadable, never as an exodus', () => {
    const { decisions } = run({ state: 'error', activeWeek: null, activeMonth: null });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/не удалось|недоступ/i);
    expect(decisions[0].evidence.every((e) => !e.trustworthy)).toBe(true);
  });

  test('an empty base does not pretend that everyone left', () => {
    const { decisions } = run({ state: 'empty', activeWeek: 0, activeMonth: 0 }, 'owner_request');
    expect(decisions[0].finding).not.toMatch(/0\s*%/);
  });

  test('never leaks a uid — retention is shares, not people', () => {
    const { decisions } = run({ activeWeek: 100, activeMonth: 1000 }, 'owner_request');
    expect(JSON.stringify(decisions)).not.toMatch(/uid/i);
  });

  test('only observes — it must never propose sending push automatically', () => {
    const { decisions } = run({ activeWeek: 100, activeMonth: 1000 }, 'owner_request');
    expect(decisions[0].mode).toBe('observe');
    expect(JSON.stringify(decisions[0].options)).not.toMatch(/автоматическ|разослать всем/i);
  });

  test('the weak-retention mark is a genuinely low share', () => {
    expect(RETENTION_WEAK_RATIO).toBeLessThanOrEqual(0.5);
  });
});
