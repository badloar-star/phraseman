import { PROMPT_REGRESSION_CASES, promptRegressionManifest, promptRegressionManifestHash } from './quality_regression_corpus';
import { runPromptRegression } from './quality_regression_score';

describe('prompt regression corpus', () => {
  it('has deterministic independently recomputed manifest and report hashes', () => {
    const firstManifest = promptRegressionManifest(PROMPT_REGRESSION_CASES); const secondManifest = promptRegressionManifest(JSON.parse(JSON.stringify(PROMPT_REGRESSION_CASES)));
    expect(firstManifest.hash).toBe(secondManifest.hash); expect(firstManifest.hash).toBe(promptRegressionManifestHash());
    const changed = JSON.parse(JSON.stringify(PROMPT_REGRESSION_CASES)); changed[0].texts[0].target = 'Changed fixture';
    expect(promptRegressionManifest(changed).hash).not.toBe(firstManifest.hash);
    const first = runPromptRegression(PROMPT_REGRESSION_CASES); const second = runPromptRegression(JSON.parse(JSON.stringify(PROMPT_REGRESSION_CASES)));
    expect(first.reportHash).toBe(second.reportHash); expect(first.manifestHash).toBe(firstManifest.hash);
  });

  it('accepts every golden case and rejects every red-team case with expected hard failures', () => {
    const report = runPromptRegression(PROMPT_REGRESSION_CASES);
    expect(report.summary).toEqual({ total: PROMPT_REGRESSION_CASES.length, goldenAccepted: 3, goldenRejected: 0, redTeamRejected: PROMPT_REGRESSION_CASES.length - 3, redTeamAccepted: 0, regressions: 0, candidateFailures: 0 });
    expect(report.passed).toBe(true);
    for (const result of report.results) expect(result.actualFailures).toEqual(expect.arrayContaining(result.expectedFailures));
  });

  it('contains all named R3-R6 regression families', () => {
    const failures = new Set(PROMPT_REGRESSION_CASES.flatMap((item) => item.expectedFailures));
    for (const category of ['incomplete_phrase', 'source_calque', 'grammar_invalid', 'word_salad', 'hard_too_weak', 'ambiguous_answer', 'correct_index_mismatch', 'locale_drift', 'cefr_drift', 'semantic_duplicate', 'invented_grounding']) expect(failures).toContain(category);
  });
});
