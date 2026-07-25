"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_PROMPT_PROFILES = void 0;
exports.activePromptProfile = activePromptProfile;
exports.promptCandidateDefinitionHash = promptCandidateDefinitionHash;
exports.evaluatePromptCandidateDefinition = evaluatePromptCandidateDefinition;
exports.promptCandidateBinding = promptCandidateBinding;
exports.buildPromptPromotionReportForDefinition = buildPromptPromotionReportForDefinition;
exports.buildPromptPromotionReport = buildPromptPromotionReport;
exports.assertPromptPromotion = assertPromptPromotion;
const stage_contracts_1 = require("./stage_contracts");
const quality_regression_corpus_1 = require("./quality_regression_corpus");
const quality_regression_score_1 = require("./quality_regression_score");
const prompt_registry_1 = require("./prompt_registry");
const stage_runner_1 = require("./stage_runner");
const baseline = (0, quality_regression_score_1.runPromptRegression)(quality_regression_corpus_1.PROMPT_REGRESSION_CASES);
if (!baseline.passed || baseline.manifestHash !== (0, quality_regression_corpus_1.promptRegressionManifestHash)())
    throw new Error('active_prompt_regression_evidence_invalid');
function profile(kind) {
    const isLesson = kind.startsWith('lesson_');
    const isFlashcard = kind.startsWith('flashcard_');
    const isArena = kind.startsWith('arena_');
    const arenaQuestions = kind === 'arena_questions';
    return Object.freeze({ promptVersion: arenaQuestions ? 'v4' : isLesson || isFlashcard ? 'v3' : 'v2', schemaVersion: isLesson || isFlashcard || arenaQuestions ? 3 : 2, qaPolicy: isLesson ? 'lesson-quality-v3' : isFlashcard ? 'flashcard-studio-quality-v3' : arenaQuestions ? 'arena-studio-quality-v4' : isArena ? 'arena-studio-quality-v2' : 'question-studio-quality-v2', manifestHash: baseline.manifestHash, reportHash: baseline.reportHash });
}
exports.ACTIVE_PROMPT_PROFILES = Object.freeze(Object.fromEntries(stage_contracts_1.GENERATION_STAGE_KINDS.map((kind) => [kind, profile(kind)])));
function activePromptProfile(kind) { const value = exports.ACTIVE_PROMPT_PROFILES[kind]; if (!value)
    throw new Error('active_prompt_profile_missing'); return value; }
