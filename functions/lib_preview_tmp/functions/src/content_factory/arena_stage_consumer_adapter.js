"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildArenaRuntimeDraft = buildArenaRuntimeDraft;
const node_crypto_1 = require("node:crypto");
const ARENA_LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);
const ARENA_TYPES = new Set(['translate', 'fill', 'choose', 'audio', 'complete_phrasal', 'translate_meaning', 'fill_blank', 'find_error', 'choose_phrasal']);
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function stableJson(value) { if (Array.isArray(value))
    return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
function buildArenaRuntimeDraft(input) {
    const topic = record(input.topic);
    const locale = record(topic?.localeContract);
    const policy = record(topic?.runtimePolicy);
    if (!input.requestId || !input.topicArtifactId || !topic || !ARENA_LEVELS.has(String(topic.level ?? '')) || !locale || !String(locale.studyTarget ?? '').trim() || !String(locale.learnerSourceLocale ?? '').trim() || !policy || policy.questionsPerMatch !== 10 || policy.questionTimeoutMs !== 40000 || policy.scoringPolicy !== 'arena-scoring-v1')
        throw new Error('arena_runtime_draft_policy_invalid');
    const rawItems = input.batches.flatMap((batch) => batch.items.map((item) => ({ batchArtifactId: batch.artifactId, item })));
    if (rawItems.length < 10 || rawItems.length > 50 || rawItems.length % 10 !== 0)
        throw new Error('arena_runtime_draft_question_count_invalid');
    const runtimeIds = new Set();
    const questions = rawItems.map(({ batchArtifactId, item: value }) => {
        const item = record(value);
        const options = Array.isArray(item?.options) ? item.options.map((option) => String(option).trim()) : [];
        const correctIndex = Number(item?.correctIndex);
        const correct = String(item?.correct ?? '').trim();
        const sourceId = String(item?.id ?? '').trim();
        const expectedAnswerTimeMs = Number(item?.expectedAnswerTimeMs);
        const sourceReferences = item?.sourceReferences;
        const difficulty = String(item?.difficulty ?? 'unknown');
        if (!item || !batchArtifactId || !sourceId || item.level !== topic.level || !ARENA_TYPES.has(String(item.type ?? '')) || !['easy', 'medium', 'hard', 'unknown'].includes(difficulty) || !String(item.task ?? '').trim() || !String(item.question ?? '').trim() || options.length !== 4 || options.some((option) => !option) || new Set(options).size !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3 || options[correctIndex] !== correct || options.filter((option) => option === correct).length !== 1 || !String(item.rule ?? '').trim() || !Number.isSafeInteger(expectedAnswerTimeMs) || expectedAnswerTimeMs < 2000 || expectedAnswerTimeMs > 12000 || !Array.isArray(sourceReferences) || sourceReferences.some((reference) => !String(reference).trim()))
            throw new Error('arena_runtime_draft_item_invalid');
        const idHash = (0, node_crypto_1.createHash)('sha256').update(`${input.requestId}:${input.topicArtifactId}:${batchArtifactId}:${sourceId}`).digest('hex');
        const runtimeId = `as_${idHash.slice(0, 40)}`;
        if (runtimeIds.has(runtimeId))
            throw new Error('arena_runtime_draft_item_duplicate');
        runtimeIds.add(runtimeId);
        const rand = Number.parseInt(idHash.slice(0, 12), 16) / 0x1000000000000;
        return Object.freeze({ id: runtimeId, level: String(item.level), type: String(item.type), difficulty, task: String(item.task).trim(), question: String(item.question).trim(), options: Object.freeze(options), correctIndex, correct, rule: String(item.rule).trim(), source: `content_factory_stage:${batchArtifactId}`, topicArtifactId: input.topicArtifactId, studyTarget: String(locale.studyTarget).trim(), learnerSourceLocale: String(locale.learnerSourceLocale).trim(), expectedAnswerTimeMs, sourceReferences: Object.freeze(sourceReferences.map((reference) => String(reference).trim())), rand });
    });
    const payload = Object.freeze({ schemaVersion: 'arena-runtime-draft-v1', topicArtifactId: input.topicArtifactId, questionTimeoutMs: 40000, questionCount: questions.length, questions: Object.freeze(questions) });
    return Object.freeze({ ...payload, contentHash: (0, node_crypto_1.createHash)('sha256').update(stableJson(payload)).digest('hex') });
}
//# sourceMappingURL=arena_stage_consumer_adapter.js.map