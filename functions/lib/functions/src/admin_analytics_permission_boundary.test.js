"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_product_analytics_1 = require("./admin_product_analytics");
const admin_subscription_analytics_1 = require("./admin_subscription_analytics");
const admin_monthly_decision_pack_1 = require("./admin_monthly_decision_pack");
const insufficientAuth = {
    uid: 'non-admin-user',
    token: {
        admin: false,
        adminRole: 'user',
        aud: 'phraseman-ea0b3',
        iss: 'https://securetoken.google.com/phraseman-ea0b3',
        firebase: { sign_in_provider: 'password' },
    },
};
async function expectPermissionDenied(action) {
    await expect(action()).rejects.toMatchObject({ code: 'permission-denied' });
}
describe('analytics callable server permission boundary', () => {
    test.each([
        ['product analytics', (auth) => (0, admin_product_analytics_1.handleAdminProductAnalytics)({ auth, data: {} })],
        ['subscription analytics', (auth) => (0, admin_subscription_analytics_1.handleAdminSubscriptionAnalytics)({ auth, data: {} })],
        ['monthly decision pack', (auth) => (0, admin_monthly_decision_pack_1.generateMonthlyDecisionPackResponse)({}, auth)],
    ])('%s rejects unauthenticated and insufficient callers', async (_name, invoke) => {
        await expectPermissionDenied(() => invoke(undefined));
        await expectPermissionDenied(() => invoke(insufficientAuth));
    });
});
//# sourceMappingURL=admin_analytics_permission_boundary.test.js.map