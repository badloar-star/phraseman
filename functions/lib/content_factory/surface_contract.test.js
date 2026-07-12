"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const surface_contract_1 = require("./surface_contract");
describe('generated quiz/card/arena surface contract', () => {
    it('requires pack identity and rejects cross-language delivery', () => {
        const item = { id: 'q1', packId: 'fr-a1', studyTarget: 'fr', revision: 4, contentHash: 'hash-fr', sourceLocale: 'en', lessonId: 1, surface: 'arena_questions', difficulty: 'beginner' };
        (0, surface_contract_1.validateGeneratedSurfaceItem)(item);
        expect(() => (0, surface_contract_1.assertSurfaceMatchesPack)(item, { packId: 'fr-a1', studyTarget: 'fr', revision: 3, contentHash: 'hash-fr', sourceLocale: 'en' })).toThrow('cross_language_or_revision_mismatch');
    });
});
//# sourceMappingURL=surface_contract.test.js.map