"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quiz_explain_cache_1 = require("./quiz_explain_cache");
describe('quiz_explain_cache — hashing', () => {
    it('is stable for the same inputs', () => {
        const a = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
        const b = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
        expect(a).toBe(b);
        expect(a).toHaveLength(40);
    });
    it('is independent of option ORDER (thematic choices shuffle at runtime)', () => {
        const a = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl', 'Chair'], 'ru');
        const b = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Chair', 'Knife', 'Bowl', 'Cup'], 'ru');
        expect(a).toBe(b);
    });
    it('differs for a different option SET', () => {
        const a = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl'], 'ru');
        const b = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Plate'], 'ru');
        expect(a).not.toBe(b);
    });
    it('differs by language', () => {
        const ru = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup'], 'ru');
        const en = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup'], 'en');
        expect(ru).not.toBe(en);
    });
    it('normalizes the correct phrase (case/punctuation/space)', () => {
        const a = (0, quiz_explain_cache_1.quizHashFor)('  KNIFE! ', ['Knife', 'Cup'], 'ru');
        const b = (0, quiz_explain_cache_1.quizHashFor)('knife', ['Knife', 'Cup'], 'ru');
        expect(a).toBe(b);
    });
    it('de-dupes the option set so a repeated option does not fork the cache', () => {
        const a = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl'], 'ru');
        const b = (0, quiz_explain_cache_1.quizHashFor)('Knife', ['Knife', 'Cup', 'Bowl', 'Cup'], 'ru');
        expect(a).toBe(b);
    });
    it('normalizeQuizOption lowercases and trims', () => {
        expect((0, quiz_explain_cache_1.normalizeQuizOption)('  Knife! ')).toBe('knife');
    });
});
//# sourceMappingURL=quiz_explain_cache.test.js.map