function promptCandidateDefinitionHash(definition) { return (0, quality_regression_corpus_1.regressionHash)({ kind: definition.kind, version: definition.version, task: definition.task, outputSchema: definition.outputSchema }); }
function schemaCompatibilityFailures(active, candidate, path = '$') {
    if (!active || typeof active !== 'object' || !candidate || typeof candidate !== 'object')
        return [`${path}:schema_node_missing`];
    const before = active;
    const after = candidate;
    const failures = [];
    for (const key of ['type', 'const'])
        if (before[key] !== undefined && before[key] !== after[key])
            failures.push(`${path}:${key}_changed`);
    if (before.additionalProperties === false && after.additionalProperties !== false)
        failures.push(`${path}:additional_properties_weakened`);
    const required = Array.isArray(before.required) ? before.required.map(String) : [];
    const nextRequired = new Set(Array.isArray(after.required) ? after.required.map(String) : []);
    required.filter((field) => !nextRequired.has(field)).forEach((field) => failures.push(`${path}:required_removed:${field}`));
    if (typeof before.minItems === 'number' && (typeof after.minItems !== 'number' || after.minItems < before.minItems))
        failures.push(`${path}:min_items_weakened`);
    if (typeof before.maxItems === 'number' && (typeof after.maxItems !== 'number' || after.maxItems > before.maxItems))
        failures.push(`${path}:max_items_weakened`);
    const beforeProperties = before.properties;
    const afterProperties = after.properties;
    if (beforeProperties)
        for (const [key, value] of Object.entries(beforeProperties))
            failures.push(...schemaCompatibilityFailures(value, afterProperties?.[key], `${path}.properties.${key}`));
    if (before.items && typeof before.items === 'object')
        failures.push(...schemaCompatibilityFailures(before.items, after.items, `${path}.items`));
    return failures;
}
function promptInvariantFailures(kind, task) {
    if (kind !== 'arena_questions')
        return [];
    const rules = [
        ['naturalness', /natural[\s\S]*idiomatic[\s\S]*meaningful/i],
        ['answer_uniqueness', /(exactly one valid answer|one answer[^.]*unambiguously correct)/i],
        ['cefr', /(inside A2|requested CEFR|within CEFR)/i],
        ['locale_direction', /source-language[\s\S]*target-language/i],
        ['grounding', /grounded[\s\S]*sourceReferences/i],
        ['option_uniqueness', /exactly four unique/i],
        ['fixed_runtime', /per-question timeout[\s\S]*scoring fields/i],
    ];
    return rules.filter(([, pattern]) => !pattern.test(task)).map(([id]) => `arena_prompt_invariant_missing:${id}`);
}
function evaluatePromptCandidateDefinition(kind, fromVersion, toVersion, definition) {
    const active = (0, prompt_registry_1.promptDefinitionFor)(kind, fromVersion);
    const identityFailures = [definition.kind !== kind ? 'candidate_kind_mismatch' : '', definition.version !== toVersion ? 'candidate_version_mismatch' : ''].filter(Boolean);
    const schemaFailures = schemaCompatibilityFailures(active.outputSchema, definition.outputSchema);
    const invariantFailures = promptInvariantFailures(kind, definition.task);
    const validatorFailures = kind === 'arena_questions' && !(0, stage_runner_1.productionValidatorSupports)(kind, toVersion) ? ['production_validator_not_connected'] : [];
    return Object.freeze([
        Object.freeze({ id: 'candidate_identity', passed: identityFailures.length === 0, failures: Object.freeze(identityFailures) }),
        Object.freeze({ id: 'schema_compatibility', passed: schemaFailures.length === 0, failures: Object.freeze(schemaFailures) }),
        Object.freeze({ id: 'versioned_prompt_invariants', passed: invariantFailures.length === 0, failures: Object.freeze(invariantFailures) }),
        Object.freeze({ id: 'production_validator', passed: validatorFailures.length === 0, failures: Object.freeze(validatorFailures) }),
    ]);
}
function candidateBindingForDefinition(kind, fromVersion, toVersion, definition) {
    return Object.freeze({ kind, fromVersion, toVersion, definitionHash: promptCandidateDefinitionHash(definition) });
}
function promptCandidateBinding(kind, fromVersion, toVersion) {
    return candidateBindingForDefinition(kind, fromVersion, toVersion, (0, prompt_registry_1.promptDefinitionFor)(kind, toVersion));
}
function buildPromptPromotionReportForDefinition(kind, fromVersion, toVersion, definition) {
    return (0, quality_regression_score_1.runPromptRegression)(quality_regression_corpus_1.PROMPT_REGRESSION_CASES, candidateBindingForDefinition(kind, fromVersion, toVersion, definition), evaluatePromptCandidateDefinition(kind, fromVersion, toVersion, definition));
}
function buildPromptPromotionReport(kind, fromVersion, toVersion) { return buildPromptPromotionReportForDefinition(kind, fromVersion, toVersion, (0, prompt_registry_1.promptDefinitionFor)(kind, toVersion)); }
function assertPromptPromotion(input) {
    const active = activePromptProfile(input.kind);
    if (active.promptVersion !== input.fromVersion)
        throw new Error('prompt_promotion_active_version_mismatch');
    const from = Number(input.fromVersion.replace(/^v/, ''));
    const to = Number(input.toVersion.replace(/^v/, ''));
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || to !== from + 1)
        throw new Error('prompt_promotion_version_nonconsecutive');
    const expectedManifestHash = (0, quality_regression_corpus_1.promptRegressionManifestHash)();
    if (input.manifestHash !== expectedManifestHash || input.report.manifestHash !== expectedManifestHash)
        throw new Error('prompt_promotion_manifest_mismatch');
    const expectedCandidate = promptCandidateBinding(input.kind, input.fromVersion, input.toVersion);
    if (JSON.stringify(input.report.candidate) !== JSON.stringify(expectedCandidate))
        throw new Error('prompt_promotion_candidate_mismatch');
    const { reportHash, ...reportBody } = input.report;
    if ((0, quality_regression_corpus_1.regressionHash)(reportBody) !== reportHash)
        throw new Error('prompt_promotion_report_hash_invalid');
    const recomputed = buildPromptPromotionReport(input.kind, input.fromVersion, input.toVersion);
    if (!input.report.passed || input.report.summary.regressions !== 0 || input.report.summary.candidateFailures !== 0 || input.report.reportHash !== recomputed.reportHash)
        throw new Error('prompt_promotion_regression_gate_failed');
    return Object.freeze({ kind: input.kind, fromVersion: input.fromVersion, toVersion: input.toVersion, manifestHash: expectedManifestHash, reportHash: input.report.reportHash });
}
//# sourceMappingURL=prompt_promotion_registry.js.map