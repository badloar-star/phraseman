"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_revenue_analytics_core_1 = require("./admin_revenue_analytics_core");
const DAY = 86400000;
const at = (iso) => Date.parse(iso);
describe('aggregateServerRevenueAnalytics', () => {
    it('calculates signed gross, estimated proceeds, refunds and ARPPU without exposing chain IDs', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventId: 'e1', eventType: 'INITIAL_PURCHASE', originalTransactionId: 'chain-secret-1', billingCadence: 'monthly', eventTimestampMs: at('2026-01-05T00:00:00Z'), grossUsdMicros: 10000000, estimatedProceedsUsdMicros: 7000000, financialCoverage: 'complete' },
            { eventId: 'e2', eventType: 'RENEWAL', originalTransactionId: 'chain-secret-1', billingCadence: 'monthly', eventTimestampMs: at('2026-02-05T00:00:00Z'), grossUsdMicros: 10000000, estimatedProceedsUsdMicros: 7000000, financialCoverage: 'complete' },
            { eventId: 'e3', eventType: 'REFUND', originalTransactionId: 'chain-secret-1', billingCadence: 'monthly', eventTimestampMs: at('2026-02-10T00:00:00Z'), grossUsdMicros: -10000000, estimatedProceedsUsdMicros: -7000000, financialCoverage: 'complete' },
            { eventId: 'e4', eventType: 'INITIAL_PURCHASE', originalTransactionId: 'chain-secret-2', billingCadence: 'yearly', eventTimestampMs: at('2026-01-10T00:00:00Z'), grossUsdMicros: 100000000, financialCoverage: 'partial' },
        ], { watermarkMs: at('2026-05-01T00:00:00Z') });
        expect(result.money).toMatchObject({
            grossRevenueUsdMicros: 110000000,
            estimatedProceedsUsdMicros: 7000000,
            positiveTransactionCount: 3,
            refundTransactionCount: 1,
            refundTransactionRate: 1 / 3,
            refundAmountRate: 10 / 120,
            distinctPaidChains: 2,
            arppuGrossUsdMicros: 55000000,
        });
        expect(result.money.finalStoreProceeds).toBe('unavailable_not_imported');
        expect(result.money.arpu).toBe('unavailable_no_aligned_population_denominator');
        expect(JSON.stringify(result)).not.toContain('chain-secret');
        expect(JSON.stringify(result)).not.toContain('e1');
    });
    it('reports trial-to-paid only for mature trial chains', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'converted', periodType: 'TRIAL', eventTimestampMs: at('2026-01-01T00:00:00Z'), expirationAtMs: at('2026-01-08T00:00:00Z'), grossUsdMicros: 0, financialCoverage: 'partial' },
            { eventType: 'RENEWAL', originalTransactionId: 'converted', eventTimestampMs: at('2026-01-08T00:00:00Z'), grossUsdMicros: 10000000, isTrialConversion: true, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'not-converted', periodType: 'TRIAL', eventTimestampMs: at('2026-01-02T00:00:00Z'), expirationAtMs: at('2026-01-09T00:00:00Z'), grossUsdMicros: 0, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'immature', periodType: 'TRIAL', eventTimestampMs: at('2026-01-25T00:00:00Z'), expirationAtMs: at('2026-02-02T00:00:00Z'), grossUsdMicros: 0, financialCoverage: 'partial' },
        ], { watermarkMs: at('2026-02-01T00:00:00Z') });
        expect(result.trialToPaid).toMatchObject({ eligibleTrialChains: 2, convertedTrialChains: 1, rate: 0.5, immatureTrialChains: 1 });
    });
    it('uses mature calendar-month cohorts for M1/M2/M3 and excludes annual rows', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'monthly-a', billingCadence: 'monthly', eventTimestampMs: at('2026-01-10T00:00:00Z'), grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventType: 'RENEWAL', originalTransactionId: 'monthly-a', billingCadence: 'monthly', eventTimestampMs: at('2026-02-10T00:00:00Z'), grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'monthly-b', billingCadence: 'monthly', eventTimestampMs: at('2026-01-20T00:00:00Z'), grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'annual', billingCadence: 'yearly', eventTimestampMs: at('2026-01-05T00:00:00Z'), grossUsdMicros: 100000000, financialCoverage: 'partial' },
        ], { watermarkMs: at('2026-05-01T00:00:00Z') });
        expect(result.monthlyRenewal).toEqual([
            expect.objectContaining({ monthOffset: 1, eligibleChains: 2, renewedChains: 1, rate: 0.5 }),
            expect.objectContaining({ monthOffset: 2, eligibleChains: 2, renewedChains: 0, rate: 0 }),
            expect.objectContaining({ monthOffset: 3, eligibleChains: 2, renewedChains: 0, rate: 0 }),
        ]);
    });
    it('includes refunds inside mature LTV windows and excludes immature chains from denominators', () => {
        const start = at('2026-01-01T00:00:00Z');
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'mature', eventTimestampMs: start, grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventType: 'REFUND', originalTransactionId: 'mature', eventTimestampMs: start + 10 * DAY, grossUsdMicros: -4000000, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'immature', eventTimestampMs: start + 25 * DAY, grossUsdMicros: 20000000, financialCoverage: 'partial' },
        ], { watermarkMs: start + 40 * DAY });
        expect(result.ltv.find((row) => row.windowDays === 30)).toMatchObject({ maturePaidChains: 1, ltvGrossUsdMicros: 6000000 });
        expect(result.ltv.find((row) => row.windowDays === 60)).toMatchObject({ maturePaidChains: 0, ltvGrossUsdMicros: null });
    });
    it('marks capped and legacy-only responses as not decision grade without inventing revenue', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'legacy', eventTimestampMs: 100 },
        ], { watermarkMs: 1000, truncated: true });
        expect(result.status).toBe('truncated_not_decision_grade');
        expect(result.coverage).toMatchObject({ completeEvents: 0, partialEvents: 0, unavailableEvents: 1 });
        expect(result.money.grossRevenueUsdMicros).toBeNull();
    });
    it('excludes events before the explicitly selected analysis window', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'old', eventTimestampMs: 100, grossUsdMicros: 9000000, financialCoverage: 'partial' },
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'current', eventTimestampMs: 900, grossUsdMicros: 5000000, financialCoverage: 'partial' },
        ], { fromMs: 500, watermarkMs: 1000 });
        expect(result.money.grossRevenueUsdMicros).toBe(5000000);
        expect(result.money.distinctPaidChains).toBe(1);
    });
    it('does not reset cohort age when an old subscription only renews inside the selected window', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'INITIAL_PURCHASE', originalTransactionId: 'old-chain', billingCadence: 'monthly', eventTimestampMs: 100, grossUsdMicros: 10000000, financialCoverage: 'partial' },
            { eventType: 'RENEWAL', originalTransactionId: 'old-chain', billingCadence: 'monthly', eventTimestampMs: 900, grossUsdMicros: 10000000, financialCoverage: 'partial' },
        ], { fromMs: 500, watermarkMs: 10000000000 });
        expect(result.money.grossRevenueUsdMicros).toBe(10000000);
        expect(result.leftTruncatedChains).toBe(1);
        expect(result.monthlyRenewal.every((row) => row.eligibleChains === 0)).toBe(true);
        expect(result.ltv.every((row) => row.maturePaidChains === 0)).toBe(true);
    });
    it('requires an observed origin before a later trial conversion can enter LTV', () => {
        const result = (0, admin_revenue_analytics_core_1.aggregateServerRevenueAnalytics)([
            { eventType: 'RENEWAL', originalTransactionId: 'trial-before-window', billingCadence: 'monthly', isTrialConversion: true, eventTimestampMs: 900, grossUsdMicros: 10000000, financialCoverage: 'partial' },
        ], { fromMs: 500, watermarkMs: 10000000000 });
        expect(result.leftTruncatedChains).toBe(1);
        expect(result.ltv.every((row) => row.maturePaidChains === 0)).toBe(true);
    });
});
//# sourceMappingURL=admin_revenue_analytics_core.test.js.map