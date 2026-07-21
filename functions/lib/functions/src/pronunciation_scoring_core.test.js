"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pronunciation_scoring_core_1 = require("./pronunciation_scoring_core");
describe('pronunciation scoring core', () => {
    it('passes exact and punctuation-only transcript matches at the 90 percent threshold', () => {
        const result = (0, pronunciation_scoring_core_1.scorePronunciationTranscript)({
            targetText: 'The next steps are clear.',
            transcript: 'The next steps are clear',
        });
        expect(result.score).toBe(100);
        expect(result.threshold).toBe(pronunciation_scoring_core_1.PRONUNCIATION_PASS_THRESHOLD);
        expect(result.passed).toBe(true);
    });
    it('blocks incomplete pronunciation below 90 percent', () => {
        const result = (0, pronunciation_scoring_core_1.scorePronunciationTranscript)({
            targetText: 'The next steps are clear.',
            transcript: 'The next steps',
        });
        expect(result.score).toBeLessThan(90);
        expect(result.passed).toBe(false);
    });
    it('blocks reordered words even when most words are present', () => {
        const result = (0, pronunciation_scoring_core_1.scorePronunciationTranscript)({
            targetText: 'Could you repeat that?',
            transcript: 'Repeat could you that',
        });
        expect(result.score).toBeLessThan(90);
        expect(result.passed).toBe(false);
    });
});
//# sourceMappingURL=pronunciation_scoring_core.test.js.map