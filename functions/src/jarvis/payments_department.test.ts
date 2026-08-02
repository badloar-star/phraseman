import { runPaymentsDepartment, DENIAL_SPIKE_THRESHOLD } from './payments_department';
import type { FetchPaymentsSourceResult } from './payments_firestore_fetcher';

function fetchResult(overrides: Partial<FetchPaymentsSourceResult> = {}): FetchPaymentsSourceResult {
  return {
    sourceId: 'telegram_premium_dead_letter',
    state: 'ready',
    truncated: false,
    droppedCount: 0,
    rows: [],
    observedAtMs: 10_000,
    ...overrides,
  };
}

const PAID_UNFULFILLED = { reason: 'handler_failed', paidButUnfulfilled: true, resolved: false };
const HARMLESS = { reason: 'parse_failed', paidButUnfulfilled: false, resolved: false };

describe('Jarvis payments department — a single lost payment is already urgent', () => {
  test('ONE paid-but-unfulfilled record raises a decision regardless of scale', () => {
    // зачем без порога: это не статистика, а конкретный человек, который
    // отдал деньги и ничего не получил. Один случай — уже проблема.
    const result = runPaymentsDepartment({ fetches: [fetchResult({ rows: [PAID_UNFULFILLED] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].department).toBe('payments');
    expect(result.decisions[0].finding).toMatch(/заплат/i);
  });

  test('the tier never softens a lost payment — even a mature app must not ignore one', () => {
    const result = runPaymentsDepartment({
      fetches: [fetchResult({ rows: [PAID_UNFULFILLED] })], trigger: 'scheduled', nowMs: 10_000, appTier: 'mature',
    });
    expect(result.decisions).toHaveLength(1);
  });

  test('failures without a payment do not raise the money alarm on their own', () => {
    const result = runPaymentsDepartment({ fetches: [fetchResult({ rows: [HARMLESS] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toEqual([]);
  });

  test('an already-resolved case does not keep alarming', () => {
    const resolved = { reason: 'handler_failed', paidButUnfulfilled: false, resolved: true };
    const result = runPaymentsDepartment({ fetches: [fetchResult({ rows: [resolved] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions).toEqual([]);
  });

  test('a burst of denials raises a decision even with no lost payment — integration may be broken', () => {
    const denials = Array.from({ length: DENIAL_SPIKE_THRESHOLD }, () => ({ reason: 'user_not_found', paidButUnfulfilled: false, resolved: false }));
    const result = runPaymentsDepartment({
      fetches: [fetchResult({ sourceId: 'revenuecat_premium_denials', rows: denials })],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].finding).toMatch(/отказ/i);
  });

  test('the lost payment wins over the denial burst — money first', () => {
    const denials = Array.from({ length: DENIAL_SPIKE_THRESHOLD }, () => ({ reason: 'user_not_found', paidButUnfulfilled: false, resolved: false }));
    const result = runPaymentsDepartment({
      fetches: [fetchResult({ rows: [PAID_UNFULFILLED] }), fetchResult({ sourceId: 'revenuecat_premium_denials', rows: denials })],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions[0].finding).toMatch(/заплат/i);
  });

  test('every source failing yields insufficient_evidence, not silence', () => {
    const result = runPaymentsDepartment({
      fetches: [fetchResult({ state: 'error' }), fetchResult({ sourceId: 'revenuecat_premium_denials', state: 'error' })],
      trigger: 'scheduled',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].status).toBe('insufficient_evidence');
  });

  test('owner_request always answers even when payments are healthy', () => {
    const result = runPaymentsDepartment({
      fetches: [fetchResult({ state: 'empty' })],
      trigger: 'owner_request',
      question: 'Есть ли проблемы с оплатами?',
      nowMs: 10_000,
    });
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].question).toBe('Есть ли проблемы с оплатами?');
  });

  test('the recommendation names a concrete first action, not a vague suggestion', () => {
    const result = runPaymentsDepartment({ fetches: [fetchResult({ rows: [PAID_UNFULFILLED] })], trigger: 'scheduled', nowMs: 10_000 });
    expect(result.decisions[0].recommendation.length).toBeGreaterThan(10);
    expect(result.decisions[0].options.length).toBeGreaterThanOrEqual(2);
  });
});
