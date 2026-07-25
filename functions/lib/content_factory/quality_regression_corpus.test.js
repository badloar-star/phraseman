"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const quality_regression_corpus_1 = require("./quality_regression_corpus");
const quality_regression_score_1 = require("./quality_regression_score");
describe('prompt regression corpus', () => {
    it('has deterministic independently recomputed manifest and report hashes', () => {
        const firstManifest = (0, quality_regression_corpus_1.promptRegressionManifest)(quality_regression_corpus_1.PROMPT_REGRESSION_CASES);
        const secondManifest = (0, quality_regression_corpus_1.promptRegressionManifest)(JSON.parse(JSON.stringify(quality_regression_corpus_1.PROMPT_REGRESSION_CASES)));
        expect(firstManifest.hash).toBe(secondManifest.hash);
        expect(firstManifest.hash).toBe((0, quality_regression_corpus_1.promptRegressionManifestHash)());
        const changed = JSON.parse(JSON.stringify(quality_regression_corpus_1.PROMPT_REGRESSION_CASES));
        changed[0].texts[0].target = 'Changed fixture';
        expect((0, quality_regression_corpus_1.promptRegressionManifest)(changed).hash).not.toBe(firstManifest.hash);
        const first = (0, quality_regression_score_1.runPromptRegression)(quality_regression_corpus_1.PROMPT_REGRESSION_CASES);
        const second = (0, quality_regression_score_1.runPromptRegression)(JSON.parse(JSON.stringify(quality_regression_corpus_1.PROMPT_REGRESSION_CASES)));
        expect(first.reportHash).toBe(second.reportHash);
        expect(first.manifestHash).toBe(firstManifest.hash);
    });
    it('accepts every golden case and rejects every red-team case with expected hard failures', () => {
        const report = (0, quality_regression_score_1.runPromptRegression)(quality_regression_corpus_1.PROMPT_REGRESSION_CASES);
        expect(report.summary).toEqual({ total: quality_regression_corpus_1.PROMPT_REGRESSION_CASES.length, goldenAccepted: 4, goldenRejected: 0, redTeamRejected: quality_regression_corpus_1.PROMPT_REGRESSION_CASES.length - 4, redTeamAccepted: 0, regressions: 0, candidateFailures: 0 });
        expect(report.passed).toBe(true);
        for (const result of report.results)
            expect(result.actualFailures).toEqual(expect.arrayContaining(result.expectedFailures));
    });
    it('contains all named R3-R6 regression families', () => {
        const failures = new Set(quality_regression_corpus_1.PROMPT_REGRESSION_CASES.flatMap((item) => item.expectedFailures));
        for (const category of ['incomplete_phrase', 'source_calque', 'grammar_invalid', 'word_salad', 'hard_too_weak', 'ambiguous_answer', 'correct_index_mismatch', 'locale_drift', 'cefr_drift', 'semantic_duplicate', 'arena_runtime_invalid', 'invented_grounding'])
            expect(failures).toContain(category);
    });
});
//# sourceMappingURL=quality_regression_corpus.test.js.map