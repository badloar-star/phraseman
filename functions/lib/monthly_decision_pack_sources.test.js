"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monthly_decision_pack_sources_1 = require("./monthly_decision_pack_sources");
const monthly_decision_pack_core_1 = require("./monthly_decision_pack_core");
describe('monthly decision pack source projection', () => {
    test('projects reporting month and baseline aggregates without raw payloads', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') });
        const input = (0, monthly_decision_pack_sources_1.buildDecisionPackAggregateInput)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            productMonthRows: [
                { row_kind: 'quality', payload: JSON.stringify({ consented_app_instances: 120, sessions: 300, screen_views: 800, data_through_micros: 1751328000000000 }) },
                { row_kind: 'review_summary', payload: JSON.stringify({ persisted_answers: 200, first_answer_accuracy: 0.7, delayed_recall_accuracy: null, consented_app_instances: 40 }) },
                { row_kind: 'review_delay', payload: JSON.stringify({ delay_bucket: 'd30_plus', accuracy: null, consented_app_instances: 20 }) },
                { row_kind: 'daily_kpi', payload: JSON.stringify({ local_date: '2026-06-01', sessions: 20, active_consented_app_instances: 12, screen_views: 80, lesson_starts: 15, lesson_completes: 10, review_answers: 30 }) },
                { row_kind: 'true_retention_day', payload: JSON.stringify({ cohort_date: '2026-06-01', eligible_d1: 20, exact_returned_d1: 8, exact_d1_rate: 0.4, eligible_d7: 20, exact_returned_d7: 5, exact_d7_rate: 0.25 }) },
                { row_kind: 'experiment_exposure', payload: JSON.stringify({ experiment_id: 'paywall_v4', definition_version: 1, variant_id: 'control', exposures: 30, consented_app_instances: 20 }) },
            ],
            productBaselineRows: [
                { row_kind: 'quality', payload: JSON.stringify({ consented_app_instances: 900, sessions: 2100, screen_views: 6000 }) },
            ],
            productExportPending: false,
            revenueMonth: { status: 'available_with_coverage_limits', watermarkMs: 1751328000000, coverage: { completeEvents: 4, partialEvents: 1, unavailableEvents: 0 }, money: { grossRevenueUsdMicros: 12000000, estimatedProceedsUsdMicros: null, distinctPaidChains: 12, arppuGrossUsdMicros: 1000000 }, trialToPaid: { eligibleTrialChains: 20, convertedTrialChains: 5, rate: 0.25 }, ltv: [{ metricId: 'revenue.subscription_chain_ltv_30d_gross_usd.v1', maturePaidChains: 10, ltvGrossUsdMicros: 2500000, maturity: 'mature' }] },
            revenueBaseline: { status: 'available_with_coverage_limits', coverage: { completeEvents: 30, partialEvents: 2, unavailableEvents: 1 }, money: { grossRevenueUsdMicros: 80000000, distinctPaidChains: 50, arppuGrossUsdMicros: 1600000 } },
            revenueTruncated: false,
            revenueRows: 40,
        });
        expect(input.sections?.executive_kpis).toEqual(expect.arrayContaining([
            expect.objectContaining({ scope: 'reporting_month', metric_id: 'consented_app_instances', value: 120 }),
            expect.objectContaining({ scope: 'baseline_12m', metric_id: 'sessions', value: 2100 }),
        ]));
        expect(input.sections?.subscriptions_revenue).toEqual(expect.arrayContaining([
            expect.objectContaining({ scope: 'reporting_month', metric_id: 'gross_revenue_usd', value_micros: 12000000 }),
            expect.objectContaining({ scope: 'baseline_12m', metric_id: 'gross_revenue_usd', value_micros: 80000000 }),
            expect.objectContaining({ scope: 'reporting_month', metric_id: 'trial_to_paid_rate', unit: 'ratio', value: 0.25, value_micros: null }),
            expect.objectContaining({ scope: 'reporting_month', metric_id: 'revenue.subscription_chain_ltv_30d_gross_usd.v1', value_micros: 2500000, denominator: 10, status: 'mature' }),
        ]));
        expect(input.sections?.subscriptions_revenue).not.toContainEqual(expect.objectContaining({ metric_id: 'estimated_proceeds_usd' }));
        expect(input.sections?.learning_outcomes).toContainEqual(expect.objectContaining({ delay_bucket: 'd30_plus', value: null, denominator: 20 }));
        expect(input.sections?.daily_timeseries).toContainEqual(expect.objectContaining({ scope: 'reporting_month', date: '2026-06-01', metric_id: 'sessions', value: 20 }));
        expect(input.sections?.retention_cohorts).toContainEqual(expect.objectContaining({ cohort: '2026-06-01', day: 7, eligible_instances: 20, returned_instances: 5, rate: 0.25 }));
        expect(JSON.stringify(input)).not.toContain('user@example.com');
        expect(input.sources.find((source) => source.id === 'feedback_support')?.status).toBe('unavailable');
        expect(input.sources.find((source) => source.id === 'revenuecat_webhooks')).toMatchObject({
            dataThroughMs: 1751328000000,
            analysisCutoffMs: window.endExclusiveMs - 1,
            queryAsOfMs: Date.parse('2026-07-13T12:00:00Z'),
        });
    });
    test('never coerces missing analytics values to a real zero', () => {
        expect((0, monthly_decision_pack_sources_1.optionalFiniteNumber)(null)).toBeNull();
        expect((0, monthly_decision_pack_sources_1.optionalFiniteNumber)(undefined)).toBeNull();
        expect((0, monthly_decision_pack_sources_1.optionalFiniteNumber)('')).toBeNull();
        expect((0, monthly_decision_pack_sources_1.optionalFiniteNumber)(false)).toBeNull();
        expect((0, monthly_decision_pack_sources_1.optionalFiniteNumber)('0')).toBe(0);
    });
    test('only treats the known missing warehouse configuration as a partial source', () => {
        expect((0, monthly_decision_pack_sources_1.isExpectedProductSourceUnavailableError)({ code: 'failed-precondition', message: 'Analytics warehouse is not configured. Set ANALYTICS_BIGQUERY_DATASET.' })).toBe(true);
        expect((0, monthly_decision_pack_sources_1.isExpectedProductSourceUnavailableError)({ code: 'internal', message: 'query failed' })).toBe(false);
    });
    test('marks capped RevenueCat input not decision grade', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') });
        const input = (0, monthly_decision_pack_sources_1.buildDecisionPackAggregateInput)({
            window, generatedAtMs: window.asOfMs, productMonthRows: [], productBaselineRows: [], productExportPending: true,
            revenueMonth: {}, revenueBaseline: {}, revenueTruncated: true, revenueRows: 10000,
        });
        expect(input.sources.find((source) => source.id === 'revenuecat_webhooks')).toMatchObject({
            status: 'truncated_not_decision_grade', reason: 'watermark_unavailable_no_observed_events', rowCount: 10000, rowCap: 10000,
        });
    });
});
//# sourceMappingURL=monthly_decision_pack_sources.test.js.map