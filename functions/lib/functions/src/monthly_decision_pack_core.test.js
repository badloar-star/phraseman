"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monthly_decision_pack_core_1 = require("./monthly_decision_pack_core");
describe('monthly decision pack core', () => {
    test('defaults to the last completed local month and a separate 12 month baseline', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({
            timezone: 'Europe/Dublin',
            asOfMs: Date.parse('2026-07-13T12:00:00Z'),
        });
        expect(window.month).toBe('2026-06');
        expect(window.preliminary).toBe(false);
        expect(new Date(window.startMs).toISOString()).toBe('2026-05-31T23:00:00.000Z');
        expect(new Date(window.endExclusiveMs).toISOString()).toBe('2026-06-30T23:00:00.000Z');
        expect(window.baselineMonths).toEqual([
            '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11',
            '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
        ]);
    });
    test.each([
        ['UTC', '2026-03', '2026-03-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z'],
        ['Europe/Dublin', '2026-03', '2026-03-01T00:00:00.000Z', '2026-03-31T23:00:00.000Z'],
        ['America/Los_Angeles', '2026-03', '2026-03-01T08:00:00.000Z', '2026-04-01T07:00:00.000Z'],
    ])('resolves DST-safe boundaries for %s', (timezone, month, start, end) => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({
            timezone,
            month,
            asOfMs: Date.parse('2026-07-13T12:00:00Z'),
        });
        expect(new Date(window.startMs).toISOString()).toBe(start);
        expect(new Date(window.endExclusiveMs).toISOString()).toBe(end);
    });
    test('marks the current month preliminary and rejects future months', () => {
        const asOfMs = Date.parse('2026-07-13T12:00:00Z');
        const current = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-07', asOfMs });
        expect(current.preliminary).toBe(true);
        expect(current.endExclusiveMs).toBe(asOfMs);
        expect(() => (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-08', asOfMs })).toThrow('future_month');
    });
    test('always emits the exact governed file set and represents missing sources explicitly', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({
            timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z'),
        });
        const first = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            sources: [
                { id: 'firebase_analytics', status: 'available', dataThroughMs: Date.parse('2026-07-01T05:00:00Z') },
                { id: 'store_acquisition', status: 'unavailable', reason: 'not_configured' },
            ],
            sections: {
                executive_kpis: [{ scope: 'reporting_month', metric_id: 'active_instances', value: 120, denominator: 120 }],
                content_diagnostics: [{ scope: 'reporting_month', diagnostic_group: 'lesson_1', answers: 9, accuracy: 0.8, denominator: 9 }],
            },
        });
        const second = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            sources: [
                { id: 'firebase_analytics', status: 'available', dataThroughMs: Date.parse('2026-07-01T05:00:00Z') },
                { id: 'store_acquisition', status: 'unavailable', reason: 'not_configured' },
            ],
            sections: {
                executive_kpis: [{ scope: 'reporting_month', metric_id: 'active_instances', value: 120, denominator: 120 }],
                content_diagnostics: [{ scope: 'reporting_month', diagnostic_group: 'lesson_1', answers: 9, accuracy: 0.8, denominator: 9 }],
            },
        });
        expect(Object.keys(first)).toEqual(monthly_decision_pack_core_1.DECISION_PACK_FILE_NAMES);
        expect(first).toEqual(second);
        expect(first['content_diagnostics.csv']).toContain('suppressed_small_sample');
        expect(first['content_diagnostics.csv']).not.toContain(',9,0.8');
        expect(first['notifications_referrals.csv']).toContain('unavailable');
        const manifest = JSON.parse(first['manifest.json']);
        expect(manifest.baseline.months).toHaveLength(12);
        expect(manifest.sources.store_acquisition.status).toBe('unavailable');
        expect(manifest.missing_sources_are_zero).toBe(false);
    });
    test('neutralizes spreadsheet formulas and rejects PII/free text', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') });
        const safe = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            sources: [{ id: 'firebase_analytics', status: 'available' }],
            sections: { experiments: [{ scope: 'reporting_month', experiment_id: '=CMD()', variant_id: 'control', exposures: 20, denominator: 20 }] },
        });
        expect(safe['experiments.csv']).toContain("'=CMD()");
        const signed = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            sources: [{ id: 'revenuecat_webhooks', status: 'available' }],
            sections: { subscriptions_revenue: [{ scope: 'reporting_month', metric_id: 'net_signed', currency: 'USD', value_micros: -2000000, chains: 20, denominator: 20, coverage: 'complete' }] },
        });
        expect(signed['subscriptions_revenue.csv']).toContain(',-2000000,');
        expect(signed['subscriptions_revenue.csv']).not.toContain("'-2000000");
        expect(() => (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window,
            generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
            sources: [{ id: 'firebase_analytics', status: 'available' }],
            sections: { feedback_support: [{ scope: 'reporting_month', category: 'user@example.com', reports: 20, denominator: 20 }] },
        })).toThrow('pii_or_free_text_detected');
    });
    test('rejects aggregate row explosions before ZIP creation', () => {
        const window = (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') });
        expect(() => (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
            window, generatedAtMs: window.asOfMs, sources: [{ id: 'firebase_analytics', status: 'available' }],
            sections: { executive_kpis: Array.from({ length: 50001 }, () => ({ scope: 'reporting_month', metric_id: 'x', value: 20, denominator: 20 })) },
        })).toThrow('decision_pack_row_limit');
    });
});
//# sourceMappingURL=monthly_decision_pack_core.test.js.map