"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const explain_gates_1 = require("./explain_gates");
describe('explain_gates — input validation', () => {
    it('accepts a normal phrase + meaning', () => {
        const r = (0, explain_gates_1.validateExplainInput)({ phraseEn: 'Break a leg', phraseMeaning: 'Удачи!', lang: 'ru' });
        expect(r.ok).toBe(true);
    });
    it('rejects an empty phraseEn', () => {
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: '', phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: '   ', phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
    });
    it('rejects a phraseEn longer than MAX_PHRASE_LEN', () => {
        const long = 'a'.repeat(explain_gates_1.MAX_PHRASE_LEN + 1);
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: long, phraseMeaning: 'x', lang: 'ru' }).ok).toBe(false);
    });
    it('rejects a missing/empty phraseMeaning (it feeds the fallback)', () => {
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: 'Hello', phraseMeaning: '', lang: 'ru' }).ok).toBe(false);
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: 'Hello', phraseMeaning: undefined, lang: 'ru' }).ok).toBe(false);
    });
    it('rejects a phraseMeaning longer than MAX_MEANING_LEN', () => {
        const long = 'я'.repeat(explain_gates_1.MAX_MEANING_LEN + 1);
        expect((0, explain_gates_1.validateExplainInput)({ phraseEn: 'Hello', phraseMeaning: long, lang: 'ru' }).ok).toBe(false);
    });
});
describe('explain_gates — output sanitizer', () => {
    it('strips markdown emphasis and code fences', () => {
        const out = (0, explain_gates_1.sanitizeExplanationOutput)('**Hello** _world_ `code`');
        expect(out).not.toMatch(/[*_`]/);
        expect(out).toContain('Hello');
    });
    it('strips leading list/heading markers and stage directions', () => {
        const out = (0, explain_gates_1.sanitizeExplanationOutput)('# Title\n- item\n(He smiles) Hi there');
        expect(out).not.toMatch(/^#/m);
        expect(out).not.toMatch(/^- /m);
    });
    it('collapses excessive whitespace and trims', () => {
        expect((0, explain_gates_1.sanitizeExplanationOutput)('  a\n\n\n b  ')).toBe('a\n\nb');
    });
});
describe('explain_gates — language-aware wrong-script (the prod-bug guard)', () => {
    it('expects Cyrillic for ru/uk and Latin for en/es', () => {
        expect((0, explain_gates_1.expectedScriptFor)('ru')).toBe('cyrillic');
        expect((0, explain_gates_1.expectedScriptFor)('uk')).toBe('cyrillic');
        expect((0, explain_gates_1.expectedScriptFor)('en')).toBe('latin');
        expect((0, explain_gates_1.expectedScriptFor)('es')).toBe('latin');
    });
    it('a valid Russian explanation (Cyrillic) is NOT wrong-script for lang=ru', () => {
        const ratio = (0, explain_gates_1.wrongScriptRatio)('Это значит пожелать удачи перед выступлением.', 'ru');
        expect(ratio).toBeLessThan(explain_gates_1.MAX_WRONG_SCRIPT_RATIO);
    });
    it('an English explanation IS wrong-script when lang=ru', () => {
        const ratio = (0, explain_gates_1.wrongScriptRatio)('This means good luck before a show.', 'ru');
        expect(ratio).toBeGreaterThan(explain_gates_1.MAX_WRONG_SCRIPT_RATIO);
    });
    it('a valid English explanation is NOT wrong-script for lang=en', () => {
        const ratio = (0, explain_gates_1.wrongScriptRatio)('This means good luck before a show.', 'en');
        expect(ratio).toBeLessThan(explain_gates_1.MAX_WRONG_SCRIPT_RATIO);
    });
    it('ignores digits/punctuation/spaces when computing the ratio', () => {
        // only letters count; "5 минут — это 300 секунд" is Cyrillic letters + digits
        const ratio = (0, explain_gates_1.wrongScriptRatio)('5 минут — это 300 секунд!', 'ru');
        expect(ratio).toBeLessThan(explain_gates_1.MAX_WRONG_SCRIPT_RATIO);
    });
});
describe('explain_gates — heuristicReject (pre-filter before the paid judge)', () => {
    it('rejects empty / whitespace output', () => {
        expect((0, explain_gates_1.heuristicReject)('', 'ru')).toBe('empty');
        expect((0, explain_gates_1.heuristicReject)('   ', 'ru')).toBe('empty');
    });
    it('rejects output shorter than MIN_OUTPUT_LEN as too_short', () => {
        expect((0, explain_gates_1.heuristicReject)('Да', 'ru')).toBe('too_short'); // < 5 chars
    });
    it('rejects wrong-script output', () => {
        expect((0, explain_gates_1.heuristicReject)('This is in English not Russian', 'ru')).toBe('non_target_language');
    });
    it('returns null (passes to judge) for a plausible Russian explanation', () => {
        expect((0, explain_gates_1.heuristicReject)('Это значит пожелать кому-то удачи.', 'ru')).toBeNull();
    });
    it('returns null for a plausible English explanation when lang=en', () => {
        expect((0, explain_gates_1.heuristicReject)('It means to wish someone good luck.', 'en')).toBeNull();
    });
});
//# sourceMappingURL=explain_gates.test.js.map