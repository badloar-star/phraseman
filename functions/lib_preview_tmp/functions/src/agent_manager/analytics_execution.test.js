"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_execution_1 = require("./analytics_execution");
describe('analytics execution digest projection', () => {
    test('projects only aggregate fields and ignores embedded user text', () => {
        const projected = (0, analytics_execution_1.projectDigestForAnalytics)({
            facts: {
                reports: { total: 8, open: 5, samples: [{ comment: 'person@example.com secret text' }] },
                appErrors: { total: 3, critical: 1, topGroups: [{ message: 'raw error' }] },
                revenue: { newPaying: 2, refunds: 1, paywallPurchases: 4 },
            },
            sourceCoverage: [{ sourceId: 'app_errors', status: 'partial', rowCount: 1000, truncated: true, errorCode: 'raw-secret' }],
        });
        expect(projected.reports).toEqual({ total: 8, open: 5 });
        expect(projected.appErrors).toEqual({ total: 3, critical: 1 });
        expect(projected.revenue).toEqual({ newPaying: 2, refunds: 1, paywallPurchases: 4 });
        expect(projected.sourceCoverage).toEqual([{ sourceId: 'app_errors', status: 'partial', rowCount: 1000, truncated: true }]);
        expect(JSON.stringify(projected)).not.toMatch(/@|secret|raw error/i);
    });
    test('marks a missing digest as unavailable data instead of healthy sources', () => {
        const projected = (0, analytics_execution_1.projectDigestForAnalytics)(null);
        expect(projected.sourceCoverage).toEqual([{ sourceId: 'digest_snapshot', status: 'failed', rowCount: 0, truncated: false }]);
    });
});
//# sourceMappingURL=analytics_execution.test.js.map