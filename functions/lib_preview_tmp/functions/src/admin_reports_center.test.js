"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_reports_center_1 = require("./admin_reports_center");
describe('admin reports center contracts', () => {
    test('fails closed when the admin role claim is missing or invalid', () => {
        expect(() => (0, admin_reports_center_1.requireReportPermission)({ auth: { uid: 'admin-1', token: { admin: true } } }, 'reports.read')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.requireReportPermission)({ auth: { uid: 'admin-1', token: { admin: true, adminRole: 'unknown' } } }, 'reports.read')).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.requireReportPermission)({ auth: { uid: 'admin-1', token: { admin: true, adminRole: 'support' } } }, 'reports.read')).not.toThrow();
    });
    test('accepts only closed report sources and bounded list inputs', () => {
        expect((0, admin_reports_center_1.parseReportListRequest)({ source: 'error_reports', limit: 999, sinceDays: 30 })).toMatchObject({
            source: 'error_reports', limit: 100, sinceDays: 30,
        });
        expect((0, admin_reports_center_1.parseReportListRequest)({ source: 'all' })).toMatchObject({ source: 'all', limit: 50, sinceDays: 7 });
        expect(() => (0, admin_reports_center_1.parseReportListRequest)({ source: 'arbitrary_collection' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportListRequest)({ source: 'all', cursor: 'opaque' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportListRequest)({ source: 'error_reports', cursor: 'b3BhcXVl', uid: 'user-1' })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportListRequest)({ source: 'error_reports', uid: '../escape' })).toThrow(https_1.HttpsError);
    });
    test('applies source-specific filters after selecting the recent bounded window', () => {
        const input = (0, admin_reports_center_1.parseReportListRequest)({ source: 'user_reports', uid: 'reporter-1', lane: 'open', category: 'spam' });
        expect((0, admin_reports_center_1.matchesReportFilters)('user_reports', { reporterUid: 'reporter-1', status: 'new', category: 'spam' }, input)).toBe(true);
        expect((0, admin_reports_center_1.matchesReportFilters)('user_reports', { reportedUid: 'reporter-1', status: 'reviewed' }, input)).toBe(false);
        expect((0, admin_reports_center_1.matchesReportFilters)('user_reports', { reporterUid: 'other', status: 'new' }, input)).toBe(false);
        expect((0, admin_reports_center_1.matchesReportFilters)('user_reports', { reporterUid: 'reporter-1', status: 'new', category: 'copyright' }, input)).toBe(false);
    });
    test('preserves raw status while mapping source-specific canonical lanes', () => {
        expect((0, admin_reports_center_1.canonicalReportLane)('error_reports', 'new')).toBe('open');
        expect((0, admin_reports_center_1.canonicalReportLane)('error_reports', 'answered')).toBe('answered');
        expect((0, admin_reports_center_1.canonicalReportLane)('user_reports', 'banned')).toBe('escalated');
        expect((0, admin_reports_center_1.canonicalReportLane)('app_errors', 'known')).toBe('known');
        for (const source of ['error_reports', 'user_reports', 'community_pack_reports', 'explain_report_entries']) {
            expect((0, admin_reports_center_1.canonicalReportLane)(source, 'answered')).toBe('answered');
        }
    });
    test('projects only bounded allowlisted report fields and both user links', () => {
        const row = (0, admin_reports_center_1.projectReportRow)('user_reports', 'r1', {
            status: 'new', reason: 'offensive nickname', reporterUid: 'u-reporter', reportedUid: 'u-target',
            reporterName: 'Alice', reportedName: 'Bob', createdAtMs: 100, secret: 'drop', nested: { token: 'drop' },
        });
        expect(row).toMatchObject({
            id: 'r1', source: 'user_reports', rawStatus: 'new', lane: 'open', summary: 'offensive nickname',
            users: { reporterUid: 'u-reporter', reportedUid: 'u-target' },
        });
        expect(JSON.stringify(row)).not.toContain('secret');
        expect(JSON.stringify(row)).not.toContain('token');
    });
    test('projects device and route context needed for a horizontal report card', () => {
        expect((0, admin_reports_center_1.projectReportRow)('error_reports', 'r-device', {
            status: 'new', comment: 'broken button', uid: 'u1', screen: '/lesson/1',
            os: 'android', appVersion: '1.5.53', deviceModel: 'Pixel 8', context: 'after submit',
        })).toMatchObject({
            context: {
                screen: '/lesson/1',
                os: 'android',
                appVersion: '1.5.53',
                deviceModel: 'Pixel 8',
                details: 'after submit',
            },
        });
    });
    test('defines unresolved as every report not answered or archived', () => {
        expect((0, admin_reports_center_1.isReportUnresolved)('new')).toBe(true);
        expect((0, admin_reports_center_1.isReportUnresolved)('fixed')).toBe(true);
        expect((0, admin_reports_center_1.isReportUnresolved)('answered')).toBe(false);
        expect((0, admin_reports_center_1.isReportUnresolved)('archived')).toBe(false);
    });
    test('exports the legacy workflow guidance with the one-coin rule', () => {
        const instructions = (0, admin_reports_center_1.reportExportInstructions)();
        expect(instructions).toContain('каждый reportId');
        expect(instructions).toContain('не выполнять массовую живую отправку');
        expect(instructions).toContain('не более одной монеты');
        expect(instructions).not.toMatch(/осколк|shard/i);
    });
    test('parses bounded server-side pages for all unresolved reports', () => {
        expect((0, admin_reports_center_1.parseUnresolvedExportRequest)({})).toEqual({ cursor: '', limit: 100 });
        expect((0, admin_reports_center_1.parseUnresolvedExportRequest)({ limit: 999, cursor: 'opaque_1' })).toEqual({ cursor: 'opaque_1', limit: 100 });
        expect(() => (0, admin_reports_center_1.parseUnresolvedExportRequest)({ cursor: '../escape' })).toThrow(https_1.HttpsError);
    });
    test('projects reply archive metadata without exposing unrelated fields', () => {
        expect((0, admin_reports_center_1.projectReportRow)('error_reports', 'archived-1', {
            status: 'archived', replyTitle: 'Спасибо', replyBody: 'Исправили', replyCoins: 1,
            repliedAtMs: 1234, repliedBy: 'admin@example.com', resolution: 'confirmed_fixed', secret: 'drop',
        })).toMatchObject({ archive: {
                title: 'Спасибо', body: 'Исправили', coins: 1, repliedAtMs: 1234,
                repliedBy: 'admin@example.com', resolution: 'confirmed_fixed',
            } });
    });
    test('accepts only an ordered bounded list of export references', () => {
        expect((0, admin_reports_center_1.parseReportExportRequest)({ reports: [
                { source: 'error_reports', id: 'error-2' },
                { source: 'user_reports', id: 'user-1' },
            ] })).toEqual({ reports: [
                { source: 'error_reports', id: 'error-2' },
                { source: 'user_reports', id: 'user-1' },
            ] });
        expect(() => (0, admin_reports_center_1.parseReportExportRequest)({ reports: [] })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportExportRequest)({ reports: [{ source: 'unknown', id: 'report-1' }] })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportExportRequest)({ reports: [{ source: 'error_reports', id: '../escape' }] })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_reports_center_1.parseReportExportRequest)({ reports: Array.from({ length: 101 }, (_, index) => ({ source: 'error_reports', id: `r-${index}` })) })).toThrow(https_1.HttpsError);
    });
    test('serializes the complete report document without truncating user text', () => {
        const longComment = 'длинный комментарий '.repeat(800);
        const serialized = (0, admin_reports_center_1.serializeReportDocument)({
            copyText: 'полный текст для разбора',
            comment: longComment,
            userLanguage: 'ru',
            nested: { userAnswer: 'answer', values: [1, true, null] },
        });
        expect(serialized).toEqual({
            copyText: 'полный текст для разбора',
            comment: longComment,
            userLanguage: 'ru',
            nested: { userAnswer: 'answer', values: [1, true, null] },
        });
    });
    test('preserves the community pack author link used by current report documents', () => {
        const row = (0, admin_reports_center_1.projectReportRow)('community_pack_reports', 'pack-report-1', {
            status: 'new', reason: 'copyright', reporterUid: 'reporter-1', authorStableId: 'author-1', packId: 'pack-1',
        });
        expect(row).toMatchObject({ users: { reporterUid: 'reporter-1', authorUid: 'author-1' }, context: { packId: 'pack-1' } });
    });
    test('allows only explicit non-destructive status transitions', () => {
        expect((0, admin_reports_center_1.isAllowedReportTransition)('error_reports', 'new', 'fixed')).toBe(true);
        expect((0, admin_reports_center_1.isAllowedReportTransition)('error_reports', 'new', 'answered')).toBe(false);
        expect((0, admin_reports_center_1.isAllowedReportTransition)('user_reports', 'new', 'banned')).toBe(false);
        expect((0, admin_reports_center_1.isAllowedReportTransition)('community_pack_reports', 'new', 'reviewed')).toBe(true);
        expect((0, admin_reports_center_1.isAllowedReportTransition)('app_errors', 'known', 'fixed')).toBe(true);
    });
    test('requires optimistic concurrency, reason and idempotency for status writes', () => {
        expect((0, admin_reports_center_1.parseReportStatusUpdateRequest)({
            source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'fixed',
            reason: 'Verified in release 2.4', idempotencyKey: 'report-op-1', requestId: 'request-1',
        })).toMatchObject({ source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'fixed' });
        expect(() => (0, admin_reports_center_1.parseReportStatusUpdateRequest)({
            source: 'error_reports', reportId: 'r1', expectedStatus: 'new', nextStatus: 'answered',
            reason: 'no', idempotencyKey: 'op', requestId: 'req',
        })).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_reports_center.test.js.map