import {
  buildDailyObservationDigest,
  createObservationCases,
  deduplicateReportIncidents,
  normalizeSourceHealth,
} from './observation';

describe('Agent Office W2 observation adapters', () => {
  test.each([
    ['complete', { state: 'ready', count: 4, truncated: false }, 'ready', false],
    ['partial', { state: 'partial', count: 4, truncated: false }, 'partial', true],
    ['error', { state: 'error', count: 0, truncated: false }, 'error', true],
    ['truncated', { state: 'ready', count: 100, truncated: true }, 'truncated', true],
  ])('preserves %s source state without converting it into a zero', (_name, input, state, insufficient) => {
    expect(normalizeSourceHealth('reports', input, 2_000)).toEqual({
      source: 'reports', state, observedAtMs: 2_000, insufficientEvidence: insufficient,
    });
  });

  test('deduplicates reports into a bounded redacted incident sample', () => {
    const incidents = deduplicateReportIncidents([
      { source: 'error_reports', reportId: 'r1', category: 'audio', screen: 'lesson', summary: 'Email a@b.com or +353 871234567' },
      { source: 'error_reports', reportId: 'r2', category: 'audio', screen: 'lesson', summary: 'Sound stops after one word' },
      { source: 'error_reports', reportId: 'r3', category: 'audio', screen: 'lesson', summary: 'Third reproduction detail' },
      { source: 'error_reports', reportId: 'r4', category: 'audio', screen: 'lesson', summary: 'Fourth reproduction detail' },
    ], 3);

    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({ source: 'error_reports', category: 'audio', screen: 'lesson', count: 4 });
    expect(incidents[0].evidence).toHaveLength(3);
    expect(JSON.stringify(incidents)).not.toMatch(/a@b\.com|353 871234567|r1|Sound stops after one word/);
  });

  test('creates cases only for the bounded deterministic allowlist and blocks incomplete evidence', () => {
    const cases = createObservationCases({
      observedAtMs: 2_000,
      sourceHealth: [
        normalizeSourceHealth('analytics', { state: 'ready', count: 1, truncated: false }, 2_000),
        normalizeSourceHealth('reports', { state: 'truncated', count: 100, truncated: true }, 2_000),
      ],
      analytics: { state: 'partial', qualityIncomplete: true },
      incidents: [{ source: 'error_reports', category: 'audio', screen: 'lesson', count: 3, evidence: [] }],
      audit: { state: 'ready' },
    });

    expect(cases.map((item) => item.signal)).toEqual(['analytics_incomplete', 'report_incident']);
    expect(cases[0]).toMatchObject({ status: 'insufficient_data', insufficientEvidence: true });
    expect(cases.every((item) => item.actionType === 'analysis_prepare')).toBe(true);
  });

  test('builds a zero-cost daily digest with freshness and at most one observation recommendation', () => {
    const digest = buildDailyObservationDigest({
      generatedAtMs: 5_000,
      sourceHealth: [normalizeSourceHealth('analytics', { state: 'ready', count: 1, truncated: false }, 4_000)],
      cases: [
        { signal: 'report_incident', status: 'observed', insufficientEvidence: false, summary: 'Three reports on lesson audio.', actionType: 'analysis_prepare' },
        { signal: 'audit_error', status: 'observed', insufficientEvidence: false, summary: 'Ignored second recommendation.', actionType: 'analysis_prepare' },
      ],
    });

    expect(digest.cost).toEqual({ currency: 'EUR', estimatedMinor: 0, summary: 'No model or external calls.' });
    expect(digest.freshness).toEqual([{ source: 'analytics', state: 'ready', ageMs: 1_000 }]);
    expect(digest.recommendation).toMatchObject({ signal: 'report_incident' });
    expect(JSON.stringify(digest)).not.toContain('Ignored second recommendation.');
  });
});
