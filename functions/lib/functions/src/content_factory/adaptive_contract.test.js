"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adaptive_contract_1 = require("./adaptive_contract");
describe('adaptive generation contract', () => {
    it('keeps generated practice user-scoped and bounded', () => {
        const input = { userId: 'u1', studyTarget: 'fr', surface: 'quiz', sourceLessonIds: [1, 2], maxItems: 10, reason: 'repeated_mistakes', activePackRevision: 4, expiresAt: new Date(Date.now() + 60000).toISOString() };
        (0, adaptive_contract_1.validateAdaptiveGenerationRequest)(input);
        expect((0, adaptive_contract_1.adaptiveGenerationStoragePath)(input)).toBe('users/u1/adaptive_content/fr/quiz/r4');
        expect(() => (0, adaptive_contract_1.validateAdaptiveGenerationRequest)({ ...input, maxItems: 21 })).toThrow('max_items_exceeded');
        expect(() => (0, adaptive_contract_1.validateAdaptiveGenerationRequest)({ ...input, userId: '../u1' })).toThrow('validation_failed');
    });
});
//# sourceMappingURL=adaptive_contract.test.js.map