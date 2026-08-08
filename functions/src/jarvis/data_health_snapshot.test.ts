import { buildDataHealthSnapshot } from './data_health_snapshot';
import type { Evidence } from './decision';

const evidence = (overrides: Partial<Evidence> = {}): Evidence => ({
  sourceId: 'aggregate-only-source', state: 'ready', count: 3, truncated: false,
  droppedCount: 0, observedAtMs: 1_000, digest: '', trustworthy: true, ...overrides,
});

describe('Jarvis data health snapshot', () => {
  test('reports only aggregate degraded-source health without retaining source identifiers', () => {
    const snapshot = buildDataHealthSnapshot({
      evidence: [
        evidence({ sourceId: 'user-123@example.com', state: 'stale', observedAtMs: 2_000, trustworthy: false, count: null }),
        evidence({ sourceId: 'raw-user-document-path', state: 'partial', observedAtMs: 3_000, trustworthy: false, count: null }),
        evidence({ sourceId: 'secret-token', state: 'truncated', observedAtMs: 4_000, trustworthy: false, count: null, truncated: true, droppedCount: 2 }),
        evidence({ sourceId: 'another-private-id', state: 'error', observedAtMs: 5_000, trustworthy: false, count: null }),
      ],
      nowMs: 6_000,
      trigger: 'scheduled',
    });

    expect(snapshot).toMatchObject({
      sourceCount: 4,
      latestObservedAtMs: 5_000,
      stateCounts: { stale: 1, partial: 1, truncated: 1, error: 1 },
    });
    expect(JSON.stringify(snapshot)).not.toContain('user-123@example.com');
    expect(JSON.stringify(snapshot)).not.toContain('raw-user-document-path');
    expect(snapshot.decision).toMatchObject({
      department: 'data_health',
      status: 'insufficient_evidence',
      actionability: 'evidence_only',
    });
  });

  test('stays quiet when all observed sources are ready or empty', () => {
    const snapshot = buildDataHealthSnapshot({
      evidence: [evidence(), evidence({ state: 'empty', count: 0, observedAtMs: 2_000 })],
      nowMs: 3_000,
      trigger: 'owner_request',
    });

    expect(snapshot).toMatchObject({ sourceCount: 1, latestObservedAtMs: 2_000, decision: null });
  });
});
