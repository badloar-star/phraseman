"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBulkStagePlanRequest = parseBulkStagePlanRequest;
exports.buildBulkStagePlan = buildBulkStagePlan;
const node_crypto_1 = require("node:crypto");
const stage_capabilities_1 = require("./stage_capabilities");
const stage_contracts_1 = require("./stage_contracts");
const prompt_promotion_registry_1 = require("./prompt_promotion_registry");
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const LOCALE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const FIELDS = new Set(['requestId', 'idempotencyKey', 'studyTarget', 'sourceLocale', 'cefr', 'objective', 'kinds', 'lessonRange', 'scopes', 'dependencyPolicy']);
const KINDS = new Set([
    'lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory',
    'challenge_topic', 'challenge_questions', 'challenge_question_replacement',
    'flashcard_pack_idea', 'flashcard_items', 'flashcard_item_replacement',
]);
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function canonical(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    const input = value;
    return `{${Object.keys(input).sort().map((key) => `${JSON.stringify(key)}:${canonical(input[key])}`).join(',')}}`;
}
function parseBulkStagePlanRequest(value) {
    if (!record(value) || Object.keys(value).some((key) => !FIELDS.has(key)))
        throw new Error('bulk_stage_plan_invalid');
    const requestId = String(value.requestId ?? '').trim();
    const idempotencyKey = String(value.idempotencyKey ?? '').trim();
    const studyTarget = String(value.studyTarget ?? '').trim();
    const sourceLocale = String(value.sourceLocale ?? '').trim();
    const cefr = String(value.cefr ?? '').trim();
    const objective = String(value.objective ?? '').trim();
    const dependencyPolicy = String(value.dependencyPolicy ?? '');
    const kinds = Array.isArray(value.kinds) ? [...new Set(value.kinds.map(String))].sort() : [];
    if (!TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey) || !LOCALE_RE.test(studyTarget) || !LOCALE_RE.test(sourceLocale) || !objective || objective.length > 1000 || dependencyPolicy !== 'approved_only' || kinds.length === 0 || kinds.some((kind) => !KINDS.has(kind)))
        throw new Error('bulk_stage_plan_invalid');
    const hasRange = value.lessonRange !== undefined;
    const hasScopes = value.scopes !== undefined;
    if (hasRange === hasScopes)
        throw new Error('bulk_stage_scope_mode_invalid');
    let scopes;
    if (hasRange) {
        if (!record(value.lessonRange))
            throw new Error('bulk_stage_lesson_range_invalid');
        const start = Number(value.lessonRange.start);
        const end = Number(value.lessonRange.end);
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > 32 || kinds.some((kind) => (0, stage_capabilities_1.stageCapability)(kind).scopeType !== 'lesson'))
            throw new Error('bulk_stage_lesson_range_invalid');
        scopes = Array.from({ length: end - start + 1 }, (_, index) => `lesson-${start + index}`);
    }
    else {
        scopes = Array.isArray(value.scopes) ? [...new Set(value.scopes.map(String))].sort() : [];
        if (scopes.length === 0 || scopes.some((scope) => !TOKEN_RE.test(scope)))
            throw new Error('bulk_stage_plan_invalid');
        for (const kind of kinds) {
            const prefix = `${(0, stage_capabilities_1.stageCapability)(kind).scopeType}-`;
            if (scopes.some((scope) => !scope.startsWith(prefix)))
                throw new Error('bulk_stage_scope_kind_invalid');
        }
    }
    if (scopes.length * kinds.length > 100)
        throw new Error('bulk_stage_plan_too_large');
    return Object.freeze({ requestId, idempotencyKey, studyTarget, sourceLocale, cefr, objective, kinds: Object.freeze(kinds), scopes: Object.freeze(scopes), dependencyPolicy: 'approved_only' });
}
function buildBulkStagePlan(input, approved) {
    const units = [];
    const conflicts = [];
    for (const scopeId of input.scopes) {
        for (const kind of input.kinds) {
            const capability = (0, stage_capabilities_1.stageCapability)(kind);
            const matchesByKind = capability.prerequisiteKinds.map((prerequisiteKind) => ({
                prerequisiteKind,
                matches: approved.filter((candidate) => candidate.requestId === input.requestId && candidate.kind === prerequisiteKind && candidate.scopeId === scopeId && candidate.studyTarget === input.studyTarget && candidate.sourceLocale === input.sourceLocale && candidate.state === 'approved'),
            }));
            const invalid = matchesByKind.find(({ matches }) => matches.length !== 1);
            if (invalid) {
                conflicts.push({ kind, scopeId, code: invalid.matches.length === 0 ? 'approved_prerequisite_missing' : 'approved_prerequisite_ambiguous', prerequisiteKind: invalid.prerequisiteKind });
                continue;
            }
            const count = capability.count.fixed ?? capability.count.min;
            (0, stage_capabilities_1.assertStageCapabilityRequest)({ kind, count, cefr: input.cefr, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, prerequisiteKinds: capability.prerequisiteKinds });
            const activePrompt = (0, prompt_promotion_registry_1.activePromptProfile)(kind);
            units.push((0, stage_contracts_1.createGenerationStageUnit)({
                requestId: input.requestId, kind, studyTarget: input.studyTarget, sourceLocale: input.sourceLocale, scopeId,
                schemaVersion: activePrompt.schemaVersion,
                promptVersion: activePrompt.promptVersion,
                count,
                prerequisiteArtifactIds: matchesByKind.map(({ matches }) => matches[0].artifactId),
                qaPolicy: activePrompt.qaPolicy,
                revision: 1,
            }));
        }
    }
    units.sort((a, b) => a.stageId.localeCompare(b.stageId));
    conflicts.sort((a, b) => `${a.scopeId}:${a.kind}`.localeCompare(`${b.scopeId}:${b.kind}`));
    const normalized = {
        ...input,
        kinds: [...input.kinds],
        scopes: [...input.scopes],
        resolvedPrerequisites: units.map((unit) => ({ stageId: unit.stageId, prerequisiteArtifactIds: [...unit.prerequisiteArtifactIds] })),
        conflicts,
    };
    const planFingerprint = (0, node_crypto_1.createHash)('sha256').update(`content-stage-bulk-v1\n${canonical(normalized)}`).digest('hex');
    return Object.freeze({
        planId: `bulk:${input.requestId}:${input.idempotencyKey}`,
        planFingerprint,
        units: Object.freeze(units),
        conflicts: Object.freeze(conflicts),
        progress: Object.freeze({ planned: units.length, queued: units.length, completed: 0, failed: 0 }),
    });
}
//# sourceMappingURL=bulk_stage_plan.js.map