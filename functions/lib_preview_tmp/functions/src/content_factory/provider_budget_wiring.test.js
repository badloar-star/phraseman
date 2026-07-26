"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
describe('content factory provider request budget wiring', () => {
    const stageWorker = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'content_stage_worker.ts'), 'utf8');
    const legacyWorker = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'content_factory_worker.ts'), 'utf8');
    test.each([['stage', stageWorker], ['legacy', legacyWorker]])('%s reserves by provider request index before transport', (_name, source) => {
        expect(source).toContain('beforeProviderRequest: async (requestIndex)');
        expect(source).toContain('provider-request:${requestIndex}');
    });
    test('stage no longer reserves one logical unit before a repair-capable run', () => {
        expect(stageWorker).not.toContain('`${stageId}:attempt:${attempt}`, config.globalDailyCap');
    });
});
//# sourceMappingURL=provider_budget_wiring.test.js.map