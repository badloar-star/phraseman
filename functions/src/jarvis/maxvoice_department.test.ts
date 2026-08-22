import { runMaxvoiceDepartment } from './maxvoice_department';
import type { FetchMaxvoiceSourceResult } from './maxvoice_firestore_fetcher';

const NOW = Date.UTC(2026, 7, 21, 12);

function source(over: Partial<FetchMaxvoiceSourceResult> = {}): FetchMaxvoiceSourceResult {
  return {
    state: 'ready', sampledDays: 7, callsStarted: 100, callsConnected: 96,
    callsCompleted: 90, reviewsReady: 88, reconnectAttempts: 20,
    reconnectRecovered: 16, firstAudioGte8s: 5, observedAtMs: NOW,
    ...over,
  };
}

function run(over: Partial<FetchMaxvoiceSourceResult> = {}, trigger: 'scheduled' | 'owner_request' = 'scheduled') {
  return runMaxvoiceDepartment({ fetch: source(over), trigger, nowMs: NOW });
}

describe('Jarvis MAX reliability department — deterministic release signals', () => {
  test('connection success below 90% with at least 20 starts is high', () => {
    const decisions = run({ callsStarted: 20, callsConnected: 17 }).decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ department: 'maxvoice', severityHint: 'P1', actionability: 'evidence_only' });
    expect(decisions[0].finding).toMatch(/85%|соедин/i);
  });

  test('ready reviews below 95% with at least 20 completed calls is high', () => {
    const decisions = run({ callsCompleted: 20, reviewsReady: 18 }).decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ severityHint: 'P1', actionability: 'evidence_only' });
    expect(decisions[0].finding).toMatch(/90%|разбор/i);
  });

  test('reconnect recovery below 70% with at least 10 attempts is medium', () => {
    const decisions = run({ reconnectAttempts: 10, reconnectRecovered: 6 }).decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ severityHint: 'P2', actionability: 'evidence_only' });
    expect(decisions[0].finding).toMatch(/60%|восстанов/i);
  });

  test('slow first audio above 10% with at least 20 connections is medium', () => {
    const decisions = run({ callsStarted: 20, callsConnected: 20, firstAudioGte8s: 3 }).decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ severityHint: 'P2', actionability: 'evidence_only' });
    expect(decisions[0].finding).toMatch(/15%|8 секунд/i);
  });

  test('insufficient samples produce evidence-only uncertainty, never a healthy verdict', () => {
    const decisions = run({ callsStarted: 3, callsConnected: 3, callsCompleted: 2, reviewsReady: 2, reconnectAttempts: 1, reconnectRecovered: 1, firstAudioGte8s: 0 }, 'owner_request').decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ actionability: 'evidence_only', severityHint: 'P3' });
    expect(decisions[0].finding).toMatch(/недостаточно|мало данных/i);
    expect(decisions[0].finding).not.toMatch(/здоров|всё хорошо/i);
  });

  test('unreadable aggregates are insufficient evidence and never a reliability collapse', () => {
    const decisions = run({ state: 'error', sampledDays: 0, callsStarted: null, callsConnected: null, callsCompleted: null, reviewsReady: null, reconnectAttempts: null, reconnectRecovered: null, firstAudioGte8s: null }, 'owner_request').decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0].status).toBe('insufficient_evidence');
    expect(decisions[0].finding).toMatch(/не удалось|недоступ/i);
  });
});
