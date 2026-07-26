"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const admin_director_digest_1 = require("./admin_director_digest");
const NOW_MS = Date.parse('2026-07-19T12:34:56.789Z');
function auth(role = 'owner') {
    return {
        uid: `${role}-uid`,
        token: { admin: true, adminRole: role, email: `${role}@private.example` },
    };
}
function trendsResponse(overrides = {}) {
    return {
        state: 'ready',
        sources: [
            {
                source: 'paywall',
                state: 'ready',
                truncated: false,
                uncertaintyStartsAtMs: null,
                latestAtMs: NOW_MS - 1000,
                checkedAtMs: NOW_MS,
                dataAgeMs: 1000,
                freshness: 'recent',
                errorCode: null,
                limitations: ['private source prose'],
            },
            {
                source: 'premium_event_time',
                state: 'ready',
                truncated: false,
                uncertaintyStartsAtMs: null,
                latestAtMs: NOW_MS - 2000,
                checkedAtMs: NOW_MS,
                dataAgeMs: 2000,
                freshness: 'recent',
                errorCode: null,
                limitations: [],
            },
            {
                source: 'premium_created_at',
                state: 'empty',
                truncated: false,
                uncertaintyStartsAtMs: null,
                latestAtMs: null,
                checkedAtMs: NOW_MS,
                dataAgeMs: null,
                freshness: 'no_events',
                errorCode: null,
                limitations: [],
            },
        ],
        sections: {
            behavioralPaywall: {
                series: [{
                        metricId: 'paywall.shown.v1',
                        label: 'PRIVATE LABEL',
                        unit: 'count',
                        source: 'paywall_funnel',
                        status: 'ready',
                        coverage: 'complete',
                        limitations: ['PRIVATE LIMITATION'],
                        definition: { description: 'PRIVATE DEFINITION' },
                        points: [
                            { bucketStart: '2026-07-17', value: 2 },
                            { bucketStart: '2026-07-18', value: 3 },
                            { bucketStart: '2026-07-19', value: 5 },
                        ],
                        previousPoints: [
                            { bucketStart: '2026-07-14', value: 1 },
                            { bucketStart: '2026-07-15', value: 2 },
                            { bucketStart: '2026-07-16', value: 2 },
                        ],
                        uid: 'PRIVATE_UID',
                        body: 'PRIVATE_BODY',
                    }],
            },
            confirmedStore: { series: [] },
            grossRevenue: { series: [] },
        },
        rawEmail: 'PRIVATE_EMAIL@example.com',
        ...overrides,
    };
}
function dependencies(response = trendsResponse()) {
    return {
        nowMs: () => NOW_MS,
        loadTrends: jest.fn(async () => response),
    };
}
describe('admin director digest', () => {
    test('exports an App Check protected narrative callable without old digest runtime or writes', () => {
        const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'admin_director_digest.ts'), 'utf8');
        const index = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'index.ts'), 'utf8');
        expect(source).toContain('export const adminGetDirectorDigest = onCall({');
        expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
        expect(source).toContain("defineSecret('OPENAI_API_KEY')");
        expect(source).toContain('secrets: [OPENAI_API_KEY]');
        expect(source).not.toContain("from './admin_daily_digest'");
        expect(source).not.toMatch(/admin_digests|admin_digest_runs|admin_digest_state/);
        expect(index).toContain("export { adminGetDirectorDigest } from './admin_director_digest';");
    });
    test.each([1, 3, 7, 28, 90])('accepts the supported %i-day period and requests a trusted previous-period comparison', async (rangeDays) => {
        const deps = dependencies();
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays }, auth(), deps);
        expect(result.rangeDays).toBe(rangeDays);
        expect(deps.loadTrends).toHaveBeenCalledWith({
            scope: 'overview',
            fromDate: result.period.startIso.slice(0, 10),
            toDate: new Date(result.period.endExclusiveMs - 1).toISOString().slice(0, 10),
            granularity: 'day',
            comparePrevious: true,
            filters: {},
        }, NOW_MS);
    });
    test.each([
        undefined,
        null,
        {},
        { rangeDays: 2 },
        { rangeDays: 7.0, extra: true },
        { rangeDays: '7' },
        { rangeDays: Number.NaN },
    ])('rejects an unsupported or malformed request: %p', async (data) => {
        const deps = dependencies();
        await expect((0, admin_director_digest_1.getDirectorDigestResponse)(data, auth(), deps)).rejects.toMatchObject({
            code: 'invalid-argument',
        });
        expect(deps.loadTrends).not.toHaveBeenCalled();
    });
    test('requires authentication before reading sources', async () => {
        const deps = dependencies();
        await expect((0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 7 }, null, deps)).rejects.toMatchObject({
            code: 'unauthenticated',
        });
        expect(deps.loadTrends).not.toHaveBeenCalled();
    });
    test.each([
        { uid: 'owner-uid', token: { admin: false, adminRole: 'owner' } },
        auth('analyst'),
        { uid: '', token: { admin: true, adminRole: 'owner' } },
    ])('requires owner/admin role plus briefing.read before reading sources', async (caller) => {
        const deps = dependencies();
        await expect((0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 7 }, caller, deps)).rejects.toMatchObject({
            code: 'permission-denied',
        });
        expect(deps.loadTrends).not.toHaveBeenCalled();
    });
    test.each(['owner', 'admin'])('allows the %s role with briefing.read', async (role) => {
        const deps = dependencies();
        await expect((0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 7 }, auth(role), deps)).resolves.toMatchObject({
            state: 'ready',
        });
    });
    test('uses exact UTC calendar boundaries for current and previous periods', async () => {
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), dependencies());
        expect(result.generatedAtMs).toBe(NOW_MS);
        expect(result.period).toEqual({
            startMs: Date.parse('2026-07-17T00:00:00.000Z'),
            endExclusiveMs: Date.parse('2026-07-20T00:00:00.000Z'),
            startIso: '2026-07-17T00:00:00.000Z',
            endExclusiveIso: '2026-07-20T00:00:00.000Z',
        });
        expect(result.previousPeriod).toEqual({
            startMs: Date.parse('2026-07-14T00:00:00.000Z'),
            endExclusiveMs: Date.parse('2026-07-17T00:00:00.000Z'),
            startIso: '2026-07-14T00:00:00.000Z',
            endExclusiveIso: '2026-07-17T00:00:00.000Z',
        });
    });
    test('marks incomplete sources explicitly and never invents a zero or trend', async () => {
        const response = trendsResponse({
            state: 'partial',
            sources: [{
                    source: 'paywall',
                    state: 'partial',
                    truncated: true,
                    uncertaintyStartsAtMs: NOW_MS - 100,
                    latestAtMs: NOW_MS - 200,
                    checkedAtMs: NOW_MS,
                    dataAgeMs: 200,
                    freshness: 'recent',
                    errorCode: 'PRIVATE_BACKEND_ERROR',
                    limitations: ['PRIVATE SOURCE PROSE'],
                }],
            sections: {
                behavioralPaywall: {
                    series: [{
                            metricId: 'paywall.purchase_completed.v1',
                            label: 'PRIVATE LABEL',
                            unit: 'count',
                            source: 'paywall_funnel',
                            status: 'partial',
                            coverage: 'partial',
                            limitations: ['PRIVATE LIMITATION'],
                            definition: { description: 'PRIVATE DEFINITION' },
                            points: [{ bucketStart: '2026-07-19', value: null }],
                            previousPoints: [{ bucketStart: '2026-07-18', value: 4 }],
                        }],
                },
                confirmedStore: {
                    series: [{
                            metricId: 'store.refund.v1',
                            unit: 'count',
                            source: 'revenuecat_premium_events',
                            status: 'unavailable',
                            coverage: 'unavailable',
                            points: [],
                            previousPoints: [],
                        }],
                },
                grossRevenue: { series: [] },
            },
        });
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 1 }, auth(), dependencies(response));
        expect(result.state).toBe('partial');
        expect(result.sourceHealth[0]).toEqual({
            source: 'paywall',
            state: 'partial',
            truncated: true,
            uncertaintyStartsAtMs: NOW_MS - 100,
            latestAtMs: NOW_MS - 200,
            checkedAtMs: NOW_MS,
            dataAgeMs: 200,
            freshness: 'recent',
        });
        expect(result.metrics).toEqual([
            expect.objectContaining({
                id: 'paywall.purchase_completed.v1',
                availability: 'partial',
                current: null,
                previous: 4,
                absoluteDelta: null,
                percentDelta: null,
                direction: 'unavailable',
            }),
            expect.objectContaining({
                id: 'store.refund.v1',
                availability: 'unavailable',
                current: null,
                previous: null,
            }),
        ]);
    });
    test('fails closed when a required source-health record is missing', async () => {
        const response = trendsResponse({
            sources: [{
                    source: 'paywall',
                    state: 'ready',
                    truncated: false,
                    uncertaintyStartsAtMs: null,
                    latestAtMs: NOW_MS - 1000,
                    checkedAtMs: NOW_MS,
                    dataAgeMs: 1000,
                    freshness: 'recent',
                }],
        });
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), dependencies(response));
        expect(result.state).toBe('partial');
        expect(result.sourceHealth).toEqual([
            expect.objectContaining({ source: 'paywall', state: 'ready' }),
            expect.objectContaining({ source: 'premium_event_time', state: 'unavailable' }),
            expect.objectContaining({ source: 'premium_created_at', state: 'unavailable' }),
        ]);
    });
    test('serializes only the aggregate allowlist and excludes PII, raw text, and unknown fields', async () => {
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), dependencies());
        const serialized = JSON.stringify(result);
        for (const forbidden of [
            'PRIVATE_UID',
            'PRIVATE_BODY',
            'PRIVATE_EMAIL',
            'PRIVATE LABEL',
            'PRIVATE LIMITATION',
            'PRIVATE DEFINITION',
            'private source prose',
        ]) {
            expect(serialized).not.toContain(forbidden);
        }
        expect(result.metrics).toEqual([{
                id: 'paywall.shown.v1',
                source: 'paywall_funnel',
                unit: 'count',
                availability: 'ready',
                current: 10,
                previous: 5,
                absoluteDelta: 5,
                percentDelta: 100,
                direction: 'up',
            }]);
    });
    test('returns the validated V2 narrative generated only from the sanitized aggregate prompt', async () => {
        const deps = {
            ...dependencies(),
            generateNarrative: jest.fn(async (prompt) => ({
                text: JSON.stringify({
                    ownerMonologue: 'За последние три дня предложение Plus стало заметнее, и это хороший повод внимательно посмотреть на качество внимания, а не праздновать рост раньше времени. Мы видим движение в верхней части пути, но пока не знаем, связано ли оно с более точным показом предложения или просто с изменившимся охватом. Я бы сейчас сопоставил этот сдвиг с соседними шагами и изменениями продукта, чтобы понять, приносит ли дополнительное внимание более здоровое покупательское поведение.',
                    executiveSummary: 'Показы предложения выросли.',
                    productManager: [{
                            title: 'Проверить рост показов',
                            metricIds: ['paywall.shown.v1'],
                            whyItMatters: 'Верхняя часть воронки влияет на следующие шаги.',
                            hypothesis: 'Гипотеза: изменился охват предложения.',
                            action: 'Сопоставить показы с изменениями продукта.',
                            successMetric: 'Причина изменения проверена.',
                            confidence: 'medium',
                        }],
                    growthAndRevenue: [],
                    qualityAndRisks: [],
                    userVoice: [],
                    actions: [{
                            priority: 1,
                            action: 'Сопоставить показы с изменениями продукта.',
                            reason: 'Нужно проверить соседние шаги воронки.',
                            successMetric: 'Причина изменения проверена.',
                        }],
                    sourceWarnings: [],
                }),
                model: 'test-model',
            })),
        };
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), deps);
        expect(result.schemaVersion).toBe(3);
        expect(result.narrativeState).toBe('generated');
        expect(result.narrative.ownerMonologue).toContain('предложение Plus стало заметнее');
        expect(result.narrative.executiveSummary).toBe('Показы предложения выросли.');
        expect(result.narrative.productManager[0].fact).toContain('Показы предложения Plus: 10');
        expect(result.narrative.productManager[0].comparison).toContain('было 5');
        expect(deps.generateNarrative).toHaveBeenCalledTimes(1);
        const prompt = deps.generateNarrative.mock.calls[0][0];
        expect(`${prompt.system}\n${prompt.user}`).not.toMatch(/PRIVATE_UID|PRIVATE_BODY|PRIVATE_EMAIL|private source prose/);
    });
    test('keeps the aggregate response available with a deterministic narrative when generation fails', async () => {
        const deps = {
            ...dependencies(),
            generateNarrative: jest.fn(async () => {
                throw new Error('provider unavailable');
            }),
        };
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), deps);
        expect(result.metrics).not.toHaveLength(0);
        expect(result.narrativeState).toBe('fallback');
        expect(result.narrative.ownerMonologue.length).toBeGreaterThan(100);
        expect(result.narrative.executiveSummary).toContain('Показы предложения Plus');
        expect(result.narrative.productManager.length).toBeGreaterThan(0);
    });
    test('does not spend on narrative generation when all trusted sources are unavailable', async () => {
        const unavailable = trendsResponse({
            state: 'error',
            sources: [
                { source: 'paywall', state: 'error' },
                { source: 'premium_event_time', state: 'error' },
                { source: 'premium_created_at', state: 'error' },
            ],
        });
        const deps = {
            ...dependencies(unavailable),
            generateNarrative: jest.fn(),
        };
        const result = await (0, admin_director_digest_1.getDirectorDigestResponse)({ rangeDays: 3 }, auth(), deps);
        expect(result.state).toBe('unavailable');
        expect(result.narrativeState).toBe('fallback');
        expect(deps.generateNarrative).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=admin_director_digest.test.js.map