"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_analytics_trends_core_1 = require("./admin_analytics_trends_core");
const NOW = Date.UTC(2026, 6, 13, 12);
describe('extractPaywallFailureBreakdown', () => {
    test('returns only bounded failure groups from conversion failure rows', () => {
        const result = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)([
            {
                row_kind: 'conversion_failure',
                payload: JSON.stringify({ reason: 'network_error', events: 4, app_instances: 3 }),
            },
            {
                row_kind: 'conversion_failure',
                payload: JSON.stringify({ reason: 'unexpected_raw_message', events: 2 }),
            },
        ]);
        expect(result).toEqual([
            { id: 'network_error', events: 4, appInstances: 3 },
            { id: 'legacy_or_other', events: 2, appInstances: 0 },
        ]);
    });
    test('ignores malformed payloads and unrelated row kinds without serializing raw diagnostics', () => {
        const result = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)([
            { row_kind: 'conversion_failure', payload: '{malformed' },
            { row_kind: 'conversion_failure', payload: JSON.stringify(['network_error']) },
            { row_kind: 'conversion_failure', payload: JSON.stringify('network_error') },
            {
                row_kind: 'conversion_context',
                payload: JSON.stringify({ reason: 'network_error', events: 99, app_instances: 99 }),
            },
            {
                row_kind: 'conversion_failure',
                payload: JSON.stringify({
                    reason: 'Card declined: 4111 1111 1111 1111',
                    message: 'gateway-secret-message',
                    error: 'raw-sdk-error',
                    events: 2,
                    app_instances: 1,
                }),
            },
        ]);
        expect(result).toEqual([
            { id: 'legacy_or_other', events: 2, appInstances: 1 },
        ]);
        expect(JSON.stringify(result)).not.toMatch(/4111|gateway-secret-message|raw-sdk-error|Card declined/);
    });
    test('aggregates duplicate allowed and unknown reasons into their final safe ids', () => {
        const result = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)([
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'network_error', events: 2, app_instances: 1 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'network_error', events: 3, app_instances: 2 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'private-provider-error', events: 4, app_instances: 1 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: '', events: 1, app_instances: 2 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'unknown', events: 1, app_instances: 1 }) },
        ]);
        expect(result).toEqual([
            { id: 'legacy_or_other', events: 5, appInstances: 3 },
            { id: 'network_error', events: 5, appInstances: 3 },
            { id: 'unknown', events: 1, appInstances: 1 },
        ]);
    });
    test('normalizes invalid numbers to zero and safely caps aggregate overflow', () => {
        const result = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)([
            {
                row_kind: 'conversion_failure',
                payload: JSON.stringify({
                    reason: 'network_error',
                    events: Number.MAX_SAFE_INTEGER,
                    app_instances: Number.MAX_SAFE_INTEGER,
                }),
            },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'network_error', events: 1, app_instances: 1 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'payment_error', events: -1, app_instances: 1.5 }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'store_error', events: 2 ** 53, app_instances: '3' }) },
            { row_kind: 'conversion_failure', payload: JSON.stringify({ reason: 'configuration_error', events: null, app_instances: null }) },
        ]);
        expect(result).toEqual([
            {
                id: 'network_error',
                events: Number.MAX_SAFE_INTEGER,
                appInstances: Number.MAX_SAFE_INTEGER,
            },
            { id: 'configuration_error', events: 0, appInstances: 0 },
            { id: 'payment_error', events: 0, appInstances: 0 },
            { id: 'store_error', events: 0, appInstances: 0 },
        ]);
        expect(result.every((row) => (Number.isSafeInteger(row.events)
            && row.events >= 0
            && Number.isSafeInteger(row.appInstances)
            && row.appInstances >= 0))).toBe(true);
    });
    test('sorts deterministically, stays bounded, and freezes the public result', () => {
        const allowedReasons = [
            'identity_sync',
            'no_active_entitlement_after_purchase',
            'payment_pending',
            'network_error',
            'payment_error',
            'store_error',
            'configuration_error',
            'sdk_other',
            'unknown',
            'legacy_or_other',
        ];
        const result = (0, admin_analytics_trends_core_1.extractPaywallFailureBreakdown)(allowedReasons.map((reason) => ({
            row_kind: 'conversion_failure',
            payload: JSON.stringify({ reason, events: 3, app_instances: 1 }),
        })));
        expect(result.map((row) => row.id)).toEqual([...allowedReasons].sort());
        expect(result).toHaveLength(10);
        expect(result.length).toBeLessThanOrEqual(20);
        expect(Object.isFrozen(result)).toBe(true);
        expect(result.every(Object.isFrozen)).toBe(true);
    });
});
describe('normalizeTrendRequest', () => {
    test('defaults to the inclusive 28-day preset with safe query defaults', () => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview' }, NOW);
        expect(result).toEqual({
            scope: 'overview',
            presetDays: 28,
            fromDate: '2026-06-16',
            toDate: '2026-07-13',
            granularity: 'day',
            comparePrevious: false,
            filters: {},
        });
    });
    test.each([{ presetDays: 7 }, { presetDays: 28 }, { presetDays: 90 }])('accepts the bounded $presetDays-day preset', ({ presetDays }) => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'paywall', presetDays }, NOW);
        expect(result.presetDays).toBe(presetDays);
        expect(Date.parse(`${result.fromDate}T00:00:00.000Z`))
            .toBe(Date.UTC(2026, 6, 13) - (presetDays - 1) * admin_analytics_trends_core_1.DAY_MS);
        expect(result.toDate).toBe('2026-07-13');
    });
    test('requires a supported scope and a supported preset', () => {
        expect(() => (0, admin_analytics_trends_core_1.normalizeTrendRequest)({}, NOW)).toThrow(admin_analytics_trends_core_1.TrendValidationError);
        expect(() => (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'users' }, NOW)).toThrow(admin_analytics_trends_core_1.TrendValidationError);
        expect(() => (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview', presetDays: 14 }, NOW)).toThrow(admin_analytics_trends_core_1.TrendValidationError);
    });
    test('accepts strict inclusive UTC custom dates and explicit comparison settings', () => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({
            scope: 'paywall',
            fromDate: '2026-07-01',
            toDate: '2026-07-13',
            granularity: 'week',
            comparePrevious: true,
        }, NOW);
        expect(result).toMatchObject({
            presetDays: null,
            fromDate: '2026-07-01',
            toDate: '2026-07-13',
            granularity: 'week',
            comparePrevious: true,
        });
        expect((0, admin_analytics_trends_core_1.buildTrendWindow)(result).current).toEqual({
            fromMs: Date.UTC(2026, 6, 1),
            toMs: Date.UTC(2026, 6, 13),
        });
    });
    test('accepts 0001-01-01 as the minimum supported custom date', () => {
        expect((0, admin_analytics_trends_core_1.normalizeTrendRequest)({
            scope: 'overview',
            fromDate: '0001-01-01',
            toDate: '0001-01-01',
        }, NOW)).toMatchObject({
            presetDays: null,
            fromDate: '0001-01-01',
            toDate: '0001-01-01',
        });
    });
    test.each([
        { granularity: 'month' },
        { comparePrevious: 'true' },
        { filters: [] },
    ])('rejects malformed structural request fields: %p', (invalid) => {
        expect(() => (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview', ...invalid }, NOW))
            .toThrow(admin_analytics_trends_core_1.TrendValidationError);
    });
    test.each([
        { fromDate: '2026-7-01', toDate: '2026-07-13' },
        { fromDate: '2026-02-30', toDate: '2026-07-13' },
        { fromDate: '2026-07-01T00:00:00Z', toDate: '2026-07-13' },
        { fromDate: '0000-01-01', toDate: '0001-01-01' },
        { fromDate: '2026-07-01' },
    ])('rejects non-strict or incomplete custom dates: %p', (range) => {
        expect(() => (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview', ...range }, NOW))
            .toThrow(admin_analytics_trends_core_1.TrendValidationError);
    });
    test.each([
        { fromDate: '2026-07-01', toDate: '2026-07-14', field: 'toDate' },
        { fromDate: '2026-07-13', toDate: '2026-07-12', field: 'fromDate' },
        { fromDate: '2026-04-14', toDate: '2026-07-13', field: 'fromDate' },
    ])('rejects future, reversed, and over-90-day ranges: %p', ({ fromDate, toDate, field }) => {
        try {
            (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview', fromDate, toDate }, NOW);
            throw new Error('expected validation to fail');
        }
        catch (error) {
            expect(error).toBeInstanceOf(admin_analytics_trends_core_1.TrendValidationError);
            expect(error).toMatchObject({ code: 'invalid-argument', field });
        }
    });
    test('does not silently support the old range aliases', () => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({
            scope: 'overview',
            preset: 7,
            from: '2026-07-01',
            to: '2026-07-02',
        }, NOW);
        expect(result).toMatchObject({
            presetDays: 28,
            fromDate: '2026-06-16',
            toDate: '2026-07-13',
        });
    });
    test('keeps only allowlisted valid filters and ignores unknown or invalid enum values', () => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({
            scope: 'paywall',
            unknownRoot: 'ignored',
            filters: {
                context: '  onboarding  ',
                variant: 'D',
                plan: 'weekly',
                store: 'STEAM',
                productId: '  premium.yearly  ',
                platform: 'web',
                secret: 'ignored',
            },
        }, NOW);
        expect(result.filters).toEqual({
            context: 'onboarding',
            productId: 'premium.yearly',
        });
        expect(result).not.toHaveProperty('unknownRoot');
    });
    test('accepts every filter enum from the public allowlist', () => {
        for (const variant of ['A', 'B', 'C']) {
            expect((0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'paywall', filters: { variant } }, NOW).filters)
                .toEqual({ variant });
        }
        for (const plan of ['monthly', 'yearly', 'lifetime']) {
            expect((0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'paywall', filters: { plan } }, NOW).filters)
                .toEqual({ plan });
        }
        for (const store of ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL']) {
            expect((0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'paywall', filters: { store } }, NOW).filters)
                .toEqual({ store });
        }
        for (const platform of ['ios', 'android']) {
            expect((0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'paywall', filters: { platform } }, NOW).filters)
                .toEqual({ platform });
        }
    });
    test.each([
        { filters: { context: 'x'.repeat(41) }, field: 'filters.context' },
        { filters: { productId: 'x'.repeat(121) }, field: 'filters.productId' },
        { filters: { context: { nested: true } }, field: 'filters.context' },
    ])('throws a typed validation error for malformed bounded strings: %p', ({ filters, field }) => {
        try {
            (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview', filters }, NOW);
            throw new Error('expected validation to fail');
        }
        catch (error) {
            expect(error).toBeInstanceOf(admin_analytics_trends_core_1.TrendValidationError);
            expect(error).toMatchObject({ code: 'invalid-argument', field });
            expect(error.name).toBe('TrendValidationError');
        }
    });
    test('returns immutable request and filter objects', () => {
        const result = (0, admin_analytics_trends_core_1.normalizeTrendRequest)({ scope: 'overview' }, NOW);
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.filters)).toBe(true);
    });
});
describe('UTC trend periods and buckets', () => {
    test('normalizes timestamps to UTC day starts', () => {
        expect((0, admin_analytics_trends_core_1.startOfUtcDay)(Date.UTC(2026, 6, 13, 23, 59, 59, 999)))
            .toBe(Date.UTC(2026, 6, 13));
        expect((0, admin_analytics_trends_core_1.startOfUtcDay)(Date.parse('0006-07-13T23:59:59.999Z')))
            .toBe(Date.parse('0006-07-13T00:00:00.000Z'));
    });
    test.each([
        Number.MAX_VALUE,
        8640000000000001,
        -8640000000000001,
    ])('rejects finite timestamps outside the JavaScript TimeClip range: %p', (timestamp) => {
        expect(() => (0, admin_analytics_trends_core_1.startOfUtcDay)(timestamp)).toThrow(admin_analytics_trends_core_1.TrendValidationError);
        expect(() => (0, admin_analytics_trends_core_1.startOfUtcWeek)(timestamp)).toThrow(admin_analytics_trends_core_1.TrendValidationError);
    });
    test.each([
        [Date.UTC(2026, 6, 13, 12), Date.UTC(2026, 6, 13)],
        [Date.UTC(2026, 6, 12, 12), Date.UTC(2026, 6, 6)],
        [Date.UTC(2026, 6, 15, 12), Date.UTC(2026, 6, 13)],
    ])('starts UTC weeks on Monday', (input, expected) => {
        expect((0, admin_analytics_trends_core_1.startOfUtcWeek)(input)).toBe(expected);
    });
    test('builds an adjacent previous window with the same inclusive length', () => {
        const window = (0, admin_analytics_trends_core_1.buildTrendWindow)({
            fromDate: '2026-07-01',
            toDate: '2026-07-13',
            comparePrevious: true,
        });
        expect(window).toEqual({
            current: { fromMs: Date.UTC(2026, 6, 1), toMs: Date.UTC(2026, 6, 13) },
            previous: { fromMs: Date.UTC(2026, 5, 18), toMs: Date.UTC(2026, 5, 30) },
        });
        for (const timestamp of [
            window.current.fromMs,
            window.current.toMs,
            window.previous.fromMs,
            window.previous.toMs,
        ]) {
            expect(Number.isFinite(timestamp)).toBe(true);
            expect(new Date(timestamp).getTime()).toBe(timestamp);
        }
    });
    test('omits the previous window when comparison is disabled', () => {
        expect((0, admin_analytics_trends_core_1.buildTrendWindow)({
            fromDate: '2026-07-01',
            toDate: '2026-07-13',
            comparePrevious: false,
        }).previous).toBeNull();
    });
    test('rejects a previous window that would cross below 0001-01-01 UTC', () => {
        try {
            (0, admin_analytics_trends_core_1.buildTrendWindow)({
                fromDate: '0001-01-01',
                toDate: '0001-01-07',
                comparePrevious: true,
            });
            throw new Error('expected validation to fail');
        }
        catch (error) {
            expect(error).toBeInstanceOf(admin_analytics_trends_core_1.TrendValidationError);
            expect(error).toMatchObject({ field: 'previous.fromDate' });
        }
    });
    test('returns ordered daily bucket starts intersecting the current window', () => {
        expect((0, admin_analytics_trends_core_1.bucketStarts)({ fromMs: Date.UTC(2026, 6, 11), toMs: Date.UTC(2026, 6, 13) }, 'day')).toEqual([
            Date.UTC(2026, 6, 11),
            Date.UTC(2026, 6, 12),
            Date.UTC(2026, 6, 13),
        ]);
    });
    test('includes the Monday bucket that intersects a mid-week range', () => {
        const window = (0, admin_analytics_trends_core_1.buildTrendWindow)({
            fromDate: '2026-07-01',
            toDate: '2026-07-13',
            comparePrevious: true,
        });
        expect((0, admin_analytics_trends_core_1.bucketStarts)(window.current, 'week')).toEqual([
            Date.UTC(2026, 5, 29),
            Date.UTC(2026, 6, 6),
            Date.UTC(2026, 6, 13),
        ]);
    });
    test('rejects invalid range timestamps instead of returning empty buckets', () => {
        expect(() => (0, admin_analytics_trends_core_1.bucketStarts)({
            fromMs: Number.MAX_VALUE,
            toMs: Number.MAX_VALUE,
        }, 'day')).toThrow(admin_analytics_trends_core_1.TrendValidationError);
    });
});
function customRequest(overrides = {}) {
    return (0, admin_analytics_trends_core_1.normalizeTrendRequest)({
        scope: 'overview',
        fromDate: '2026-07-10',
        toDate: '2026-07-13',
        ...overrides,
    }, NOW);
}
function sourceHealth(overrides = {}) {
    return {
        state: 'ready',
        truncated: false,
        uncertaintyStartsAtMs: null,
        latestAtMs: Date.UTC(2026, 6, 13, 10),
        checkedAtMs: NOW,
        ...overrides,
    };
}
function pointValues(series) {
    return series.points.map((point) => point.value);
}
function metric(series, metricId) {
    const found = series.find((candidate) => candidate.metricId === metricId);
    if (!found)
        throw new Error(`Missing metric ${metricId}`);
    return found;
}
describe('honest paywall trends', () => {
    test('can skip breakdown aggregation without changing count series', () => {
        const rows = [
            {
                step: 'shown',
                ts: Date.UTC(2026, 6, 13, 1),
                context: 'must-not-be-aggregated',
                variant: 'A',
                plan: 'monthly',
            },
        ];
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)(rows, customRequest(), sourceHealth(), { includeBreakdowns: false });
        expect(metric(result.countSeries, 'paywall.shown.v1').points)
            .toContainEqual({ bucketStart: '2026-07-13', value: 1 });
        expect(result.breakdowns).toEqual({ context: [], variant: [], plan: [] });
        expect(JSON.stringify(result.breakdowns)).not.toContain('must-not-be-aggregated');
    });
    test('counts every stored step independently and excludes dev rows', () => {
        const steps = [
            'shown',
            'cta_click',
            'trial_started',
            'purchase_completed',
            'purchase_failed',
            'purchase_cancelled',
            'restore_completed',
            'close',
        ];
        const rows = steps.map((step) => ({
            step,
            ts: Date.UTC(2026, 6, 13, 1),
            context: 'offer',
            variant: 'A',
            plan: 'monthly',
        }));
        rows.push({
            step: 'shown',
            ts: Date.UTC(2026, 6, 13, 2),
            context: 'offer',
            variant: 'A',
            plan: 'monthly',
            dev: true,
        });
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)(rows, customRequest(), sourceHealth());
        expect(result.countSeries).toHaveLength(8);
        for (const step of steps) {
            const series = metric(result.countSeries, `paywall.${step}.v1`);
            expect(pointValues(series)).toEqual([0, 0, 0, 1]);
            expect(series.definition.entity).toBe('event');
            expect(series.unit).toBe('count');
            expect(series.source).toBe('paywall_funnel');
        }
        expect(result.excluded.dev).toBe(1);
        expect(result.moneySeries).toEqual([]);
    });
    test('returns deterministic capped context/variant/plan breakdowns with an other tail only', () => {
        const rows = Array.from({ length: 22 }, (_, index) => ({
            step: 'shown',
            ts: Date.UTC(2026, 6, 13, 1),
            context: `context-${String(index).padStart(2, '0')}`,
            variant: index % 2 ? 'B' : 'A',
            plan: index % 2 ? 'yearly' : 'monthly',
            source: 'must-not-be-exposed',
            platform: 'must-not-be-exposed',
        }));
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)(rows, customRequest(), sourceHealth());
        expect(result.breakdowns.context).toHaveLength(20);
        expect(result.breakdowns.context.slice(0, 19).map((row) => row.value)).toEqual(Array.from({ length: 19 }, (_, index) => `context-${String(index).padStart(2, '0')}`));
        expect(result.breakdowns.context[19]).toEqual({ value: 'other', events: 3 });
        expect(result.breakdowns.variant).toEqual([
            { value: 'A', events: 11 },
            { value: 'B', events: 11 },
        ]);
        expect(result.breakdowns.plan).toEqual([
            { value: 'monthly', events: 11 },
            { value: 'yearly', events: 11 },
        ]);
        expect(result.breakdowns).not.toHaveProperty('source');
        expect(result.breakdowns).not.toHaveProperty('platform');
    });
    test('merges a real context named other into the synthetic capped tail', () => {
        const rows = [
            ...Array.from({ length: 21 }, (_, index) => ({
                step: 'shown',
                ts: Date.UTC(2026, 6, 13, 1),
                context: `context-${String(index).padStart(2, '0')}`,
            })),
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 2), context: 'other' },
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 3), context: 'other' },
        ];
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)(rows, customRequest(), sourceHealth());
        const otherRows = result.breakdowns.context.filter((row) => row.value === 'other');
        expect(result.breakdowns.context).toHaveLength(20);
        expect(otherRows).toEqual([{ value: 'other', events: 4 }]);
    });
    test('keeps 160-character public breakdown values and collapses longer raw values into other', () => {
        const exact = 'x'.repeat(160);
        const rawLongA = 'a'.repeat(161);
        const rawLongB = 'b'.repeat(162);
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 1), context: exact, variant: exact, plan: exact },
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 2), context: rawLongA, variant: rawLongA, plan: rawLongA },
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 3), context: rawLongB, variant: rawLongB, plan: rawLongB },
            { step: 'shown', ts: Date.UTC(2026, 6, 13, 4), context: 'other', variant: 'other', plan: 'other' },
        ], customRequest(), sourceHealth());
        for (const rows of [result.breakdowns.context, result.breakdowns.variant, result.breakdowns.plan]) {
            expect(rows).toEqual([
                { value: 'other', events: 3 },
                { value: exact, events: 1 },
            ]);
            expect(rows.every((row) => row.value.length <= 160)).toBe(true);
        }
        expect(JSON.stringify(result.breakdowns)).not.toContain(rawLongA);
        expect(JSON.stringify(result.breakdowns)).not.toContain(rawLongB);
    });
    test('applies only stored paywall filters and keeps previous points separate', () => {
        const request = customRequest({
            fromDate: '2026-07-07',
            toDate: '2026-07-13',
            granularity: 'week',
            comparePrevious: true,
            filters: { context: 'kept', store: 'APP_STORE', platform: 'ios' },
        });
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([
            { step: 'shown', ts: Date.UTC(2026, 6, 8), context: 'kept' },
            { step: 'shown', ts: Date.UTC(2026, 5, 30), context: 'kept' },
            { step: 'shown', ts: Date.UTC(2026, 6, 9), context: 'filtered-out' },
            { step: 'shown', context: 'kept' },
            { step: 'shown', ts: 'not-a-date', context: 'kept' },
        ], request, sourceHealth());
        const shown = metric(result.countSeries, 'paywall.shown.v1');
        expect(shown.points).toEqual([
            { bucketStart: '2026-07-06', value: 1 },
            { bucketStart: '2026-07-13', value: 0 },
        ]);
        expect(shown.previousPoints).toEqual([
            { bucketStart: '2026-06-29', value: 1 },
            { bucketStart: '2026-07-06', value: 0 },
        ]);
        expect(result.excluded).toMatchObject({ filtered: 1, undated: 1, invalidTimestamp: 1 });
    });
});
describe('honest RevenueCat and shard trends', () => {
    test('deduplicates production store events and keeps lifecycle outcomes separate', () => {
        const at = Date.UTC(2026, 6, 13, 1);
        const result = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([
            { eventId: 'trial-secret', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly' },
            { eventId: 'trial-secret', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly' },
            { eventId: 'renew-secret', eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly' },
            { eventId: 'refund-secret', eventType: 'REFUND', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly', grossUsdMicros: -2000000 },
            { eventId: 'billing-secret', eventType: 'BILLING_ISSUE', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly' },
            { eventId: 'expiration-secret', eventType: 'EXPIRATION', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'premium.monthly' },
            { eventId: 'sandbox-secret', eventType: 'INITIAL_PURCHASE', periodType: 'TRIAL', environment: 'SANDBOX', eventTimestampMs: at },
        ], customRequest({ filters: { context: 'ignored', store: 'APP_STORE', productId: 'premium.monthly' } }), sourceHealth());
        expect(pointValues(metric(result.countSeries, 'store.confirmed_trial_start.v1'))).toEqual([0, 0, 0, 1]);
        expect(pointValues(metric(result.countSeries, 'store.initial_purchase.v1'))).toEqual([0, 0, 0, 1]);
        expect(pointValues(metric(result.countSeries, 'store.renewal.v1'))).toEqual([0, 0, 0, 1]);
        expect(pointValues(metric(result.countSeries, 'store.refund.v1'))).toEqual([0, 0, 0, 1]);
        expect(pointValues(metric(result.countSeries, 'store.billing_issue.v1'))).toEqual([0, 0, 0, 1]);
        expect(pointValues(metric(result.countSeries, 'store.expiration.v1'))).toEqual([0, 0, 0, 1]);
        expect(result.excluded).toMatchObject({ duplicates: 1, sandbox: 1 });
        expect(result.countSeries.every((series) => series.unit === 'count')).toBe(true);
        expect(JSON.stringify(result)).not.toMatch(/trial-secret|renew-secret|transactionId|eventId|dedupe/i);
    });
    test('keeps signed gross money field-complete and outside all count series', () => {
        const result = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([
            { eventId: 'd1-buy', eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 10, 1), grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventId: 'd1-refund', eventType: 'REFUND', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 10, 2), grossUsdMicros: -2000000, financialCoverage: 'complete' },
            { eventId: 'd2-buy', eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 11, 1), estimatedProceedsUsdMicros: 7000000, financialCoverage: 'partial' },
            { eventId: 'd3-buy', eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 12, 1), grossUsdMicros: 5000000, financialCoverage: 'complete' },
            { eventId: 'd3-refund', eventType: 'REFUND', environment: 'PRODUCTION', eventTimestampMs: Date.UTC(2026, 6, 12, 2), financialCoverage: 'unavailable' },
        ], customRequest(), sourceHealth());
        const gross = metric(result.moneySeries, 'revenue.gross_usd_micros.v1');
        expect(pointValues(gross)).toEqual([8000000, null, null, 0]);
        expect(gross).toMatchObject({ unit: 'usd_micros', coverage: 'partial', status: 'partial' });
        expect(gross.definition.entity).toBe('usd_micros');
        expect(result.countSeries.some((series) => series.unit === 'usd_micros')).toBe(false);
        expect(pointValues(metric(result.countSeries, 'store.refund.v1'))).toEqual([1, 0, 1, 0]);
    });
    test('marks an unsafe gross bucket total partial instead of returning an imprecise number', () => {
        const at = Date.UTC(2026, 6, 13, 1);
        const result = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([
            { eventId: 'safe-a', eventType: 'INITIAL_PURCHASE', environment: 'PRODUCTION', eventTimestampMs: at, grossUsdMicros: Number.MAX_SAFE_INTEGER },
            { eventId: 'safe-b', eventType: 'RENEWAL', environment: 'PRODUCTION', eventTimestampMs: at, grossUsdMicros: 1 },
        ], customRequest(), sourceHealth());
        const gross = metric(result.moneySeries, 'revenue.gross_usd_micros.v1');
        expect(pointValues(gross)).toEqual([0, 0, 0, null]);
        expect(gross).toMatchObject({ status: 'partial', coverage: 'partial' });
        expect(result.excluded.unsafeGrossTotalBuckets).toBe(1);
        expect(JSON.stringify(result)).not.toContain(String(Number.MAX_SAFE_INTEGER));
    });
    test('excludes empty and unsupported nonempty RevenueCat event types explicitly', () => {
        const result = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([
            {
                eventId: 'unsupported-secret',
                eventType: 'TEMPORARY_ENTITLEMENT_GRANT',
                environment: 'PRODUCTION',
                eventTimestampMs: Date.UTC(2026, 6, 13, 1),
            },
            {
                eventId: 'empty-type-secret',
                eventType: '',
                environment: 'PRODUCTION',
                eventTimestampMs: Date.UTC(2026, 6, 13, 2),
            },
        ], customRequest(), sourceHealth());
        expect(result.excluded.unknownEventType).toBe(2);
        expect(result.countSeries.every((series) => pointValues(series).every((value) => value === 0)))
            .toBe(true);
        expect(JSON.stringify(result)).not.toContain('TEMPORARY_ENTITLEMENT_GRANT');
    });
    test('does not publish a TRANSFER series for premium or writer-shaped shard rows', () => {
        const premium = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([], customRequest(), sourceHealth({
            state: 'empty', latestAtMs: null,
        }));
        const shards = (0, admin_analytics_trends_core_1.aggregateShardTrends)([
            { id: 'transfer-writer-row', eventType: 'TRANSFER' },
        ], customRequest(), sourceHealth());
        expect(premium.countSeries.some((series) => series.metricId === 'store.transfer.v1')).toBe(false);
        expect(shards.countSeries.some((series) => /transfer/i.test(series.metricId))).toBe(false);
        expect(JSON.stringify(shards)).not.toContain('transfer-writer-row');
    });
    test('aggregates shard transactions as a separate production-only deduplicated source', () => {
        const at = Date.UTC(2026, 6, 13, 1);
        const result = (0, admin_analytics_trends_core_1.aggregateShardTrends)([
            { id: 'shard-secret', eventId: 'event-a', eventType: 'NON_RENEWING_PURCHASE', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'shards.small' },
            { id: 'shard-secret', eventId: 'event-b', eventType: 'NON_RENEWING_PURCHASE', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'shards.small' },
            { id: 'sandbox-secret', environment: 'SANDBOX', eventTimestampMs: at },
            { id: 'other-product', environment: 'PRODUCTION', eventTimestampMs: at, store: 'APP_STORE', productId: 'shards.large' },
        ], customRequest({ filters: { store: 'APP_STORE', productId: 'shards.small', context: 'ignored' } }), sourceHealth());
        const transactions = metric(result.countSeries, 'shards.store_transaction.v1');
        expect(pointValues(transactions)).toEqual([0, 0, 0, 1]);
        expect(transactions).toMatchObject({ source: 'revenuecat_shard_transactions', unit: 'count' });
        expect(transactions.definition.entity).toBe('transaction');
        expect(result.excluded).toMatchObject({ duplicates: 1, sandbox: 1, filtered: 1 });
        expect(JSON.stringify(result)).not.toMatch(/shard-secret|event-a|event-b|transactionId|eventId|dedupe/i);
    });
    test('deduplicates shard rows by their Firestore document transaction id', () => {
        const at = Date.UTC(2026, 6, 13, 1);
        const result = (0, admin_analytics_trends_core_1.aggregateShardTrends)([
            { id: 'tx-1', eventId: 'evt-a', environment: 'PRODUCTION', eventTimestampMs: at },
            { id: 'tx-1', eventId: 'evt-b', environment: 'PRODUCTION', eventTimestampMs: at },
        ], customRequest(), sourceHealth());
        expect(pointValues(metric(result.countSeries, 'shards.store_transaction.v1')))
            .toEqual([0, 0, 0, 1]);
        expect(result.excluded.duplicates).toBe(1);
    });
});
describe('trend completeness, freshness, and immutability', () => {
    test('uses null from an ascending truncation boundary without hiding earlier complete buckets', () => {
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([
            { step: 'shown', ts: Date.UTC(2026, 6, 11, 1) },
            { step: 'shown', ts: Date.UTC(2026, 6, 11, 2) },
        ], customRequest(), sourceHealth({
            state: 'partial',
            truncated: true,
            uncertaintyStartsAtMs: Date.UTC(2026, 6, 12, 12),
        }));
        const shown = metric(result.countSeries, 'paywall.shown.v1');
        expect(pointValues(shown)).toEqual([0, 2, null, null]);
        expect(shown).toMatchObject({ status: 'partial', coverage: 'partial' });
    });
    test('distinguishes a complete empty read from an unavailable source', () => {
        const empty = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([], customRequest(), sourceHealth({
            state: 'empty', latestAtMs: null,
        }));
        const failed = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([], customRequest(), sourceHealth({
            state: 'error', latestAtMs: null, errorCode: 'read_failed',
        }));
        expect(pointValues(metric(empty.countSeries, 'paywall.shown.v1'))).toEqual([0, 0, 0, 0]);
        expect(metric(empty.countSeries, 'paywall.shown.v1')).toMatchObject({ status: 'empty', coverage: 'complete' });
        expect(empty.health.freshness).toBe('no_events');
        expect(pointValues(metric(failed.countSeries, 'paywall.shown.v1'))).toEqual([null, null, null, null]);
        expect(metric(failed.countSeries, 'paywall.shown.v1')).toMatchObject({ status: 'unavailable', coverage: 'unavailable' });
        expect(failed.health.freshness).toBe('unknown');
    });
    test('reports stale event watermark as a hint without changing known zero buckets', () => {
        const latestAtMs = NOW - admin_analytics_trends_core_1.TREND_FRESHNESS_STALE_AFTER_MS - 1;
        const result = (0, admin_analytics_trends_core_1.aggregatePaywallTrends)([], customRequest(), sourceHealth({ latestAtMs }));
        expect(result.health).toMatchObject({
            latestAtMs,
            dataAgeMs: admin_analytics_trends_core_1.TREND_FRESHNESS_STALE_AFTER_MS + 1,
            freshness: 'stale_event_watermark',
        });
        expect(pointValues(metric(result.countSeries, 'paywall.shown.v1'))).toEqual([0, 0, 0, 0]);
    });
    test('freezes public results deeply enough for the immutable response contract', () => {
        const result = (0, admin_analytics_trends_core_1.aggregateRevenueCatTrends)([], customRequest(), sourceHealth({ state: 'empty', latestAtMs: null }));
        const series = metric(result.moneySeries, 'revenue.gross_usd_micros.v1');
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.sections)).toBe(true);
        expect(result.sections.every(Object.isFrozen)).toBe(true);
        expect(Object.isFrozen(result.countSeries)).toBe(true);
        expect(Object.isFrozen(result.moneySeries)).toBe(true);
        expect(Object.isFrozen(series)).toBe(true);
        expect(Object.isFrozen(series.definition)).toBe(true);
        expect(Object.isFrozen(series.limitations)).toBe(true);
        expect(Object.isFrozen(series.points)).toBe(true);
        expect(series.points.every(Object.isFrozen)).toBe(true);
        expect(pointValues(series)).toEqual([0, 0, 0, 0]);
    });
});
//# sourceMappingURL=admin_analytics_trends_core.test.js.map