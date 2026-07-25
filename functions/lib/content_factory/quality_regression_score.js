"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALITY_REGRESSION_POLICY = void 0;
exports.scorePromptRegressionCase = scorePromptRegressionCase;
exports.runPromptRegression = runPromptRegression;
const quality_regression_corpus_1 = require("./quality_regression_corpus");
const quiz_challenge_artifacts_1 = require("./quiz_challenge_artifacts");
const arena_artifacts_1 = require("./arena_artifacts");
const hasCyrillic = (value) => /[А-Яа-яЁё]/.test(value);
const hasLatin = (value) => /[A-Za-z]/.test(value);
exports.QUALITY_REGRESSION_POLICY = Object.freeze({ version: 'prompt-regression-score-v1', rules: Object.freeze(['production_schema', 'production_arena_runtime', 'incomplete_phrase', 'source_calque', 'versioned_grammar_patterns', 'word_salad_patterns', 'hard_prompt_density', 'single_valid_answer', 'answer_index_identity', 'ru_en_script_direction', 'declared_cefr_identity', 'semantic_key_uniqueness', 'grounding_membership']) });
function scorePromptRegressionCase(item) {
    const failures = new Set();
    const texts = item.texts ?? [];
    const questions = item.questions ?? [];
    if (!texts.length && !questions.length && !item.semanticKeys?.length && item.arenaQuestionTimeoutMs === undefined) {
        const productionErrors = item.stageKind === 'quiz_topic' || item.stageKind === 'challenge_topic' ? (0, quiz_challenge_artifacts_1.validateTopicArtifact)({}, { kind: item.stageKind, cefr: item.expectedCefr }) : ['regression_fixture_shape_invalid'];
        if (productionErrors.length)
            failures.add('schema_invalid');
    }
    if (texts.some((pair) => pair.target.trim().toLowerCase() === 'could you show me on the map?'))
        failures.add('incomplete_phrase');
    if (texts.some((pair) => pair.source.trim().toLowerCase() === 'у вас есть это в меньшем размере?'))
        failures.add('source_calque');
    if (texts.some((pair) => /\b(i am agree|he go|she go)\b/i.test(pair.target)))
        failures.add('grammar_invalid');
    if (texts.some((pair) => /\b(i ready am|me help need|you map show)\b/i.test(pair.target)))
        failures.add('word_salad');
    if (questions.some((question) => question.difficulty === 'hard' && question.prompt.trim().split(/\s+/).length < 4))
        failures.add('hard_too_weak');
    if (questions.some((question) => question.validAnswerIndexes.length !== 1))
        failures.add('ambiguous_answer');
    if (questions.some((question) => !Number.isInteger(question.correctIndex) || question.options[question.correctIndex] !== question.correct || question.validAnswerIndexes[0] !== question.correctIndex))
        failures.add('correct_index_mismatch');
    if (item.sourceLocale === 'ru' && texts.some((pair) => !hasCyrillic(pair.source) || hasCyrillic(pair.target) || !hasLatin(pair.target)))
        failures.add('locale_drift');
    if (item.declaredCefr !== item.expectedCefr)
        failures.add('cefr_drift');
    const keys = item.semanticKeys ?? [];
    if (new Set(keys.map((key) => key.trim().toLowerCase())).size !== keys.length)
        failures.add('semantic_duplicate');
    if (item.arenaQuestionTimeoutMs !== undefined) {
        const arenaTopic = { stage: 'arena_topic', result: { topicId: 'regression-topic', title: 'Regression topic', learningPromise: 'Answer practical prompts quickly.', level: 'A2', skillTags: ['requests'], inclusions: ['requests'], exclusions: ['trivia'], allowedTypes: ['translate'], difficultyDistribution: { easy: 3, medium: 4, hard: 3 }, taskMaxChars: 120, questionMaxChars: 180, optionMaxChars: 80, ruleMaxChars: 500, targetAnswerTimeMs: 8000, runtimePolicy: { questionsPerMatch: 10, questionTimeoutMs: item.arenaQuestionTimeoutMs, scoringPolicy: 'arena-scoring-v1' }, localeContract: { studyTarget: item.studyTarget, learnerSourceLocale: item.sourceLocale }, fairnessRules: ['one answer'] } };
        if ((0, arena_artifacts_1.validateArenaTopicArtifact)(arenaTopic, { cefr: item.expectedCefr, studyTarget: item.studyTarget, sourceLocale: item.sourceLocale }).includes('arena_topic_runtime_timeout_must_be_40000'))
            failures.add('arena_runtime_invalid');
    }
    const allowed = new Set(item.allowedSourceReferences ?? []);
    if ((item.sourceReferences ?? []).some((reference) => !allowed.has(reference)))
        failures.add('invented_grounding');
    return Object.freeze({ id: item.id, expectation: item.expectation, expectedFailures: Object.freeze([...item.expectedFailures].sort()), actualFailures: Object.freeze([...failures].sort()), accepted: failures.size === 0 });
}
function runPromptRegression(cases = quality_regression_corpus_1.PROMPT_REGRESSION_CASES, candidate = null, candidateChecks = []) {
    const manifest = (0, quality_regression_corpus_1.promptRegressionManifest)(cases);
    const results = cases.map(scorePromptRegressionCase);
    let goldenAccepted = 0;
    let goldenRejected = 0;
    let redTeamRejected = 0;
    let redTeamAccepted = 0;
    let regressions = 0;
    results.forEach((result) => { if (result.expectation === 'golden_valid')
        result.accepted ? goldenAccepted++ : goldenRejected++;
    else
        result.accepted ? redTeamAccepted++ : redTeamRejected++; if (JSON.stringify(result.actualFailures) !== JSON.stringify(result.expectedFailures))
        regressions++; });
    const frozenCandidateChecks = Object.freeze(candidateChecks.map((check) => Object.freeze({ id: check.id, passed: check.passed, failures: Object.freeze([...check.failures].sort()) })));
    const candidateFailures = frozenCandidateChecks.reduce((total, check) => total + check.failures.length, 0);
    const summary = Object.freeze({ total: cases.length, goldenAccepted, goldenRejected, redTeamRejected, redTeamAccepted, regressions, candidateFailures });
    const passed = goldenRejected === 0 && redTeamAccepted === 0 && regressions === 0 && candidateFailures === 0 && frozenCandidateChecks.every((check) => check.passed);
    const policyHash = (0, quality_regression_corpus_1.regressionHash)(exports.QUALITY_REGRESSION_POLICY);
    const reportBody = { schemaVersion: 'prompt-regression-report-v2', manifestHash: manifest.hash, policyVersion: exports.QUALITY_REGRESSION_POLICY.version, policyHash, candidate: candidate ? Object.freeze({ ...candidate }) : null, candidateChecks: frozenCandidateChecks, results, summary, passed };
    return Object.freeze({ ...reportBody, reportHash: (0, quality_regression_corpus_1.regressionHash)(reportBody) });
}
//# sourceMappingURL=quality_regression_score.js.map