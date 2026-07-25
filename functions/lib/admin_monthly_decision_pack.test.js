"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const admin_monthly_decision_pack_1 = require("./admin_monthly_decision_pack");
describe('admin monthly decision pack', () => {
    test('requires money.read before loading any source', async () => {
        const load = jest.fn();
        await expect((0, admin_monthly_decision_pack_1.generateMonthlyDecisionPackResponse)({}, {}, {
            nowMs: () => Date.parse('2026-07-13T12:00:00Z'), hasPermission: () => false, load,
        })).rejects.toMatchObject({ code: 'permission-denied' });
        expect(load).not.toHaveBeenCalled();
    });
    test('returns a bounded ZIP with digest, manifest preview and exact file list', async () => {
        const nowMs = Date.parse('2026-07-13T12:00:00Z');
        const result = await (0, admin_monthly_decision_pack_1.generateMonthlyDecisionPackResponse)({ timezone: 'UTC', month: '2026-06' }, {}, {
            nowMs: () => nowMs,
            hasPermission: () => true,
            load: async (window, generatedAtMs) => ({
                window, generatedAtMs,
                sources: [{ id: 'firebase_analytics', status: 'unavailable', reason: 'fixture' }],
            }),
        });
        const zip = Buffer.from(result.base64, 'base64');
        expect(result.byteSize).toBe(zip.length);
        expect(result.sha256).toBe((0, node_crypto_1.createHash)('sha256').update(zip).digest('hex'));
        expect(result.fileList).toHaveLength(18);
        expect(result.filename).toContain('2026-06');
        expect(result.manifestPreview.reporting_window.preliminary).toBe(false);
        expect(result.manifestPreview.sources.firebase_analytics.status).toBe('unavailable');
    });
});
//# sourceMappingURL=admin_monthly_decision_pack.test.js.map