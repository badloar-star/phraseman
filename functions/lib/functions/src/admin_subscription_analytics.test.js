"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const admin_subscription_analytics_1 = require("./admin_subscription_analytics");
describe('admin subscription analytics callable contract', () => {
    it('normalizes range and store filters', () => {
        expect((0, admin_subscription_analytics_1.clampSubscriptionAnalyticsDays)(7)).toBe(7);
        expect((0, admin_subscription_analytics_1.clampSubscriptionAnalyticsDays)(90)).toBe(90);
        expect((0, admin_subscription_analytics_1.clampSubscriptionAnalyticsDays)(365)).toBe(365);
        expect((0, admin_subscription_analytics_1.clampSubscriptionAnalyticsDays)(366)).toBe(28);
        expect((0, admin_subscription_analytics_1.normalizeSubscriptionStore)('APP_STORE')).toBe('APP_STORE');
        expect((0, admin_subscription_analytics_1.normalizeSubscriptionStore)('bad')).toBe('all');
    });
    it('requires money.read and returns aggregate limitations without identifiers', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_subscription_analytics.ts'), 'utf8');
        expect(source).toContain("hasVerifiedCallablePermission(request.auth, 'money.read')");
        expect(source).toContain('reasons_available_for_new_webhook_events_only');
        expect(source).toContain('historical_cancel_reason_not_stored');
        expect(source).toContain('historical_expiration_reason_not_stored');
        expect(source).toContain('no_screen_subscription_join');
        expect(source).toContain('historical_financial_fields_are_not_backfilled');
        expect(source).toContain('final_store_proceeds_not_imported');
        expect(source).toContain('subscription_chain_ltv_is_not_customer_ltv');
        expect(source).toContain('aggregateServerRevenueAnalytics');
        expect(source).not.toContain('uid: row.uid');
        expect(source).not.toContain('transactionId: row.transactionId');
        expect(source).not.toContain('...data');
        expect(source).toContain("createHmac('sha256', requestKey)");
        expect(source).toContain('const requestIdentifierKey = randomBytes(32)');
    });
    it('rejects crafted auth-like client data before any Firestore read', async () => {
        await expect((0, admin_subscription_analytics_1.handleAdminSubscriptionAnalytics)({
            auth: null,
            data: { auth: { uid: 'attacker', token: { admin: true, adminRole: 'owner' } } },
        })).rejects.toMatchObject({ code: 'permission-denied' });
        await expect((0, admin_subscription_analytics_1.handleAdminSubscriptionAnalytics)({
            auth: { uid: 'ordinary-user', token: { admin: false, adminRole: 'owner' } },
            data: {},
        })).rejects.toMatchObject({ code: 'permission-denied' });
    });
    it('paginates with a hard safety cap and reports truncation', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'admin_subscription_analytics.ts'), 'utf8');
        expect(source).toContain('const PAGE_SIZE = 500');
        expect(source).toContain('const DOCUMENT_CAP = 5000');
        expect(source).toContain(".where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(fromMs))");
        expect(source).toContain('reachedCap = true');
        expect(source).toContain('aggregateSubscriptionAnalytics(filtered, reachedCap, { fromMs })');
    });
});
//# sourceMappingURL=admin_subscription_analytics.test.js.map