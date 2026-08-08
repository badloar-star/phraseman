import {
  buildDecision,
  decisionConfidence,
  normalizeEvidence,
  type EvidenceInput,
} from './decision';

const READY: EvidenceInput = Object.freeze({
  sourceId: 'error_reports',
  state: 'ready',
  count: 12,
  truncated: false,
  droppedCount: 0,
  observedAtMs: 1_000,
});

describe('Jarvis decision core — evidence never becomes a false zero', () => {
  test.each([
    ['ready', { state: 'ready', count: 4, truncated: false, droppedCount: 0 }, 'ready', 4],
    ['empty', { state: 'empty', count: 0, truncated: false, droppedCount: 0 }, 'empty', 0],
    ['partial', { state: 'partial', count: 4, truncated: false, droppedCount: 0 }, 'partial', null],
    ['error', { state: 'error', count: 0, truncated: false, droppedCount: 0 }, 'error', null],
    ['stale', { state: 'stale', count: 7, truncated: false, droppedCount: 0 }, 'stale', null],
    ['truncated', { state: 'ready', count: 100, truncated: true, droppedCount: 5 }, 'truncated', null],
  ])('keeps %s state and refuses to assert a count it cannot prove', (_name, input, state, count) => {
    const evidence = normalizeEvidence({ sourceId: 'error_reports', observedAtMs: 1_000, ...input } as EvidenceInput);
    expect(evidence.state).toBe(state);
    expect(evidence.count).toBe(count);
  });

  test.each([
    [{ state: 'ready', count: -1, truncated: false, droppedCount: 0 }, 'negative count'],
    [{ state: 'empty', count: 3, truncated: false, droppedCount: 0 }, 'non-zero empty count'],
    [{ state: 'ready', count: '4', truncated: false, droppedCount: 0 }, 'non-numeric count'],
    [{ state: 'ready', count: 4, truncated: 'no', droppedCount: 0 }, 'invalid truncated flag'],
    [{ state: 'ready', count: 4, truncated: false, droppedCount: -1 }, 'negative droppedCount'],
    [{ state: 'nonsense', count: 4, truncated: false, droppedCount: 0 }, 'unknown state'],
  ])('fails closed for %s', (input, _name) => {
    const evidence = normalizeEvidence({ sourceId: 'error_reports', observedAtMs: 1_000, ...input } as EvidenceInput);
    expect(evidence.state).toBe('error');
    expect(evidence.count).toBeNull();
  });

  test('dropped evidence is never silently ignored', () => {
    const evidence = normalizeEvidence({ ...READY, count: 100, truncated: true, droppedCount: 40 });
    expect(evidence.truncated).toBe(true);
    expect(evidence.droppedCount).toBe(40);
    expect(evidence.count).toBeNull();
  });
});

describe('Jarvis decision core — confidence reflects evidence quality', () => {
  test('full ready evidence yields high confidence', () => {
    expect(decisionConfidence([normalizeEvidence(READY)])).toBeGreaterThanOrEqual(0.9);
  });

  test('confidence drops when any source is incomplete', () => {
    const full = decisionConfidence([normalizeEvidence(READY)]);
    const degraded = decisionConfidence([
      normalizeEvidence(READY),
      normalizeEvidence({ ...READY, sourceId: 'user_reports', state: 'partial' }),
    ]);
    expect(degraded).toBeLessThan(full);
  });

  test('no evidence means zero confidence, not a confident zero', () => {
    expect(decisionConfidence([])).toBe(0);
  });
});

describe('Jarvis decision core — a finding may not outrun its evidence', () => {
  const base = Object.freeze({
    department: 'quality' as const,
    mode: 'observe' as const,
    trigger: 'scheduled' as const,
    question: 'Растут ли краши на этой неделе?',
    finding: 'Краши выросли на экране урока',
    hypothesis: 'Регрессия в аудиоплеере',
    options: Object.freeze([
      Object.freeze({ title: 'Откатить аудиоплеер', cost: 1, risk: 'low' as const }),
      Object.freeze({ title: 'Точечный фикс', cost: 5, risk: 'medium' as const }),
    ]),
    recommendation: 'Откатить аудиоплеер',
    risk: 'Откат вернёт старый баг со звуком',
    cost: 1,
    successMetric: 'Краши на экране урока падают ниже прежнего уровня',
    rollback: 'Вернуть текущую сборку',
  });

  test('builds an owner-ready decision when evidence supports it', () => {
    const decision = buildDecision({ ...base, evidence: [READY], nowMs: 2_000 });
    expect(decision.status).toBe('awaiting_owner');
    expect(decision.department).toBe('quality');
    expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    expect(decision.revision).toBe(1);
    expect(decision.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('marks insufficient_evidence when every source failed', () => {
    const decision = buildDecision({
      ...base,
      evidence: [{ ...READY, state: 'error', count: 0 }],
      nowMs: 2_000,
    });
    expect(decision.status).toBe('insufficient_evidence');
  });

  test('refuses a decision with no evidence at all', () => {
    const decision = buildDecision({ ...base, evidence: [], nowMs: 2_000 });
    expect(decision.status).toBe('insufficient_evidence');
    expect(decision.confidence).toBe(0);
  });

  test.each([1, 4])('rejects an option count of %i — the plan requires 2..3', (count) => {
    const options = Array.from({ length: count }, (_value, index) => ({
      title: `Вариант ${index + 1}`,
      cost: 1,
      risk: 'low' as const,
    }));
    expect(() => buildDecision({ ...base, options, evidence: [READY], nowMs: 2_000 })).toThrow();
  });

  test('identical input produces an identical content hash', () => {
    const a = buildDecision({ ...base, evidence: [READY], nowMs: 2_000 });
    const b = buildDecision({ ...base, evidence: [READY], nowMs: 2_000 });
    expect(a.contentHash).toBe(b.contentHash);
  });

  test('changed recommendation changes the hash so stale approvals die', () => {
    const a = buildDecision({ ...base, evidence: [READY], nowMs: 2_000 });
    const b = buildDecision({ ...base, recommendation: 'Точечный фикс', evidence: [READY], nowMs: 2_000 });
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  test('carries explicit typed actionability and severity without inferring them from status text', () => {
    const decision = buildDecision({
      ...base,
      evidence: [{ ...READY, state: 'error', count: 0 }],
      actionability: 'confirmed_action',
      severityHint: 'P0',
      nowMs: 2_000,
    } as Parameters<typeof buildDecision>[0]);

    expect(decision).toMatchObject({
      status: 'insufficient_evidence',
      actionability: 'confirmed_action',
      severityHint: 'P0',
    });
  });

  test('owner constraints are carried on the decision', () => {
    const decision = buildDecision({
      ...base,
      evidence: [READY],
      constraints: ['не трогай paywall'],
      nowMs: 2_000,
    });
    expect(decision.constraints).toEqual(['не трогай paywall']);
  });
});
