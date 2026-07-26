"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_ops_log_1 = require("./admin_ops_log");
describe('admin ops log contract', () => {
    test('preserves legacy source/type normalization mappings', () => {
        expect((0, admin_ops_log_1.normalizeOpsType)('admin', { action: 'mark_fixed' })).toBe('mark_fixed');
        expect((0, admin_ops_log_1.normalizeOpsType)('admin', { action: 'unban' })).toBe('ban');
        expect((0, admin_ops_log_1.normalizeOpsType)('admin', { action: 'ban_from_report' })).toBe('ban');
        expect((0, admin_ops_log_1.normalizeOpsType)('admin', { action: 'edit_field', details: { field: 'premium_plan' } })).toBe('premium_change');
        expect((0, admin_ops_log_1.normalizeOpsType)('error_report', {})).toBe('report_created');
        expect((0, admin_ops_log_1.normalizeOpsType)('user_report', {})).toBe('user_report_created');
    });
    test('bounds request filters and filters only projected rows', () => {
        const input = (0, admin_ops_log_1.parseOpsLogRequest)({ source: 'error_report', type: ' report_created ', query: ' UID- ', limit: 999 });
        expect(input).toEqual({ source: 'error_report', type: 'report_created', query: 'uid-', limit: 250 });
        const rows = [
            (0, admin_ops_log_1.projectOpsRow)('admin', 'a1', { ts: '2033-05-18T12:30:00.000Z', action: 'grant_reward', targetUid: 'user-secret-1', userName: 'Alice', details: { note: 'safe', body: 'secret' } }, true),
            (0, admin_ops_log_1.projectOpsRow)('error_report', 'e1', { createdAt: '2033-05-18T12:31:00.000Z', uid: 'uid-1', status: 'new', message: 'secret body' }, false),
        ];
        expect(rows[0]).toMatchObject({ uid: 'user-secret-1', name: 'Alice', details: { note: 'safe' } });
        expect(rows[1]).toMatchObject({ uid: 'uid-…', name: null, details: {} });
        expect(JSON.stringify(rows)).not.toContain('secret body');
        expect((0, admin_ops_log_1.filterOpsRows)(rows, input).map((row) => row.id)).toEqual(['e1']);
    });
    test('generates sanitized snapshot text from filtered safe rows only', () => {
        const rows = [
            (0, admin_ops_log_1.projectOpsRow)('admin', 'a1', { ts: '2033-05-18T12:30:00.000Z', action: 'grant_reward', targetUid: 'abcdef123456', adminEmail: 'owner@example.com', details: { rewardDays: 7, signature: 'secret' } }, true),
        ];
        const text = (0, admin_ops_log_1.buildOpsSnapshotText)(rows, {
            state: 'partial',
            sourceHealth: [{ source: 'admin_log', state: 'truncated', count: 121, error: '' }],
        });
        expect(text).toContain('# Ops Snapshot');
        expect(text).toContain('State: partial');
        expect(text).toContain('admin_log: truncated');
        expect(text).toContain('uid=abcd…');
        expect(text).not.toContain('abcdef123456');
        expect(text).not.toContain('owner@example.com');
        expect(text).not.toContain('secret');
    });
    test('does not present admin actor uid as affected user', () => {
        const row = (0, admin_ops_log_1.projectOpsRow)('admin', 'a2', {
            ts: '2033-05-18T12:30:00.000Z',
            action: 'global_broadcast_send',
            actorUid: 'admin-actor-uid',
            adminUid: 'admin-uid',
            details: { target: 'all-users' },
        }, true);
        expect(row.uid).toBeNull();
        expect(JSON.stringify(row)).not.toContain('admin-actor-uid');
        expect(JSON.stringify(row)).not.toContain('admin-uid');
    });
    test('derives truthful degraded states from per-source health', () => {
        const ready = { source: 'admin_log', state: 'ready', count: 1, error: '' };
        const empty = { source: 'error_reports', state: 'empty', count: 0, error: '' };
        const failed = { source: 'user_reports', state: 'error', count: 0, error: 'permission-denied' };
        const capped = { source: 'admin_log', state: 'truncated', count: 120, error: '' };
        const row = { id: 'x' };
        expect((0, admin_ops_log_1.deriveOpsState)([ready, empty], [row], [row])).toBe('ready');
        expect((0, admin_ops_log_1.deriveOpsState)([capped, empty], [row], [row])).toBe('truncated');
        expect((0, admin_ops_log_1.deriveOpsState)([ready, failed], [row], [row])).toBe('partial');
        expect((0, admin_ops_log_1.deriveOpsState)([failed], [], [])).toBe('error');
        expect((0, admin_ops_log_1.deriveOpsState)([empty], [], [])).toBe('empty');
    });
    test('does not hide partial admin timestamp-index failures behind a healthy source state', () => {
        const health = (0, admin_ops_log_1.collapseAdminLogHealth)({
            rows: [{ id: 'a1' }],
            saturated: false,
            health: [
                { field: 'timestamp', state: 'ready', count: 1, error: '' },
                { field: 'ts', state: 'error', count: 0, error: 'missing index for ts' },
                { field: 'createdAt', state: 'empty', count: 0, error: '' },
            ],
        });
        expect(health).toEqual({
            source: 'admin_log',
            state: 'error',
            count: 1,
            error: 'ts: missing index for ts',
        });
    });
});
//# sourceMappingURL=admin_ops_log.test.js.map