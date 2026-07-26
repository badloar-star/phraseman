"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const report_replies_1 = require("./report_replies");
describe('report reply one-coin contract', () => {
    test('requires the exact server-side permission for draft and send actions', () => {
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: { admin: true, adminRole: 'analyst' } } }, 'reports.reply.draft')).toThrow(https_1.HttpsError);
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: { admin: true, adminRole: 'moderator' } } }, 'reports.reply.send')).toThrow(https_1.HttpsError);
        // Админ без явной роли = owner (adminRole в проекте не выдаётся) — отправка ответов
        // на репорты не должна блокироваться отсутствием claim'а, которого никто не ставит.
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: { admin: true } } }, 'reports.reply.send')).not.toThrow();
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: {} } }, 'reports.reply.send')).toThrow(https_1.HttpsError);
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: { admin: true, adminRole: 'support' } } }, 'reports.reply.draft')).not.toThrow();
        expect(() => (0, report_replies_1.requireReportReplyPermission)({ auth: { token: { admin: true, adminRole: 'support' } } }, 'reports.reply.send')).not.toThrow();
    });
    test('caps every stored legacy report reward at one coin', () => {
        expect((0, report_replies_1.normalizeStoredReportReplyClaimAmount)({ shards: 50 })).toBe(1);
        expect((0, report_replies_1.normalizeStoredReportReplyClaimAmount)({ shards: 1 })).toBe(1);
        expect((0, report_replies_1.normalizeStoredReportReplyClaimAmount)({ shards: 0 })).toBe(0);
        expect((0, report_replies_1.normalizeStoredReportReplyClaimAmount)({ coins: 2, shards: 50 })).toBe(0);
        expect((0, report_replies_1.normalizeStoredReportReplyClaimAmount)({ coins: 1, shards: 50 })).toBe(1);
    });
    test.each(['duplicate', 'in_progress', 'rejected', 'unconfirmed'])('rejects a coin for %s', (resolution) => {
        expect(() => (0, report_replies_1.normalizeReportReplyReward)({ resolution, coins: 1 })).toThrow(https_1.HttpsError);
        expect((0, report_replies_1.normalizeReportReplyReward)({ resolution, coins: 0 })).toEqual({ resolution, coins: 0 });
    });
    test('allows exactly one coin only for confirmed_fixed', () => {
        expect((0, report_replies_1.normalizeReportReplyReward)({ resolution: 'confirmed_fixed', coins: 1 })).toEqual({
            resolution: 'confirmed_fixed',
            coins: 1,
        });
        for (const coins of [-1, 2, 1.5, Number.NaN]) {
            expect(() => (0, report_replies_1.normalizeReportReplyReward)({ resolution: 'confirmed_fixed', coins })).toThrow(https_1.HttpsError);
        }
    });
    test('requires the persisted report to confirm the fixed result', () => {
        expect((0, report_replies_1.reportDocumentAllowsCoin)({ status: 'fixed' }, 'confirmed_fixed')).toBe(true);
        expect((0, report_replies_1.reportDocumentAllowsCoin)({ resolution: 'confirmed_fixed' }, 'confirmed_fixed')).toBe(true);
        expect((0, report_replies_1.reportDocumentAllowsCoin)({ status: 'reviewed' }, 'confirmed_fixed')).toBe(false);
        expect((0, report_replies_1.reportDocumentAllowsCoin)({ status: 'fixed' }, 'duplicate')).toBe(false);
    });
});
//# sourceMappingURL=report_replies.test.js.map