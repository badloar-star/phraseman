"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const monthly_decision_pack_zip_1 = require("./monthly_decision_pack_zip");
const monthly_decision_pack_core_1 = require("./monthly_decision_pack_core");
describe('monthly decision pack zip', () => {
    const files = (0, monthly_decision_pack_core_1.buildMonthlyDecisionPackFiles)({
        window: (0, monthly_decision_pack_core_1.resolveMonthlyReportingWindow)({ timezone: 'UTC', month: '2026-06', asOfMs: Date.parse('2026-07-13T12:00:00Z') }),
        generatedAtMs: Date.parse('2026-07-13T12:00:00Z'),
        sources: [],
    });
    test('is byte deterministic and contains every governed filename', async () => {
        const a = await (0, monthly_decision_pack_zip_1.createDecisionPackZip)(files);
        const b = await (0, monthly_decision_pack_zip_1.createDecisionPackZip)(files);
        expect(a.equals(b)).toBe(true);
        expect((0, node_crypto_1.createHash)('sha256').update(a).digest('hex')).toBe((0, node_crypto_1.createHash)('sha256').update(b).digest('hex'));
        for (const filename of Object.keys(files))
            expect(a.includes(Buffer.from(filename))).toBe(true);
    });
    test('rejects oversized uncompressed content before returning a partial archive', async () => {
        const oversized = { ...files, 'notable_changes.json': 'x'.repeat(12 * 1024 * 1024 + 1) };
        await expect((0, monthly_decision_pack_zip_1.createDecisionPackZip)(oversized)).rejects.toThrow('decision_pack_uncompressed_limit');
    });
});
//# sourceMappingURL=monthly_decision_pack_zip.test.js.map