"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = require("firebase-functions/v2/https");
const admin_analytics_trends_1 = require("./admin_analytics_trends");
const admin_analytics_trends_core_1 = require("./admin_analytics_trends_core");
const NOW = Date.UTC(2026, 6, 13, 12);
function read(rows, overrides = {}) {
    return {
        rows,
        checkedAtMs: NOW,
        truncated: false,
        uncertaintyStartsAtMs: null,
        latestAtMs: null,
        ...overrides,
    };
}
function fulfilled(value) {
    return { status: 'fulfilled', value };
}
function rejected(message) {
    return { status: 'rejected', reason: new Error(message) };
}
function request(input = {}) {
    return (0, admin_analytics_trends_core_1.normalizeTrendRequest)({
        scope: 'overview',
        fromDate: '2026-07-11',
        toDate: '2026-07-13',
        comparePrevious: true,
        ...input,
    }, NOW);
}
function emptySettled(scope = 'overview') {
    const result = {
        paywall: fulfilled(read([])),
        premium_event_time: fulfilled(read([])),
        premium_created_at: fulfilled(read([])),
    };
    if (scope === 'overview')
        return result;
    return {
        ...result,
        shards: fulfilled(read([])),
        purchase_failures: fulfilled({
            rows: [],
            checkedAtMs: NOW,
            exportPending: false,
        }),
    };
}
function makeReaders(calls) {
    const count = (name, value) => async () => {
        calls[name] = (calls[name] ?? 0) + 1;
        return value;
    };
    return {
        paywall: count('paywall', read([])),
        premium_event_time: count('premium_event_time', read([])),
        premium_created_at: count('premium_created_at', read([])),
        shards: count('shards', read([])),
        purchase_failures: count('purchase_failures', {
            rows: [], checkedAtMs: NOW, exportPending: false,
        }),
    };
}
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
beforeEach(() => {
    (0, admin_analytics_trends_1._resetAdminAnalyticsTrendsCacheForTests)();
});
describe('admin analytics trends request and callable security contract', () => {
    test('maps validation errors to a fixed invalid-argument HttpsError', () => {
        let thrown;
        try {
            (0, admin_analytics_trends_1.parseAdminAnalyticsTrendsRequest)({ scope: 'private_collection_name' }, NOW);
        }
        catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(https_1.HttpsError);
        expect(thrown.code).toBe('invalid-argument');
        expect(thrown.message).toBe('Invalid analytics trends request.');
        expect(thrown.message).not.toContain('private_collection_name');
    });
    test('maps previous-window underflow to the same fixed invalid-argument error', () => {
        let thrown;
        try {
            (0, admin_analytics_trends_1.parseAdminAnalyticsTrendsRequest)({
                scope: 'overview',
                fromDate: '0001-01-01',
                toDate: '0001-01-01',
                comparePrevious: true,
            }, NOW);
        }
        catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(https_1.HttpsError);
        expect(thrown.code).toBe('invalid-argument');
        expect(thrown.message).toBe('Invalid analytics trends request.');
        expect(thrown.message).not.toMatch(/previous|fromDate|0001/);
    });
    test('returns deeply immutable normalized requests', () => {
        const parsed = (0, admin_analytics_trends_1.parseAdminAnalyticsTrendsRequest)({
            scope: 'overview',
            filters: { platform: 'ios' },
        }, NOW);
        expect(parsed).toEqual({
            scope: 'overview',
            presetDays: 28,
            fromDate: '2026-06-16',
            toDate: '2026-07-13',
            granularity: 'day',
            comparePrevious: false,
            filters: { platform: 'ios' },
        });
        expect(Object.isFrozen(parsed)).toBe(true);
        expect(Object.isFrozen(parsed.filters)).toBe(true);
    });
    test('uses v2 App Check, authenticated money.read claims, and a fixed index export', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_analytics_trends.ts'), 'utf8');
        const index = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'index.ts'), 'utf8');
        expect(source).toContain("from 'firebase-functions/v2/https'");
        expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
        expect(source).toContain('if (!request.auth)');
        expect(source).toContain("hasClaimedPermission(request.auth?.token, 'money.read')");
        expect(source).toContain("new HttpsError('unauthenticated'");
        expect(source).toContain("new HttpsError('permission-denied'");
        expect(index).toContain("export { adminGetAnalyticsTrends } from './admin_analytics_trends';");
    });
    test('uses only fixed Firestore collections, fields, directions, and hard caps', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_analytics_trends.ts'), 'utf8');
        expect(admin_analytics_trends_1.EVENT_CAP).toBe(5000);
        expect(source).toContain("collection('paywall_funnel')");
        expect(source).toContain("orderBy('ts', 'asc')");
        expect(source).toContain("collection('revenuecat_premium_events')");
        expect(source).toContain("orderBy('eventTimestampMs', 'asc')");
        expect(source).toContain("orderBy('createdAt', 'asc')");
        expect(source).toContain("collection('revenuecat_shard_transactions')");
        expect(source).toContain("limit(EVENT_CAP + 1)");
        expect(source).toContain("maximumBytesBilled: '5000000000'");
        const failureReader = source.slice(source.indexOf('async function readPurchaseFailures'), source.indexOf('const DEFAULT_READERS'));
        expect(failureReader).toContain('loadProductAnalyticsPurchaseFailureRows');
        expect(failureReader).not.toContain('loadProductAnalyticsAggregateRows');
        expect(failureReader).toContain('startMs: context.currentFromMs');
        expect(source).not.toMatch(/request\.data\??\.(collection|orderBy|limit|sql|maximumBytesBilled)/);
    });
    test('sets explicit bounded callable runtime cost controls', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_analytics_trends.ts'), 'utf8');
        expect(source).toContain('maxInstances: 4');
        expect(source).toContain('concurrency: 10');
    });
});
describe('fixed source selection and timestamp safety', () => {
    test('returns the exact fixed allowlist in execution order', () => {
        expect((0, admin_analytics_trends_1.sourcesForScope)('overview')).toEqual([
            'paywall', 'premium_event_time', 'premium_created_at',
        ]);
        expect((0, admin_analytics_trends_1.sourcesForScope)('paywall')).toEqual([
            'paywall', 'premium_event_time', 'premium_created_at', 'shards', 'purchase_failures',
        ]);
        expect(Object.isFrozen((0, admin_analytics_trends_1.sourcesForScope)('overview'))).toBe(true);
    });
    test('safely accepts number, Date, and Timestamp-like values only', () => {
        expect((0, admin_analytics_trends_1.timestampMillis)(1234.9)).toBe(1234);
        expect((0, admin_analytics_trends_1.timestampMillis)(new Date(2000))).toBe(2000);
        expect((0, admin_analytics_trends_1.timestampMillis)({ toMillis: () => 3000 })).toBe(3000);
        expect((0, admin_analytics_trends_1.timestampMillis)({ seconds: 4, nanoseconds: 500000000 })).toBe(4500);
        expect((0, admin_analytics_trends_1.timestampMillis)({ toMillis: () => Number.NaN })).toBeNull();
        expect((0, admin_analytics_trends_1.timestampMillis)('1234')).toBeNull();
        expect((0, admin_analytics_trends_1.timestampMillis)(new Date(Number.NaN))).toBeNull();
    });
    test('keeps only legacy premium rows and assigns createdAt as the effective event time', () => {
        const normalized = (0, admin_analytics_trends_1.normalizePremiumCreatedAtRows)([
            { id: 'legacy', eventTimestampMs: null, createdAt: { toMillis: () => 1000 } },
            { id: 'invalid', eventTimestampMs: 'not-numeric', createdAt: new Date(2000) },
            { id: 'modern', eventTimestampMs: 3000, createdAt: new Date(2500) },
            { id: 'undated', eventTimestampMs: undefined, createdAt: 'not-a-timestamp' },
        ]);
        expect(normalized).toEqual([
            { id: 'legacy', eventTimestampMs: 1000, createdAt: { toMillis: expect.any(Function) }, createdAtMs: 1000 },
            { id: 'invalid', eventTimestampMs: 2000, createdAt: new Date(2000), createdAtMs: 2000 },
        ]);
    });
});
describe('isolated composition, completeness, and privacy', () => {
    test('suppresses detailed paywall breakdown values in overview but keeps them in paywall scope', () => {
        const paywallRow = {
            step: 'shown', ts: Date.UTC(2026, 6, 12), context: 'home', variant: 'A', plan: 'monthly',
        };
        const overview = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            paywall: fulfilled(read([paywallRow])),
        });
        const detailed = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, {
            ...emptySettled('paywall'),
            paywall: fulfilled(read([paywallRow])),
        });
        expect(overview.sections.behavioralBreakdowns).toEqual({
            byContext: {
                rows: [], status: 'unavailable', coverage: 'unavailable', limitations: ['scope_not_requested'],
            },
            byVariant: {
                rows: [], status: 'unavailable', coverage: 'unavailable', limitations: ['scope_not_requested'],
            },
            byPlan: {
                rows: [], status: 'unavailable', coverage: 'unavailable', limitations: ['scope_not_requested'],
            },
        });
        expect(JSON.stringify(overview.sections.behavioralBreakdowns)).not.toContain('home');
        expect(detailed.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [{ value: 'home', events: 1 }], status: 'ready', coverage: 'complete', limitations: [],
        });
        expect(detailed.sections.behavioralBreakdowns.byVariant.rows)
            .toContainEqual({ value: 'A', events: 1 });
        expect(detailed.sections.behavioralBreakdowns.byPlan.rows)
            .toContainEqual({ value: 'monthly', events: 1 });
    });
    test('uses the actual composition time for rejected source health checks', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            paywall: rejected('private operational error'),
        });
        expect(response.sources.find((source) => source.source === 'paywall')).toMatchObject({
            state: 'error',
            checkedAtMs: 1783944000000,
        });
        expect(response.sources.every((source) => source.checkedAtMs === NOW)).toBe(true);
    });
    test('keeps store series when paywall fails and reports partial without raw errors', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            paywall: rejected('permission denied for secret-project/paywall_funnel'),
            premium_event_time: fulfilled(read([{
                    id: 'evt-secret',
                    eventId: 'event-secret',
                    eventType: 'INITIAL_PURCHASE',
                    environment: 'PRODUCTION',
                    eventTimestampMs: Date.UTC(2026, 6, 12),
                    grossUsdMicros: 1000000,
                }])),
        });
        expect(response.state).toBe('partial');
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [],
            status: 'unavailable',
            coverage: 'unavailable',
            limitations: ['scope_not_requested'],
        });
        expect(response.sections.behavioralPaywall.series[0].points.every((point) => point.value === null)).toBe(true);
        expect(response.sections.confirmedStore.series.find((series) => series.metricId === 'store.initial_purchase.v1')?.points)
            .toContainEqual({ bucketStart: '2026-07-12', value: 1 });
        expect(JSON.stringify(response)).not.toContain('secret-project');
    });
    test('keeps paywall series when both premium branches fail', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            paywall: fulfilled(read([{
                    step: 'shown', ts: Date.UTC(2026, 6, 12), context: 'home',
                }])),
            premium_event_time: rejected('raw event-time failure'),
            premium_created_at: rejected('raw created-at failure'),
        });
        expect(response.state).toBe('partial');
        expect(response.sections.behavioralPaywall.series[0].points)
            .toContainEqual({ bucketStart: '2026-07-12', value: 1 });
        expect(response.sections.confirmedStore.series[0].points.every((point) => point.value === null)).toBe(true);
    });
    test('reports error only when every selected logical source fails', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            paywall: rejected('paywall raw failure'),
            premium_event_time: rejected('event raw failure'),
            premium_created_at: rejected('created raw failure'),
        });
        expect(response.state).toBe('error');
        expect(JSON.stringify(response)).not.toMatch(/raw failure/);
    });
    test('merges premium branches and lets the core source-specific identity rule dedupe', () => {
        const duplicate = {
            id: 'same-document',
            eventType: 'INITIAL_PURCHASE',
            environment: 'PRODUCTION',
            eventTimestampMs: Date.UTC(2026, 6, 12),
        };
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            premium_event_time: fulfilled(read([duplicate])),
            premium_created_at: fulfilled(read([duplicate])),
        });
        const initial = response.sections.confirmedStore.series
            .find((series) => series.metricId === 'store.initial_purchase.v1');
        expect(initial?.points).toContainEqual({ bucketStart: '2026-07-12', value: 1 });
    });
    test('marks the combined premium source partial and nulls conservatively when either branch fails', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, {
            ...emptySettled(),
            premium_event_time: fulfilled(read([{
                    eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 11),
                }])),
            premium_created_at: rejected('legacy index unavailable: private details'),
        });
        expect(response.state).toBe('partial');
        expect(response.sections.confirmedStore.series[0]).toMatchObject({
            status: 'partial', coverage: 'partial',
        });
        expect(response.sections.confirmedStore.series[0].points.every((point) => point.value === null)).toBe(true);
        expect(JSON.stringify(response)).not.toContain('private details');
    });
    test('nulls the truncation boundary bucket and every later bucket', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ comparePrevious: false }), NOW, {
            ...emptySettled(),
            paywall: fulfilled(read([
                { step: 'shown', ts: Date.UTC(2026, 6, 11) },
                { step: 'shown', ts: Date.UTC(2026, 6, 12) },
            ], {
                truncated: true,
                uncertaintyStartsAtMs: Date.UTC(2026, 6, 12),
                latestAtMs: Date.UTC(2026, 6, 12),
            })),
        });
        const shown = response.sections.behavioralPaywall.series[0];
        expect(shown.status).toBe('partial');
        expect(shown.points).toEqual([
            { bucketStart: '2026-07-11', value: 1 },
            { bucketStart: '2026-07-12', value: null },
            { bucketStart: '2026-07-13', value: null },
        ]);
    });
    test('suppresses all detailed breakdowns when the paywall source is truncated', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, {
            ...emptySettled('paywall'),
            paywall: fulfilled(read([{
                    step: 'shown', ts: Date.UTC(2026, 6, 12), context: 'must-be-suppressed',
                }], {
                truncated: true,
                uncertaintyStartsAtMs: Date.UTC(2026, 6, 12),
            })),
        });
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [], status: 'partial', coverage: 'partial', limitations: ['source_partial'],
        });
        expect(JSON.stringify(response.sections.behavioralBreakdowns)).not.toContain('must-be-suppressed');
    });
    test('masks current and previous paywall buckets older than the 90-day TTL', () => {
        const oldRequest = request({
            scope: 'paywall',
            fromDate: '2026-04-13',
            toDate: '2026-04-14',
            comparePrevious: true,
        });
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(oldRequest, NOW, {
            ...emptySettled('paywall'),
            paywall: fulfilled(read([
                { step: 'shown', ts: Date.UTC(2026, 3, 14) },
                { step: 'shown', ts: Date.UTC(2026, 3, 12) },
            ])),
        });
        const shown = response.sections.behavioralPaywall.series[0];
        expect(shown.points.every((point) => point.value === null)).toBe(true);
        expect(shown.previousPoints?.every((point) => point.value === null)).toBe(true);
        expect(shown.limitations).toContain('bucket_outside_paywall_retention');
        expect(shown).toMatchObject({ status: 'partial', coverage: 'partial' });
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [],
            status: 'partial',
            coverage: 'partial',
            limitations: ['bucket_outside_paywall_retention'],
        });
        expect(response.sources.find((source) => source.source === 'paywall')).toMatchObject({
            state: 'partial',
            limitations: ['bucket_outside_paywall_retention'],
        });
        expect(response.state).toBe('partial');
    });
    test('keeps current-only breakdowns ready when only the previous window is outside retention', () => {
        const ninetyDayRequest = request({
            scope: 'paywall',
            fromDate: '2026-04-15',
            toDate: '2026-07-13',
            comparePrevious: true,
        });
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(ninetyDayRequest, NOW, {
            ...emptySettled('paywall'),
            paywall: fulfilled(read([{
                    step: 'shown', ts: Date.UTC(2026, 6, 12), context: 'home', variant: 'A', plan: 'monthly',
                }])),
        });
        const shown = response.sections.behavioralPaywall.series[0];
        expect(shown.status).toBe('partial');
        expect(shown.coverage).toBe('partial');
        expect(shown.points.find((point) => point.bucketStart === '2026-07-12')?.value).toBe(1);
        expect(shown.previousPoints?.every((point) => point.value === null)).toBe(true);
        expect(response.state).toBe('partial');
        expect(response.sources.find((source) => source.source === 'paywall')).toMatchObject({
            state: 'partial', limitations: ['bucket_outside_paywall_retention'],
        });
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [{ value: 'home', events: 1 }],
            status: 'ready',
            coverage: 'complete',
            limitations: [],
        });
    });
    test('marks fully covered empty paywall breakdowns empty with complete coverage', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({
            scope: 'paywall', comparePrevious: false,
        }), NOW, emptySettled('paywall'));
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [], status: 'empty', coverage: 'complete', limitations: [],
        });
    });
    test('keeps a failed paywall source unavailable even when the requested window is outside retention', () => {
        const oldRequest = request({
            scope: 'paywall', fromDate: '2026-04-13', toDate: '2026-04-14', comparePrevious: true,
        });
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(oldRequest, NOW, {
            ...emptySettled('paywall'),
            paywall: rejected('private source failure'),
        });
        expect(response.sections.behavioralBreakdowns.byContext).toEqual({
            rows: [], status: 'unavailable', coverage: 'unavailable', limitations: ['source_unavailable'],
        });
    });
    test('returns only bounded aggregate keys and never serializes raw rows, ids, candidates, or errors', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, {
            ...emptySettled('paywall'),
            paywall: fulfilled(read([{
                    step: 'shown', ts: Date.UTC(2026, 6, 12), uid: 'uid-secret', uidh: 'uidh-secret',
                    candidates: ['candidate-secret'], error: 'row-error-secret',
                }])),
            premium_event_time: fulfilled(read([{
                    id: 'document-secret', eventId: 'event-secret', transactionId: 'transaction-secret',
                    originalTransactionId: 'original-secret', eventType: 'RENEWAL', environment: 'PRODUCTION',
                    eventTimestampMs: Date.UTC(2026, 6, 12), candidates: ['candidate-secret'],
                }])),
            purchase_failures: fulfilled({
                checkedAtMs: NOW,
                exportPending: false,
                rows: [{
                        row_kind: 'conversion_failure',
                        payload: JSON.stringify({
                            reason: 'provider-card-secret', events: 2, app_instances: 1,
                            candidates: ['failure-candidate-secret'], error: 'failure-error-secret',
                        }),
                    }],
            }),
        });
        const serialized = JSON.stringify(response);
        expect(response).toMatchObject({
            definitionVersion: 'admin_v2_graphical_analytics_v1',
            timezone: 'UTC',
            generatedAtMs: NOW,
        });
        expect(response.sections.purchaseFailures).toEqual({
            rows: [{ id: 'legacy_or_other', events: 2, appInstances: 1 }],
            status: 'ready',
            coverage: 'complete',
            limitations: [],
        });
        for (const forbidden of [
            'uid', 'uidh', 'eventId', 'transactionId', 'originalTransactionId', 'candidates',
            'uid-secret', 'uidh-secret', 'document-secret', 'event-secret', 'transaction-secret',
            'original-secret', 'candidate-secret', 'row-error-secret', 'failure-candidate-secret',
            'failure-error-secret', 'provider-card-secret',
        ])
            expect(serialized).not.toContain(forbidden);
        expect(Object.isFrozen(response)).toBe(true);
        expect(Object.isFrozen(response.sections)).toBe(true);
    });
    test('distinguishes honest empty, export-pending, and rejected purchase-failure sections', () => {
        const empty = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, emptySettled('paywall'));
        const exportPending = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, {
            ...emptySettled('paywall'),
            purchase_failures: fulfilled({ rows: [], checkedAtMs: NOW, exportPending: true }),
        });
        const rejectedRead = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request({ scope: 'paywall' }), NOW, {
            ...emptySettled('paywall'),
            purchase_failures: rejected('private BigQuery project/table and billing error'),
        });
        expect(empty.sections.purchaseFailures).toEqual({
            rows: [], status: 'empty', coverage: 'complete', limitations: [],
        });
        expect(exportPending.sections.purchaseFailures).toEqual({
            rows: [],
            status: 'unavailable',
            coverage: 'unavailable',
            limitations: ['analytics_export_pending'],
        });
        expect(rejectedRead.sections.purchaseFailures).toEqual({
            rows: [],
            status: 'unavailable',
            coverage: 'unavailable',
            limitations: ['source_unavailable'],
        });
        const serialized = [empty, exportPending, rejectedRead]
            .map((response) => JSON.stringify(response.sections.purchaseFailures));
        expect(new Set(serialized).size).toBe(3);
        expect(serialized.join(' ')).not.toMatch(/private BigQuery|project\/table|billing error/);
    });
    test('preserves series definition/source/unit/status/coverage/limitations and point shapes', () => {
        const response = (0, admin_analytics_trends_1.composeAdminAnalyticsTrendsResponse)(request(), NOW, emptySettled());
        const series = response.sections.behavioralPaywall.series[0];
        expect(response.state).toBe('empty');
        expect(series).toEqual(expect.objectContaining({
            metricId: expect.any(String),
            definition: expect.objectContaining({ entity: expect.any(String), description: expect.any(String) }),
            source: 'paywall_funnel',
            unit: 'count',
            status: 'empty',
            coverage: 'complete',
            limitations: expect.any(Array),
            points: expect.arrayContaining([expect.objectContaining({ bucketStart: expect.any(String), value: 0 })]),
            previousPoints: expect.any(Array),
        }));
    });
});
describe('execution isolation and normalized response cache', () => {
    test('keeps combined time-series range separate from the current-only failure range', async () => {
        const calls = {};
        let paywallRange = null;
        let failureRange = null;
        const readers = {
            ...makeReaders(calls),
            paywall: async (context) => {
                calls.paywall = (calls.paywall ?? 0) + 1;
                paywallRange = { fromMs: context.fromMs, currentFromMs: context.currentFromMs };
                return read([]);
            },
            purchase_failures: async (context) => {
                calls.purchase_failures = (calls.purchase_failures ?? 0) + 1;
                failureRange = { fromMs: context.fromMs, currentFromMs: context.currentFromMs };
                return { rows: [], checkedAtMs: NOW, exportPending: false };
            },
        };
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({
            scope: 'paywall',
            fromDate: '2026-07-11',
            toDate: '2026-07-13',
            comparePrevious: true,
        }, NOW, readers);
        expect(paywallRange).toEqual({
            fromMs: Date.UTC(2026, 6, 8),
            currentFromMs: Date.UTC(2026, 6, 11),
        });
        expect(failureRange).toEqual(paywallRange);
    });
    test('overview skips shards and BigQuery purchase-failure work', async () => {
        const calls = {};
        const response = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, makeReaders(calls));
        expect(response.state).toBe('empty');
        expect(calls).toEqual({ paywall: 1, premium_event_time: 1, premium_created_at: 1 });
        expect(response.sections.shardPurchases.series).toEqual([]);
        expect(response.sections.purchaseFailures.rows).toEqual([]);
    });
    test('normalization-equivalent input shares a cache entry while scope remains isolated', async () => {
        const calls = {};
        const readers = makeReaders(calls);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({
            scope: 'overview', presetDays: 28, granularity: 'day', comparePrevious: false, filters: {},
        }, NOW + 1, readers);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'paywall' }, NOW + 2, readers);
        expect(calls.paywall).toBe(2);
        expect(calls.premium_event_time).toBe(2);
        expect(calls.premium_created_at).toBe(2);
        expect(calls.shards).toBe(1);
        expect(calls.purchase_failures).toBe(1);
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsCacheSizeForTests)()).toBe(2);
    });
    test('expires entries after ten minutes', async () => {
        const calls = {};
        const readers = makeReaders(calls);
        expect(admin_analytics_trends_1.CACHE_TTL_MS).toBe(10 * 60 * 1000);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + admin_analytics_trends_1.CACHE_TTL_MS - 1, readers);
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + admin_analytics_trends_1.CACHE_TTL_MS + 1, readers);
        expect(calls.paywall).toBe(2);
    });
    test('does not cache partial responses so a recovered source is retried immediately', async () => {
        const calls = {};
        const readers = {
            ...makeReaders(calls),
            paywall: async () => {
                calls.paywall = (calls.paywall ?? 0) + 1;
                throw new Error('temporary private failure');
            },
        };
        const first = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        const second = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + 1, readers);
        expect(first.state).toBe('partial');
        expect(second.state).toBe('partial');
        expect(calls.paywall).toBe(2);
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsCacheSizeForTests)()).toBe(0);
    });
    test('coalesces concurrent normalized-equivalent misses into one reader fan-out', async () => {
        const calls = {};
        const gate = deferred();
        const readers = {
            ...makeReaders(calls),
            paywall: async () => {
                calls.paywall = (calls.paywall ?? 0) + 1;
                return gate.promise;
            },
        };
        const first = (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        const second = (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({
            scope: 'overview', presetDays: 28, granularity: 'day', comparePrevious: false, filters: {},
        }, NOW + 1, readers);
        await Promise.resolve();
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsInFlightSizeForTests)()).toBe(1);
        gate.resolve(read([]));
        const [firstResponse, secondResponse] = await Promise.all([first, second]);
        expect(firstResponse).toBe(secondResponse);
        expect(calls).toEqual({ paywall: 1, premium_event_time: 1, premium_created_at: 1 });
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsInFlightSizeForTests)()).toBe(0);
    });
    test('cleans a partial in-flight result and retries it after the shared promise settles', async () => {
        const calls = {};
        const gate = deferred();
        const readers = {
            ...makeReaders(calls),
            paywall: async () => {
                calls.paywall = (calls.paywall ?? 0) + 1;
                return gate.promise;
            },
        };
        const first = (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        const second = (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, readers);
        gate.reject(new Error('private transient failure'));
        const shared = await Promise.all([first, second]);
        expect(shared.every((response) => response.state === 'partial')).toBe(true);
        expect(calls.paywall).toBe(1);
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsInFlightSizeForTests)()).toBe(0);
        const recovered = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + 1, makeReaders(calls));
        expect(recovered.state).toBe('empty');
        expect(calls.paywall).toBe(2);
    });
    test('rejects the 25th unique in-flight key before starting any of its readers', async () => {
        const calls = {};
        const gate = deferred();
        const readers = {
            ...makeReaders(calls),
            paywall: async () => {
                calls.paywall = (calls.paywall ?? 0) + 1;
                if (calls.paywall > admin_analytics_trends_1.CACHE_MAX_ENTRIES)
                    throw new Error('guard did not run before reader');
                return gate.promise;
            },
        };
        const inputs = Array.from({ length: admin_analytics_trends_1.CACHE_MAX_ENTRIES + 1 }, (_, index) => {
            const day = new Date(Date.UTC(2026, 4, 1) + index * admin_analytics_trends_core_1.DAY_MS).toISOString().slice(0, 10);
            return { scope: 'overview', fromDate: day, toDate: day };
        });
        const pending = inputs.slice(0, admin_analytics_trends_1.CACHE_MAX_ENTRIES)
            .map((input) => (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(input, NOW, readers));
        await Promise.resolve();
        const overflow = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(inputs[admin_analytics_trends_1.CACHE_MAX_ENTRIES], NOW, readers).then(() => null, (error) => error);
        expect(overflow).toBeInstanceOf(https_1.HttpsError);
        expect(overflow.code).toBe('resource-exhausted');
        expect(overflow.message).toBe('Too many analytics trend requests are in progress.');
        expect(calls.paywall).toBe(admin_analytics_trends_1.CACHE_MAX_ENTRIES);
        expect(calls.premium_event_time).toBe(admin_analytics_trends_1.CACHE_MAX_ENTRIES);
        expect(calls.premium_created_at).toBe(admin_analytics_trends_1.CACHE_MAX_ENTRIES);
        gate.resolve(read([]));
        await Promise.all(pending);
    });
    test('reset clears cache and in-flight state without allowing an older result to overwrite newer data', async () => {
        const oldCalls = {};
        const oldGate = deferred();
        const oldReaders = {
            ...makeReaders(oldCalls),
            paywall: async () => {
                oldCalls.paywall = (oldCalls.paywall ?? 0) + 1;
                return oldGate.promise;
            },
        };
        const oldRequest = (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW, oldReaders);
        await Promise.resolve();
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsInFlightSizeForTests)()).toBe(1);
        (0, admin_analytics_trends_1._resetAdminAnalyticsTrendsCacheForTests)();
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsCacheSizeForTests)()).toBe(0);
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsInFlightSizeForTests)()).toBe(0);
        const newCalls = {};
        const newer = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + 1, makeReaders(newCalls));
        expect(newer.generatedAtMs).toBe(NOW + 1);
        oldGate.resolve(read([]));
        await oldRequest;
        const unexpectedReads = {};
        const cached = await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)({ scope: 'overview' }, NOW + 2, makeReaders(unexpectedReads));
        expect(cached.generatedAtMs).toBe(NOW + 1);
        expect(unexpectedReads).toEqual({});
    });
    test('keeps at most 24 true-LRU entries and the 25th evicts the least recently used', async () => {
        const calls = {};
        const readers = makeReaders(calls);
        expect(admin_analytics_trends_1.CACHE_MAX_ENTRIES).toBe(24);
        const inputs = Array.from({ length: admin_analytics_trends_1.CACHE_MAX_ENTRIES + 1 }, (_, index) => {
            const day = new Date(Date.UTC(2026, 4, 1) + index * admin_analytics_trends_core_1.DAY_MS).toISOString().slice(0, 10);
            return { scope: 'overview', fromDate: day, toDate: day };
        });
        for (const input of inputs.slice(0, admin_analytics_trends_1.CACHE_MAX_ENTRIES)) {
            await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(input, NOW, readers);
        }
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(inputs[0], NOW + 1, readers); // touch first
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(inputs[admin_analytics_trends_1.CACHE_MAX_ENTRIES], NOW + 2, readers);
        const beforeMiss = calls.paywall;
        await (0, admin_analytics_trends_1.executeAdminAnalyticsTrends)(inputs[1], NOW + 3, readers);
        expect((0, admin_analytics_trends_1._adminAnalyticsTrendsCacheSizeForTests)()).toBe(admin_analytics_trends_1.CACHE_MAX_ENTRIES);
        expect(calls.paywall).toBe((beforeMiss ?? 0) + 1);
    });
});
//# sourceMappingURL=admin_analytics_trends.test.js.map