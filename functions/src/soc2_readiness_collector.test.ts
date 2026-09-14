import {
  boundText,
  buildWeeklyCollection,
  buildWeeklyRunId,
  classifyFreshness,
  redactAdminIds,
  sha256Text,
  type SourceResult,
} from './soc2_readiness_collector';

describe('SOC2 readiness collector pure contracts', () => {
  it('builds deterministic UTC run ids and redacted identity summaries', () => {
    expect(buildWeeklyRunId(new Date('2026-09-11T04:00:00.000Z'))).toBe('weekly-2026-09-07');
    expect(redactAdminIds(['uid-b', 'uid-a'])).toEqual({ count: 2, sha256: expect.any(String) });
    expect(redactAdminIds(['uid-a', 'uid-a']).count).toBe(1);
    expect(sha256Text('same')).toBe(sha256Text('same'));
  });

  it('bounds operator text and computes freshness without clock drift', () => {
    expect(boundText('x'.repeat(3000), 2000)).toHaveLength(2000);
    expect(classifyFreshness(new Date('2026-09-11T00:00:00.000Z'), 2, new Date('2026-09-11T12:00:00.000Z'))).toBe('fresh');
    expect(classifyFreshness(new Date('2026-09-08T00:00:00.000Z'), 2, new Date('2026-09-11T12:00:00.000Z'))).toBe('stale');
  });

  it('never turns a truncated source into a passing control', () => {
    const source: SourceResult = {
      controlId: 'access-review', evidenceId: 'AUTO-CC6.2-ACCESS', source: 'firebase-auth',
      result: 'blocked', populationSummary: { count: 1000, truncated: true },
      exceptions: ['population_truncated'], sourceRevision: 'firebase-auth',
    };
    const manifests = buildWeeklyCollection({
      runId: 'weekly-2026-09-07', collectedAt: '2026-09-11T04:00:00.000Z',
      windowStart: '2026-09-04T04:00:00.000Z', windowEnd: '2026-09-11T04:00:00.000Z',
      sources: [source],
    });
    expect(manifests.find((item) => item.controlId === 'access-review')?.result).toBe('blocked');
    expect(manifests.every((item) => item.schemaVersion === 'soc2-evidence-manifest-v1')).toBe(true);
    expect(JSON.stringify(manifests)).not.toContain('uid-a');
  });
});
