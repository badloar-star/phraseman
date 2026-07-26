"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_product_analytics_1 = require("./admin_product_analytics");
process.env.ANALYTICS_BIGQUERY_DATASET = 'phraseman-ea0b3.analytics_532376954';
describe('production first-touch activation query order', () => {
    it('selects each earliest milestone only after the previous valid milestone', () => {
        const query = (0, admin_product_analytics_1.buildProductAnalyticsAggregateQuery)();
        const onboarding = query.indexOf('first_touch_onboarding AS');
        const learningStart = query.indexOf('first_touch_learning_start AS');
        const learningComplete = query.indexOf('first_touch_learning_complete AS');
        const return72h = query.indexOf('first_touch_return_72h AS');
        const returnD7 = query.indexOf('first_touch_return_d7 AS');
        expect(onboarding).toBeGreaterThan(-1);
        expect(learningStart).toBeGreaterThan(onboarding);
        expect(learningComplete).toBeGreaterThan(learningStart);
        expect(return72h).toBeGreaterThan(learningComplete);
        expect(returnD7).toBeGreaterThan(return72h);
        expect(query).toContain('event_timestamp >= o.onboarding_completed_at');
        expect(query).toContain('event_timestamp >= s.learning_started_at');
        expect(query).toContain('event_timestamp >= c.learning_completed_at');
        expect(query).toContain('event_timestamp >= r.returned_within_72h_at');
    });
});
//# sourceMappingURL=admin_product_analytics_query_order.test.js.map