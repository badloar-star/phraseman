"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
}));
const ai_language_contract_1 = require("./ai_language_contract");
describe('ai_language_contract', () => {
    it('keeps supported UI output languages exact', () => {
        expect(ai_language_contract_1.LANGUAGE_CONTRACT_VERSION).toBe('ai-language-contract-v1');
        expect((0, ai_language_contract_1.resolveAiOutputLang)('pt-BR', 'explain')).toBe('pt-BR');
        expect((0, ai_language_contract_1.resolveAiOutputLang)('PT-br', 'explain')).toBe('pt-BR');
        expect((0, ai_language_contract_1.resolveAiOutputLang)('uk', 'weekly_review')).toBe('uk');
        expect((0, ai_language_contract_1.resolveAiOutputLang)('tr', 'help_board')).toBe('tr');
    });
    it('fails closed for unsupported output languages', () => {
        expect(() => (0, ai_language_contract_1.resolveAiOutputLang)('xx', 'explain')).toThrow('explain_unsupported_language');
        expect(() => (0, ai_language_contract_1.resolveAiOutputLang)('xx', 'help_board')).toThrow('help_board_unsupported_language');
    });
    it('preserves French study target separately from interface language', () => {
        expect((0, ai_language_contract_1.resolveStudyTarget)('fr')).toBe('fr');
        expect((0, ai_language_contract_1.resolveStudyTarget)('en')).toBe('en');
        expect((0, ai_language_contract_1.resolveStudyTarget)('xx')).toBe('en');
    });
    it('rejects visible JSON fields that look like the wrong language', () => {
        expect(() => (0, ai_language_contract_1.assertAiJsonTextFieldsLanguage)({
            targetLang: 'ru',
            feature: 'weekly_review',
            texts: ['Today you keep a good small practice step with your phrases.'],
        })).toThrow('weekly_review_wrong_language');
    });
});
//# sourceMappingURL=ai_language_contract.test.js.map