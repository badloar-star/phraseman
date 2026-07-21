"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_language_gate_1 = require("./ai_language_gate");
describe('ai_language_gate', () => {
    it('accepts target-language Cyrillic for ru', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Сегодня хороший шаг. Закрепи одну фразу спокойно.', 'ru')).toBeNull();
    });
    it('rejects English text when ru is expected', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Today you keep a good small practice step with your phrases.', 'ru')).toBe('non_target_language');
    });
    it('accepts target-language prose with quoted English examples', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('После "I" здесь нужно "have": скажи "I have a reservation."', 'ru')).toBeNull();
    });
    it('rejects quoted English when there is no target-language prose around it', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('"I have a reservation."', 'ru')).toBe('non_target_language');
    });
    it('rejects Cyrillic text when a Latin-script language is expected', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Сегодня хороший шаг. Закрепи одну фразу спокойно.', 'es')).toBe('non_target_language');
    });
    it('rejects obvious English leakage for Latin-script UI languages', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Today you keep a good small practice step with your phrases.', 'pl')).toBe('non_target_language');
    });
    it('accepts non-English Latin-script target prose', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Hoy tu práctica va con calma. Repite una frase útil.', 'es')).toBeNull();
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Dziś idziesz spokojnie. Utrwal jedną przydatną frazę.', 'pl')).toBeNull();
    });
    it('rejects mojibake before publishing learner-facing AI text', () => {
        expect((0, ai_language_gate_1.rejectGeneratedLanguageText)('Ð¡ÐµÐ³Ð¾Ð´Ð½Ñ Ñ…Ð¾Ñ€Ð¾ÑˆÐ¸Ð¹ ÑˆÐ°Ð³.', 'ru')).toBe('mojibake');
    });
});
//# sourceMappingURL=ai_language_gate.test.js.map