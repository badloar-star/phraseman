"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin_product_analytics_1 = require("./admin_product_analytics");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('admin product analytics input contract', () => {
    it('requires the server-side money.read permission', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
        expect(source).toContain('hasProductAnalyticsAuth(request.auth)');
        expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    });
    it('rejects forged or insufficient callable auth and accepts intended analytics roles', () => {
        expect((0, admin_product_analytics_1.hasProductAnalyticsAuth)({ admin: true, adminRole: 'owner' })).toBe(false);
        expect((0, admin_product_analytics_1.hasProductAnalyticsAuth)({
            uid: 'support-user',
            token: { admin: true, adminRole: 'support' },
        })).toBe(false);
        expect((0, admin_product_analytics_1.hasProductAnalyticsAuth)({
            uid: 'analyst-user',
            token: {
                admin: true,
                adminRole: 'analyst',
                aud: 'phraseman-ea0b3',
                iss: 'https://securetoken.google.com/phraseman-ea0b3',
                firebase: { sign_in_provider: 'google.com' },
            },
        })).toBe(true);
        expect((0, admin_product_analytics_1.hasProductAnalyticsAuth)({
            uid: 'foreign-admin',
            token: {
                admin: true,
                adminRole: 'owner',
                aud: 'other-project',
                iss: 'https://securetoken.google.com/other-project',
                firebase: { sign_in_provider: 'google.com' },
            },
        })).toBe(false);
    });
    it('accepts only the exact production GA4 dataset identifier shape', () => {
        expect((0, admin_product_analytics_1.validatedAnalyticsDatasetTable)('phraseman-ea0b3.analytics_532376954'))
            .toBe('`phraseman-ea0b3.analytics_532376954.events_*`');
        for (const unsafe of [
            'analytics_532376954',
            'other-project.analytics_532376954',
            'phraseman-ea0b3.other_dataset',
            'phraseman-ea0b3.analytics_1;DROP TABLE x',
            'phraseman-ea0b3.analytics_１２３４５６',
            'phraseman-ea0b3.analytics_12345`',
        ]) {
            expect(() => (0, admin_product_analytics_1.validatedAnalyticsDatasetTable)(unsafe)).toThrow('Analytics warehouse is not configured');
        }
    });
    it('keeps a bounded production runtime envelope for the synchronous query', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
        expect(source).toContain('timeoutSeconds: 300');
        expect(source).toContain("memory: '1GiB'");
        expect(source).toContain('maxInstances: 3');
        expect(source).toContain('maximumBytesBilled: String(MAXIMUM_BYTES_BILLED)');
        expect(source).toContain('const MAXIMUM_BYTES_BILLED = 5_000_000_000');
        expect(source).not.toContain('maximumBytesBilled?:');
        expect(source).toContain('Invalid IANA reporting timezone');
    });
    it('limits the query window to supported periods', () => {
        expect((0, admin_product_analytics_1.clampProductAnalyticsDays)(7)).toBe(7);
        expect((0, admin_product_analytics_1.clampProductAnalyticsDays)(28)).toBe(28);
        expect((0, admin_product_analytics_1.clampProductAnalyticsDays)(90)).toBe(90);
        expect((0, admin_product_analytics_1.clampProductAnalyticsDays)(999)).toBe(28);
    });
    it('accepts only aggregate platform filters', () => {
        expect((0, admin_product_analytics_1.normalizeProductAnalyticsPlatform)('ios')).toBe('ios');
        expect((0, admin_product_analytics_1.normalizeProductAnalyticsPlatform)('android')).toBe('android');
        expect((0, admin_product_analytics_1.normalizeProductAnalyticsPlatform)('anything')).toBe('all');
    });
    it('returns an honest empty state while the first daily export is pending', () => {
        expect((0, admin_product_analytics_1.isAnalyticsExportPendingError)({ code: 404, message: 'Not found: Dataset' })).toBe(true);
        expect((0, admin_product_analytics_1.isAnalyticsExportPendingError)({ message: 'Wildcard table does not match any table' })).toBe(true);
        expect((0, admin_product_analytics_1.isAnalyticsExportPendingError)({ code: 403, message: 'Access denied' })).toBe(false);
    });
});
describe('admin product session analytics contract', () => {
    it('returns observed session aggregates without raw session identifiers', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
        expect(source).toContain('session_facts');
        expect(source).toContain('withoutStartInWindow');
        expect(source).toContain('p50ObservedDurationMs');
        expect(source).toContain('lastObservedScreens');
        expect(source).toContain("'<1m'");
        expect(source).not.toContain('sessions.push(payload)');
    });
});
describe('admin lesson drop-off analytics contract', () => {
    it('aggregates phrase checkpoints, answer errors, and historical coverage', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
        expect(source).toContain("'lesson_answer'");
        expect(source).toContain("key = 'total_phrases'");
        expect(source).toContain("key = 'correct'");
        expect(source).toContain("'learning_checkpoint' AS row_kind");
        expect(source).toContain('answer_error_rate');
        expect(source).toContain('checkpoint_coverage_rate');
        expect(source).toContain('learningDropoff');
        expect(source).toContain("key = 'lesson_attempt_id'");
        expect(source).toContain('distinct_started_attempts');
        expect(source).toContain('lesson_attempt_id_coverage_rate');
    });
});
describe('admin conversion and observed-return analytics contract', () => {
    it('keeps behavioral paywall analytics separate and reports bounded return cohorts', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_product_analytics.ts'), 'utf8');
        expect(source).toContain("'paywall_view'");
        expect(source).toContain("'conversion_context' AS row_kind");
        expect(source).toContain('impression_purchase_per_store_start_rate');
        expect(source).toContain("'retention_day' AS row_kind");
        expect(source).toContain('eligible_d28');
        expect(source).toContain('observedReturn');
        expect(source).toContain('behavioralConversion');
        expect(source).toContain("COUNTIF(event_name = 'paywall_shown') AS views");
        expect(source).toContain("COUNTIF(event_name = 'purchase_started') AS store_starts");
        expect(source).toContain("COUNTIF(event_name = 'purchase_completed') AS purchases");
        expect(source).toContain("'paywall_exit_offer_shown'");
        expect(source).toMatch(/THEN paywall_source\s+ELSE 'unknown'/);
        expect(source).not.toContain("COUNTIF(event_name IN ('paywall_cta_click', 'purchase_started')) AS cta_clicks");
        expect(source).toContain("key = 'paywall_impression_id'");
        expect(source).toContain('distinct_paywall_impressions');
        expect(source).toContain('paywall_impression_id_coverage_rate');
        expect(source).toContain('p50_time_to_cta_ms');
        expect(source).toContain('p90_time_to_result_ms');
        expect(source).toContain('impression_facts AS');
        expect(source).toContain('GROUP BY context_bucket, source_bucket, paywall_impression_id');
        expect(source).toContain("MIN(IF(event_name = 'paywall_cta_click', time_since_impression_ms, NULL)) AS time_to_cta_ms");
        expect(source).toContain('impression_cta_rate');
        expect(source).toContain('impression_purchase_per_store_start_rate');
        expect(source).not.toContain("SAFE_DIVIDE(COUNTIF(event_name = 'paywall_cta_click'), COUNTIF(event_name = 'paywall_shown')) AS cta_per_view_rate");
        expect(source).toContain("'paywall_inventory_resolved'");
        expect(source).toContain('inventory_resolution_facts AS');
        expect(source).toContain('selected_plan_facts AS');
        expect(source).toContain("'conversion_inventory' AS row_kind");
        expect(source).toContain('inventory_resolution_coverage_rate');
        expect(source).toContain('default_cta_blocked_impressions');
        expect(source).toContain('selected_plan_missing_impressions');
        expect(source).toContain('lifetime_expected_missing_impressions');
        expect(source).toContain('p90_inventory_resolution_ms');
        expect(source).toContain('inventoryReadiness');
    });
});
//# sourceMappingURL=admin_product_analytics.test.js.map