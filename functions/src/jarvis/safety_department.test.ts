import { runSafetyDepartment, SAFETY_SPIKE_THRESHOLD, SAFETY_BACKLOG_THRESHOLD } from './safety_department';
import type { FetchSafetySourceResult } from './safety_firestore_fetcher';

const NOW = 1_800_000_000_000;

function source(over: Partial<FetchSafetySourceResult> = {}): FetchSafetySourceResult {
  return { state: 'ready', openFlags: 0, openMinorFlags: 0, recentFlags: 0, observedAtMs: NOW, ...over };
}

function run(over: Partial<FetchSafetySourceResult> = {}, trigger: 'scheduled' | 'owner_request' = 'scheduled') {
  return runSafetyDepartment({ fetch: source(over), trigger, nowMs: NOW });
}

describe('Jarvis safety department — children first, silence only when genuinely clean', () => {
  test('stays silent on a scheduled run when nothing is wrong', () => {
    expect(run().decisions).toHaveLength(0);
  });

  test('always answers the owner, even when everything is clean', () => {
    const { decisions } = run({}, 'owner_request');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].department).toBe('safety');
  });

  test('a single unhandled flag on a child account breaks the silence', () => {
    // Один ребёнок — это не «статистическая погрешность», это юридический риск.
    const { decisions } = run({ openFlags: 1, openMinorFlags: 1 });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toContain('дет');
  });

  test('children outrank a large adult backlog in the finding', () => {
    const { decisions } = run({ openFlags: 500, openMinorFlags: 2, recentFlags: 900 });
    expect(decisions[0].finding).toContain('дет');
  });

  test('a big adult backlog alone is still reported', () => {
    const { decisions } = run({ openFlags: SAFETY_BACKLOG_THRESHOLD, openMinorFlags: 0 });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toContain(String(SAFETY_BACKLOG_THRESHOLD));
  });

  test('a backlog below the threshold does not wake the owner at night', () => {
    expect(run({ openFlags: SAFETY_BACKLOG_THRESHOLD - 1 }).decisions).toHaveLength(0);
  });

  test('a spike of new flags in one day is reported even with an empty backlog', () => {
    const { decisions } = run({ openFlags: 0, recentFlags: SAFETY_SPIKE_THRESHOLD });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toContain('сутк');
  });

  test('an unreadable source is reported as unreadable, never as safe', () => {
    const { decisions } = run({ state: 'error', openFlags: null, openMinorFlags: null, recentFlags: null });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/не удалось|недоступ/i);
    expect(decisions[0].evidence.every((item) => !item.trustworthy)).toBe(true);
  });

  test('never leaks a UID or raw message text into the decision', () => {
    const { decisions } = run({ openFlags: 7, openMinorFlags: 3, recentFlags: 20 }, 'owner_request');
    const serialized = JSON.stringify(decisions);
    expect(serialized).not.toMatch(/uid/i);
    expect(serialized).not.toMatch(/@/);
  });

  test('only ever observes — it must not propose automated bans', () => {
    const { decisions } = run({ openFlags: 9, openMinorFlags: 4 }, 'owner_request');
    expect(decisions[0].mode).toBe('observe');
    expect(JSON.stringify(decisions[0].options)).not.toMatch(/автоматическ/i);
  });
});
