"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_contract_1 = require("./runtime_contract");
describe('runtime language pack resolution', () => {
    it('resolves only the requested published target', () => {
        const pointer = { studyTarget: 'fr', sourceLocale: 'en', packId: 'fr-a1', revision: 4, contentHash: 'h', activatedAt: '2026-07-10', activatedBy: 'admin' };
        const catalog = [{ studyTarget: 'fr', displayName: 'French', sourceLocale: 'en', active: true, activePackIds: { lessons: 'fr-a1' }, activePackRevisions: { lessons: 4 }, activePackHashes: { lessons: 'h' } }];
        expect((0, runtime_contract_1.resolveRuntimePack)({ requestedTarget: 'fr', requestedSurface: 'lessons', catalog, pointers: [pointer] })).toMatchObject({ studyTarget: 'fr', packId: 'fr-a1' });
        expect((0, runtime_contract_1.resolveRuntimePack)({ requestedTarget: 'es', requestedSurface: 'lessons', catalog, pointers: [pointer] })).toBeNull();
        expect((0, runtime_contract_1.resolveRuntimePack)({ requestedTarget: 'fr', requestedSurface: 'lessons', catalog: [{ ...catalog[0], activePackRevisions: { lessons: 3 } }], pointers: [pointer] })).toBeNull();
    });
});
//# sourceMappingURL=runtime_contract.test.js.map