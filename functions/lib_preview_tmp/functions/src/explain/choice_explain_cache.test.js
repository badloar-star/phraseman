"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const choice_explain_cache_1 = require("./choice_explain_cache");
describe('choice_explain_cache — hashing', () => {
    it('is stable for the same inputs', () => {
        const a = (0, choice_explain_cache_1.choiceHashFor)("I'm fine, thanks.", ['We are all okay.', 'He is not here.'], 'ru');
        const b = (0, choice_explain_cache_1.choiceHashFor)("I'm fine, thanks.", ['We are all okay.', 'He is not here.'], 'ru');
        expect(a).toBe(b);
        expect(a).toHaveLength(40);
    });
    it('is independent of distractor ORDER', () => {
        const a = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['a', 'b', 'c'], 'ru');
        const b = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['c', 'a', 'b'], 'ru');
        expect(a).toBe(b);
    });
    it('differs for a different distractor SET', () => {
        const a = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['a', 'b'], 'ru');
        const b = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['a', 'c'], 'ru');
        expect(a).not.toBe(b);
    });
    it('differs by language', () => {
        const ru = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['a'], 'ru');
        const en = (0, choice_explain_cache_1.choiceHashFor)('Hi', ['a'], 'en');
        expect(ru).not.toBe(en);
    });
    it('normalizes the correct phrase (case/punctuation/space)', () => {
        const a = (0, choice_explain_cache_1.choiceHashFor)('  HELLO! ', ['a'], 'ru');
        const b = (0, choice_explain_cache_1.choiceHashFor)('hello', ['a'], 'ru');
        expect(a).toBe(b);
    });
    it('normalizeChoiceOption lowercases and trims', () => {
        expect((0, choice_explain_cache_1.normalizeChoiceOption)('  Hello! ')).toBe('hello');
    });
});
//# sourceMappingURL=choice_explain_cache.test.js.map