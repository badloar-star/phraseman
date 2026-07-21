import { HttpsError } from 'firebase-functions/v2/https';

interface AggregateHealthProjectionModule {
  projectAgentAggregateHealth(raw: Record<string, unknown>): readonly Readonly<{
    source: 'analytics' | 'reports' | 'audit';
    state: 'ready' | 'empty' | 'error' | 'truncated';
    count: number;
    truncated: boolean;
    observedAtMs: number;
  }>[];
}

function projectionModule(): AggregateHealthProjectionModule {
  return require('./projection') as AggregateHealthProjectionModule;
}

function completeHealth(): Record<string, unknown> {
  return {
    receiptId: 'observation_private-id',
    caseId: 'case-private',
    recommendationId: 'recommendation-private',
    summary: 'private prose owner@example.com',
    evidence: [{ sourceRef: `reports:sha256:${'a'.repeat(64)}` }],
    actorUid: 'private-owner-uid',
    sourceHealth: [
      {
        source: 'reports',
        state: 'truncated',
        count: 7,
        truncated: true,
        observedAtMs: 2_000,
        sourceRef: `reports:sha256:${'b'.repeat(64)}`,
        email: 'private@example.com',
      },
      { source: 'audit', state: 'empty', count: 0, truncated: false, observedAtMs: 3_000 },
      { source: 'analytics', state: 'ready', count: 11, truncated: false, observedAtMs: 1_000 },
    ],
  };
}

describe('Agent Office aggregate-health projection', () => {
  test('exports an isolated aggregate-health callable', () => {
    expect(typeof (require('./callables') as Record<string, unknown>).agentOfficeGetAggregateHealth).toBe('function');
    expect(typeof (require('./index') as Record<string, unknown>).agentOfficeGetAggregateHealth).toBe('function');
  });

  test('returns only canonical allowlisted source-health tuples', () => {
    const items = projectionModule().projectAgentAggregateHealth(completeHealth());

    expect(items).toEqual([
      { source: 'analytics', state: 'ready', count: 11, truncated: false, observedAtMs: 1_000 },
      { source: 'reports', state: 'truncated', count: 7, truncated: true, observedAtMs: 2_000 },
      { source: 'audit', state: 'empty', count: 0, truncated: false, observedAtMs: 3_000 },
    ]);
    expect(items.map((item) => Object.keys(item))).toEqual([
      ['source', 'state', 'count', 'truncated', 'observedAtMs'],
      ['source', 'state', 'count', 'truncated', 'observedAtMs'],
      ['source', 'state', 'count', 'truncated', 'observedAtMs'],
    ]);
    expect(JSON.stringify(items)).not.toMatch(
      /caseId|recommendationId|sourceRef|uid|email|summary|prose|evidence|private/i,
    );
  });

  test.each([
    ['missing count', (raw: Record<string, unknown>) => {
      delete ((raw.sourceHealth as Record<string, unknown>[])[0]).count;
    }],
    ['negative count', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).count = -1;
    }],
    ['unsafe count', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).count = Number.MAX_SAFE_INTEGER + 1;
    }],
    ['missing truncated receipt', (raw: Record<string, unknown>) => {
      delete ((raw.sourceHealth as Record<string, unknown>[])[0]).truncated;
    }],
    ['non-positive timestamp', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).observedAtMs = 0;
    }],
    ['partial state', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).state = 'partial';
    }],
    ['unknown source', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).source = 'user_reports';
    }],
    ['duplicate source', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).source = 'analytics';
    }],
    ['incoherent truncation', (raw: Record<string, unknown>) => {
      ((raw.sourceHealth as Record<string, unknown>[])[0]).truncated = false;
    }],
  ])('fails closed for %s', (_label, mutate) => {
    const raw = completeHealth();
    mutate(raw);

    expect(() => projectionModule().projectAgentAggregateHealth(raw)).toThrow(HttpsError);
  });
});
