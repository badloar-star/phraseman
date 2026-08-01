"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENERATION_STAGE_KINDS = void 0;
exports.createGenerationStageUnit = createGenerationStageUnit;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
exports.GENERATION_STAGE_KINDS = Object.freeze([
    'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
    'quiz_topic', 'quiz_questions', 'challenge_topic', 'challenge_questions', 'quiz_question_replacement', 'challenge_question_replacement', 'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement', 'arena_topic', 'arena_questions', 'arena_question_replacement',
]);
// зачем: R7 (see fixtures/r7/v3_staged_release.json) committed an arena_questions stage on prompt
// v3/schema 3 before the Arena question-quality prompt was promoted to v4 (prompt_promotion_registry.ts
// now resolves arena_questions to v4/arena-studio-quality-v4). That stage stays readable for historical
// audit, but must never be reusable to build a NEW release preview. createGenerationStageUnit can't
// import prompt_promotion_registry.ts (it depends on this module — circular), so retired
// kind+promptVersion pairs are pinned here explicitly and reviewed by hand whenever a prompt is promoted.
const RETIRED_STAGE_VERSIONS = Object.freeze(new Set(['arena_questions:v3']));
function createGenerationStageUnit(input) {
    if (!TOKEN_RE.test(input.requestId) || !exports.GENERATION_STAGE_KINDS.includes(input.kind) || !LOCALE_RE.test(input.studyTarget) || !LOCALE_RE.test(input.sourceLocale) || !TOKEN_RE.test(input.scopeId) || !Number.isSafeInteger(input.schemaVersion) || input.schemaVersion < 1 || !TOKEN_RE.test(input.promptVersion) || !Number.isSafeInteger(input.count) || input.count < 1 || input.count > 1000 || !TOKEN_RE.test(input.qaPolicy) || !Number.isSafeInteger(input.revision) || input.revision < 1 || input.prerequisiteArtifactIds.some((id) => typeof id !== 'string' || !id.trim())) {
        throw new Error('generation_stage_invalid');
    }
    if (RETIRED_STAGE_VERSIONS.has(`${input.kind}:${input.promptVersion}`)) {
        throw new Error('generation_stage_prompt_version_retired');
    }
    const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r${input.revision}`;
    if (!/^[A-Za-z0-9._:-]{1,500}$/.test(stageId))
        throw new Error('generation_stage_id_invalid');
    return Object.freeze({
        ...input,
        prerequisiteArtifactIds: Object.freeze([...new Set(input.prerequisiteArtifactIds)]),
        stageId,
        artifactId: `artifact:${stageId}`,
        idempotencyKey: stageId,
        state: 'queued',
    });
}
//# sourceMappingURL=stage_contracts.js.map