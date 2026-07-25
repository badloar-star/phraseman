"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_brief_1 = require("./analytics_brief");
describe('analytics decision brief', () => {
    test('turns aggregate operational facts into a review-only, PII-free decision brief', () => {
        const brief = (0, analytics_brief_1.buildAnalyticsDecisionBrief)({
            reports: { total: 12, open: 7 },
            appErrors: { total: 9, critical: 3 },
            revenue: { newPaying: 4, refunds: 2, paywallPurchases: 5 },
            sourceCoverage: [
                { sourceId: 'error_reports', status: 'ok', rowCount: 12, truncated: false },
                { sourceId: 'app_errors', status: 'partial', rowCount: 1000, truncated: true },
            ],
        });
        expect(brief.outcome).toBe('needs_review');
        expect(brief.summary).toContain('12');
        expect(brief.summary).toContain('3');
        expect(brief.summary).toContain('непол');
        expect(brief.summary).toMatch(/ручн/i);
        expect(brief.summary).not.toMatch(/@|userId|email|token|secret/i);
    });
});
//# sourceMappingURL=analytics_brief.test.js.map