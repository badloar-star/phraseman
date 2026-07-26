"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const admin_analytics_1 = require("./admin_analytics");
describe('analytics request contract', () => {
    it('allows the supported bounded periods', () => {
        expect((0, admin_analytics_1.parseAnalyticsRequest)({ rangeDays: 7 })).toEqual({ rangeDays: 7 });
        expect((0, admin_analytics_1.parseAnalyticsRequest)({ rangeDays: 28 })).toEqual({ rangeDays: 28 });
        expect((0, admin_analytics_1.parseAnalyticsRequest)({ rangeDays: 90 })).toEqual({ rangeDays: 90 });
    });
    it('rejects unbounded or arbitrary periods', () => {
        expect(() => (0, admin_analytics_1.parseAnalyticsRequest)({ rangeDays: 365 })).toThrow(https_1.HttpsError);
    });
});
describe('analytics source health contract', () => {
    it('distinguishes ready, empty, partial and error without leaking raw messages', () => {
        expect((0, admin_analytics_1.sourceHealth)({ rows: [{ id: 'one' }], truncated: false, latestAtMs: 100 })).toEqual({
            state: 'ready', count: 1, truncated: false, latestAtMs: 100, errorCode: null,
        });
        expect((0, admin_analytics_1.sourceHealth)({ rows: [], truncated: false, latestAtMs: null })).toEqual({
            state: 'empty', count: 0, truncated: false, latestAtMs: null, errorCode: null,
        });
        expect((0, admin_analytics_1.sourceHealth)({ rows: [{ id: 'one' }], truncated: true, latestAtMs: 100 })).toEqual({
            state: 'partial', count: 1, truncated: true, latestAtMs: 100, errorCode: null,
        });
        expect((0, admin_analytics_1.sourceHealth)({ rows: [], truncated: false, latestAtMs: null, errorCode: 'users_read_failed' })).toEqual({
            state: 'error', count: 0, truncated: false, latestAtMs: null, errorCode: 'users_read_failed',
        });
    });
    it('derives an honest overall state from source health', () => {
        expect((0, admin_analytics_1.analyticsSnapshotState)([{ state: 'empty' }, { state: 'empty' }])).toBe('empty');
        expect((0, admin_analytics_1.analyticsSnapshotState)([{ state: 'ready' }, { state: 'empty' }])).toBe('ready');
        expect((0, admin_analytics_1.analyticsSnapshotState)([{ state: 'ready' }, { state: 'error' }])).toBe('partial');
        expect((0, admin_analytics_1.analyticsSnapshotState)([{ state: 'error' }, { state: 'error' }])).toBe('error');
        expect((0, admin_analytics_1.analyticsSnapshotState)([{ state: 'partial' }, { state: 'ready' }])).toBe('partial');
    });
});
describe('analytics callable source contract', () => {
    const source = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'admin_analytics.ts'), 'utf8');
    it('uses the pure definitions and all required sources', () => {
        expect(source).toContain('aggregateActiveAccess');
        expect(source).toContain('aggregateRevenueCatPeriod');
        expect(source).toContain('aggregateShardPeriod');
        expect(source).toContain('aggregateFunnelSignals');
        expect(source).toContain("collection('revenuecat_shard_transactions')");
        expect(source).toContain('ANALYTICS_DEFINITION_VERSION');
        expect(source).not.toContain('payingNow');
    });
    it('returns aggregate sections and safe source metadata', () => {
        for (const key of ['generatedAtMs', 'definitionVersion', 'access', 'storeActivity', 'shardActivity', 'funnelSignals', 'appActivity', 'quality']) {
            expect(source).toContain(key);
        }
        expect(source).toContain('errorCode');
        expect(source).not.toContain('error instanceof Error ? error.message');
    });
    it('loads the user population in bounded pages instead of one oversized browser-style read', () => {
        expect(source).toContain('readRowsPaged');
        expect(source).toContain('startAfter');
        expect(source).toContain('USER_PAGE_SIZE');
    });
});
//# sourceMappingURL=admin_analytics.test.js.map