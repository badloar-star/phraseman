"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observation_1 = require("./observation");
describe('Agent Office W2 observation adapters', () => {
    test.each([
        ['complete', { state: 'ready', count: 4, truncated: false }, 'ready', false],
        ['empty', { state: 'empty', count: 0, truncated: false }, 'empty', false],
        ['partial', { state: 'partial', count: 4, truncated: false }, 'partial', true],
        ['error', { state: 'error', count: 0, truncated: false }, 'error', true],
        ['truncated', { state: 'ready', count: 100, truncated: true }, 'truncated', true],
    ])('preserves %s source state without converting it into a zero', (_name, input, state, insufficient) => {
        expect((0, observation_1.normalizeSourceHealth)('reports', input, 2000)).toEqual({
            source: 'reports',
            state,
            count: input.count,
            truncated: typeof input.truncated === 'boolean' ? input.truncated : null,
            observedAtMs: 2000,
            insufficientEvidence: insufficient,
        });
    });
    test.each([
        [{ state: 'ready', count: -1 }, 'negative count'],
        [{ state: 'empty', count: 1, truncated: false }, 'non-zero empty count'],
        [{ state: 'empty', count: '0' }, 'non-numeric count'],
        [{ state: 'ready', count: 1 }, 'missing explicit truncated flag'],
        [{ state: 'ready' }, 'missing count'],
        [{ state: 'ready', count: 1, truncated: 'false' }, 'invalid truncated flag'],
        [{ state: 'unknown', count: 1 }, 'unknown state'],
    ])('fails closed for %s source receipt', (input, _name) => {
        const health = (0, observation_1.normalizeSourceHealth)('reports', input, 2000);
        expect(health.insufficientEvidence).toBe(true);
        expect(health.state).toBe('error');
    });
    test('preserves exact per-source observation timestamps at the runner boundary', () => {
        const observation = (0, observation_1.observeAgentOffice)({
            observedAtMs: 5000,
            sourceHealth: [
                { source: 'analytics', state: 'ready', count: 1, truncated: false, observedAtMs: 4700 },
                { source: 'reports', state: 'empty', count: 0, truncated: false, observedAtMs: 4800 },
                { source: 'audit', state: 'empty', count: 0, truncated: false, observedAtMs: 4900 },
            ],
            rows: [],
        });
        expect(observation.sourceHealth).toEqual([
            { source: 'analytics', state: 'ready', count: 1, truncated: false, observedAtMs: 4700, insufficientEvidence: false },
            { source: 'reports', state: 'empty', count: 0, truncated: false, observedAtMs: 4800, insufficientEvidence: false },
            { source: 'audit', state: 'empty', count: 0, truncated: false, observedAtMs: 4900, insufficientEvidence: false },
        ]);
        expect(observation.evidenceSufficient).toBe(true);
    });
    test('deduplicates reports into a bounded redacted incident sample', () => {
        const result = (0, observation_1.deduplicateReportIncidents)([
            { source: 'error_reports', sourceRef: `reports:sha256:${'a'.repeat(64)}`, category: 'audio', screen: 'lesson', summary: 'Email a@b.com or +353 871234567' },
            { source: 'error_reports', sourceRef: `reports:sha256:${'b'.repeat(64)}`, category: 'audio', screen: 'lesson', summary: 'Sound stops after one word' },
            { source: 'error_reports', sourceRef: `reports:sha256:${'c'.repeat(64)}`, category: 'audio', screen: 'lesson', summary: 'Third reproduction detail' },
            { source: 'error_reports', sourceRef: `reports:sha256:${'d'.repeat(64)}`, category: 'audio', screen: 'lesson', summary: 'Fourth reproduction detail' },
        ], 3);
        const { incidents } = result;
        expect(incidents).toHaveLength(1);
        expect(incidents[0]).toMatchObject({ source: 'error_reports', category: 'audio', screen: 'lesson', count: 4 });
        expect(incidents[0].evidence).toHaveLength(3);
        expect(JSON.stringify(incidents)).not.toMatch(/a@b\.com|353 871234567|Sound stops after one word/);
        expect(result).toMatchObject({ truncated: true, insufficientEvidence: true, droppedEvidenceCount: 1 });
    });
    test('drops unsafe references and replaces unsafe metadata before grouping', () => {
        const result = (0, observation_1.deduplicateReportIncidents)([{
                source: 'attacker@example.com', sourceRef: 'report-id-user-123', category: 'user@example.com', screen: '+353 871234567', summary: 'raw report body',
            }]);
        expect(result.incidents).toEqual([]);
        expect(result).toMatchObject({ insufficientEvidence: true, droppedEvidenceCount: 1 });
        expect(JSON.stringify(result)).not.toMatch(/attacker@example.com|user@example.com|353 871234567|report-id-user-123|raw report body/);
    });
    test('excludes invalid references from an incident count and marks the remaining incident insufficient', () => {
        const result = (0, observation_1.deduplicateReportIncidents)([
            { source: 'error_reports', sourceRef: `reports:sha256:${'a'.repeat(64)}`, category: 'audio', screen: 'lesson' },
            { source: 'error_reports', sourceRef: 'raw-user-id-123', category: 'audio', screen: 'lesson' },
        ]);
        expect(result).toMatchObject({ insufficientEvidence: true, droppedEvidenceCount: 1 });
        expect(result.incidents[0]).toMatchObject({ count: 1, insufficientEvidence: true });
    });
    test('bounds report rows, groups and total evidence with explicit insufficient truncation', () => {
        const result = (0, observation_1.deduplicateReportIncidents)(Array.from({ length: 101 }, (_value, index) => ({
            source: 'error_reports', sourceRef: `reports:sha256:${index.toString(16).padStart(64, 'a')}`,
            category: index % 2 ? 'audio' : 'bug', screen: index % 2 ? 'lesson' : 'home', summary: 'ignored',
        })), 5);
        expect(result).toMatchObject({ truncated: true, insufficientEvidence: true, droppedEvidenceCount: 91 });
        expect(result.incidents.length).toBeLessThanOrEqual(20);
        expect(result.incidents.reduce((sum, incident) => sum + incident.evidence.length, 0)).toBeLessThanOrEqual(20);
    });
    test('creates cases only for the bounded deterministic allowlist and blocks incomplete evidence', () => {
        const cases = (0, observation_1.createObservationCases)({
            observedAtMs: 2000,
            sourceHealth: [
                (0, observation_1.normalizeSourceHealth)('analytics', { state: 'ready', count: 1, truncated: false }, 2000),
                (0, observation_1.normalizeSourceHealth)('reports', { state: 'truncated', count: 100, truncated: true }, 2000),
            ],
            analytics: { state: 'partial', qualityIncomplete: true },
            incidents: [{ source: 'error_reports', category: 'audio', screen: 'lesson', count: 3, evidence: [], truncated: false, insufficientEvidence: false, droppedEvidenceCount: 0 }],
            audit: { state: 'ready', count: 1, truncated: false },
        });
        expect(cases.map((item) => item.signal)).toEqual(['analytics_incomplete', 'report_incident']);
        expect(cases[0]).toMatchObject({ status: 'insufficient_data', insufficientEvidence: true });
        expect(cases.every((item) => item.actionType === 'analysis_prepare')).toBe(true);
    });
    test('propagates incomplete analytics, audit and report receipts to every incident case', () => {
        const cases = (0, observation_1.createObservationCases)({
            observedAtMs: 2000,
            sourceHealth: [(0, observation_1.normalizeSourceHealth)('reports', { state: 'ready', count: -1 }, 2000)],
            analytics: { state: 'ready', qualityIncomplete: false, count: 1 },
            incidents: [{ source: 'error_reports', category: 'audio', screen: 'lesson', count: 2, evidence: [], truncated: false, insufficientEvidence: false, droppedEvidenceCount: 0 }],
            audit: { state: 'error', count: 0 },
        });
        expect(cases.find((item) => item.signal === 'report_incident')).toMatchObject({ status: 'insufficient_data', insufficientEvidence: true });
        expect(cases.find((item) => item.signal === 'audit_error')).toBeDefined();
    });
    test('requires all expected explicit source receipts before an incident can be observed', () => {
        const incident = { source: 'error_reports', category: 'audio', screen: 'lesson', count: 2, evidence: [], truncated: false, insufficientEvidence: false, droppedEvidenceCount: 0 };
        const complete = (0, observation_1.createObservationCases)({
            observedAtMs: 2000,
            sourceHealth: [
                (0, observation_1.normalizeSourceHealth)('analytics', { state: 'ready', count: 1, truncated: false }, 2000),
                (0, observation_1.normalizeSourceHealth)('reports', { state: 'ready', count: 2, truncated: false }, 2000),
                (0, observation_1.normalizeSourceHealth)('audit', { state: 'empty', count: 0, truncated: false }, 2000),
            ],
            analytics: { state: 'ready', qualityIncomplete: false, count: 1, truncated: false },
            incidents: [incident],
            audit: { state: 'empty', count: 0, truncated: false },
        });
        const missing = (0, observation_1.createObservationCases)({
            observedAtMs: 2000,
            sourceHealth: [],
            analytics: { state: 'ready', qualityIncomplete: false, count: 1, truncated: false },
            incidents: [incident],
            audit: { state: 'empty', count: 0, truncated: false },
        });
        expect(complete.find((item) => item.signal === 'report_incident')).toMatchObject({ status: 'observed', insufficientEvidence: false });
        expect(missing.find((item) => item.signal === 'report_incident')).toMatchObject({ status: 'insufficient_data', insufficientEvidence: true });
    });
    test('builds a zero-cost daily digest with freshness and at most one observation recommendation', () => {
        const digest = (0, observation_1.buildDailyObservationDigest)({
            generatedAtMs: 5000,
            sourceHealth: [(0, observation_1.normalizeSourceHealth)('analytics', { state: 'ready', count: 1, truncated: false }, 4000)],
            cases: [
                { signal: 'report_incident', status: 'observed', insufficientEvidence: false, summary: 'Three reports on lesson audio.', actionType: 'analysis_prepare' },
                { signal: 'audit_error', status: 'observed', insufficientEvidence: false, summary: 'Ignored second recommendation.', actionType: 'analysis_prepare' },
            ],
        });
        expect(digest.cost).toEqual({ currency: 'EUR', estimatedMinor: 0, summary: 'No model or external calls.' });
        expect(digest.freshness).toEqual([{ source: 'analytics', state: 'ready', ageMs: 1000 }]);
        expect(digest.recommendation).toMatchObject({ signal: 'report_incident' });
        expect(JSON.stringify(digest)).not.toContain('Ignored second recommendation.');
    });
});
//# sourceMappingURL=observation.test.js.map