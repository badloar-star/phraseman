import { runSupportDepartment, SUPPORT_STALE_MS, SUPPORT_QUEUE_THRESHOLD } from './support_department';
import type { FetchSupportSourceResult } from './support_firestore_fetcher';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1_000;

function source(over: Partial<FetchSupportSourceResult> = {}): FetchSupportSourceResult {
  return {
    state: 'ready', waitingCount: 0, oldestWaitingMs: null,
    answeredCount: 5, medianReplyMs: 2 * HOUR, observedAtMs: NOW, ...over,
  };
}

function run(over: Partial<FetchSupportSourceResult> = {}, trigger: 'scheduled' | 'owner_request' = 'scheduled') {
  return runSupportDepartment({ fetch: source(over), trigger, nowMs: NOW });
}

describe('Jarvis support department — a person waiting is not a statistic', () => {
  test('stays silent when the inbox is answered promptly', () => {
    expect(run().decisions).toHaveLength(0);
  });

  test('always answers the owner on request', () => {
    const { decisions } = run({}, 'owner_request');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].department).toBe('support');
  });

  test('one letter waiting past the stale mark breaks the silence', () => {
    const { decisions } = run({ waitingCount: 1, oldestWaitingMs: SUPPORT_STALE_MS });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/ждёт|ожида/i);
  });

  test('a fresh letter still within the stale mark does not raise an alarm', () => {
    expect(run({ waitingCount: 1, oldestWaitingMs: SUPPORT_STALE_MS - HOUR }).decisions).toHaveLength(0);
  });

  test('a legacy-only backlog is not repeated by the scheduled digest', () => {
    const result = run({
      waitingCount: 126,
      oldestWaitingMs: 110 * 24 * HOUR,
      actionableWaitingCount: 0,
      oldestActionableWaitingMs: null,
      legacyWaitingCount: 126,
    });
    expect(result.decisions).toHaveLength(0);
  });

  test('the owner can still inspect the legacy backlog on request', () => {
    const result = run({
      waitingCount: 126,
      oldestWaitingMs: 110 * 24 * HOUR,
      actionableWaitingCount: 0,
      oldestActionableWaitingMs: null,
      legacyWaitingCount: 126,
    }, 'owner_request');
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].finding).toMatch(/126.*(?:legacy|неразмеч)/i);
  });

  test('a pile of fresh letters is reported even when none is old yet', () => {
    const { decisions } = run({ waitingCount: SUPPORT_QUEUE_THRESHOLD, oldestWaitingMs: HOUR });
    expect(decisions).toHaveLength(1);
  });

  test('the oldest waiting letter outranks the queue size in the finding', () => {
    const { decisions } = run({ waitingCount: 40, oldestWaitingMs: 90 * HOUR });
    expect(decisions[0].finding).toMatch(/дн|сут/i);
  });

  test('reports waiting time in days when it has run into days', () => {
    const { decisions } = run({ waitingCount: 2, oldestWaitingMs: 72 * HOUR });
    expect(decisions[0].finding).toContain('3');
  });

  test('an unreadable inbox is reported as unreadable, never as calm', () => {
    const { decisions } = run({
      state: 'error', waitingCount: null, oldestWaitingMs: null,
      answeredCount: null, medianReplyMs: null,
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].finding).toMatch(/не удалось|недоступ/i);
    expect(decisions[0].evidence.every((e) => !e.trustworthy)).toBe(true);
  });

  test('never leaks an email address or letter text', () => {
    const { decisions } = run({ waitingCount: 9, oldestWaitingMs: 100 * HOUR }, 'owner_request');
    const serialized = JSON.stringify(decisions);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/bodyText|fromEmail/i);
  });

  test('only observes automation — the department itself never sends mail', () => {
    const { decisions } = run({ waitingCount: 12, oldestWaitingMs: 100 * HOUR }, 'owner_request');
    expect(decisions[0].mode).toBe('observe');
    expect(JSON.stringify(decisions[0].options)).not.toMatch(/сам отправ|отправить письмо/i);
  });
});
