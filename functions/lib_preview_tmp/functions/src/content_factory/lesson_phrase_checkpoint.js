"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLessonPhraseCheckpoint = createLessonPhraseCheckpoint;
exports.missingLessonPhraseChunkIndexes = missingLessonPhraseChunkIndexes;
exports.acceptLessonPhraseChunk = acceptLessonPhraseChunk;
exports.assembleLessonPhraseCheckpoint = assembleLessonPhraseCheckpoint;
exports.parseLessonPhraseCheckpoint = parseLessonPhraseCheckpoint;
const node_crypto_1 = require("node:crypto");
const lesson_artifacts_1 = require("./lesson_artifacts");
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
    return value;
}
function hash(value) { return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function checkpointHash(value) { return hash(value); }
function buildCheckpoint(expected, chunks) {
    const acceptedCount = chunks.filter(Boolean).length * 10;
    const base = { version: 1, stageId: expected.stageId, revision: expected.revision, groundingHash: expected.groundingHash, requestedTotal: 50, chunkSize: 10, totalChunks: 5, chunks: Object.freeze([...chunks]), acceptedCount, missingCount: 50 - acceptedCount, publishable: false, qualityState: 'structural_pass_pending_linguistic_review' };
    return Object.freeze({ ...base, contentHash: checkpointHash(base) });
}
function assertExpected(expected) {
    if (!expected.stageId || !Number.isSafeInteger(expected.revision) || expected.revision < 1 || !/^[a-f0-9]{64}$/i.test(expected.groundingHash) || !expected.cefr || !expected.sourceLocale || !expected.studyTarget)
        throw new Error('lesson_phrase_checkpoint_identity_invalid');
}
function createLessonPhraseCheckpoint(expected) {
    assertExpected(expected);
    return buildCheckpoint(expected, [null, null, null, null, null]);
}
function missingLessonPhraseChunkIndexes(checkpoint) {
    return Object.freeze(checkpoint.chunks.map((chunk, index) => chunk ? -1 : index).filter((index) => index >= 0));
}
function acceptLessonPhraseChunk(checkpoint, chunkIndex, artifactValue, expected, generationReceipt) {
    parseLessonPhraseCheckpoint(checkpoint, expected);
    if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= 5)
        throw new Error('lesson_phrase_chunk_index_invalid');
    const artifactRecord = record(artifactValue);
    if (!artifactRecord || artifactRecord.stage !== 'lesson_phrases' || !Array.isArray(artifactRecord.items) || (0, lesson_artifacts_1.validateLessonStageArtifact)(artifactRecord, { kind: 'lesson_phrases', count: 10, cefr: expected.cefr, grounding: expected.grounding, strictV3: true, sourceLocale: expected.sourceLocale, studyTarget: expected.studyTarget }).length)
        throw new Error('lesson_phrase_chunk_invalid');
    const artifact = Object.freeze({ stage: 'lesson_phrases', items: Object.freeze(artifactRecord.items.map((item) => Object.freeze({ ...(record(item) ?? {}) }))), coverageReceipt: artifactRecord.coverageReceipt });
    const contentHash = hash(artifact);
    const existing = checkpoint.chunks[chunkIndex];
    if (existing) {
        if (existing.contentHash !== contentHash)
            throw new Error('lesson_phrase_chunk_immutable');
        return checkpoint;
    }
    const existingItems = checkpoint.chunks.flatMap((chunk) => chunk?.artifact.items ?? []);
    const allItems = [...existingItems, ...artifact.items];
    const ids = allItems.map((item) => String(item.id ?? '').trim());
    const meanings = allItems.map((item) => String(item.meaningKey ?? '').normalize('NFKC').toLowerCase().trim());
    const pairs = allItems.map((item) => `${String(item.sourceText ?? '').normalize('NFKC').toLowerCase()}\n${String(item.targetText ?? '').normalize('NFKC').toLowerCase()}`);
    if (new Set(ids).size !== ids.length || new Set(meanings).size !== meanings.length || new Set(pairs).size !== pairs.length)
        throw new Error('lesson_phrase_chunk_cross_duplicate');
    const chunks = [...checkpoint.chunks];
    chunks[chunkIndex] = Object.freeze({ chunkIndex, artifact, contentHash, ...(generationReceipt ? { generationReceipt: Object.freeze({ ...generationReceipt }) } : {}) });
    return buildCheckpoint(expected, chunks);
}
function assembleLessonPhraseCheckpoint(checkpoint, expected) {
    const parsed = parseLessonPhraseCheckpoint(checkpoint, expected);
    if (parsed.missingCount !== 0 || parsed.chunks.some((chunk) => !chunk))
        throw new Error('lesson_phrase_checkpoint_incomplete');
    const chunks = parsed.chunks;
    const artifact = Object.freeze({ stage: 'lesson_phrases', items: Object.freeze(chunks.flatMap((chunk) => chunk.artifact.items)), coverageReceipt: chunks[0].artifact.coverageReceipt });
    const errors = (0, lesson_artifacts_1.validateLessonStageArtifact)(artifact, { kind: 'lesson_phrases', count: 50, cefr: expected.cefr, grounding: expected.grounding, strictV3: true, sourceLocale: expected.sourceLocale, studyTarget: expected.studyTarget });
    if (errors.length)
        throw new Error(`lesson_phrase_assembly_invalid:${errors.join(',')}`);
    return artifact;
}
function parseLessonPhraseCheckpoint(value, expected) {
    assertExpected(expected);
    const input = record(value);
    if (!input || input.version !== 1 || input.stageId !== expected.stageId || input.revision !== expected.revision || input.groundingHash !== expected.groundingHash || input.requestedTotal !== 50 || input.chunkSize !== 10 || input.totalChunks !== 5 || input.publishable !== false || input.qualityState !== 'structural_pass_pending_linguistic_review' || !Array.isArray(input.chunks) || input.chunks.length !== 5)
        throw new Error('lesson_phrase_checkpoint_identity_mismatch');
    const chunks = input.chunks.map((chunk, index) => {
        if (chunk === null)
            return null;
        const item = record(chunk);
        const artifact = record(item?.artifact);
        if (!item || item.chunkIndex !== index || !artifact || typeof item.contentHash !== 'string' || hash(artifact) !== item.contentHash || (0, lesson_artifacts_1.validateLessonStageArtifact)(artifact, { kind: 'lesson_phrases', count: 10, cefr: expected.cefr, grounding: expected.grounding, strictV3: true, sourceLocale: expected.sourceLocale, studyTarget: expected.studyTarget }).length)
            throw new Error('lesson_phrase_checkpoint_invalid');
        return Object.freeze({ chunkIndex: index, artifact: artifact, contentHash: item.contentHash, ...(record(item.generationReceipt) ? { generationReceipt: Object.freeze({ ...record(item.generationReceipt) }) } : {}) });
    });
    const recreated = buildCheckpoint(expected, chunks);
    if (input.acceptedCount !== recreated.acceptedCount || input.missingCount !== recreated.missingCount || input.contentHash !== recreated.contentHash)
        throw new Error('lesson_phrase_checkpoint_hash_mismatch');
    const allItems = chunks.flatMap((chunk) => chunk?.artifact.items ?? []);
    const ids = allItems.map((item) => String(item.id));
    const meanings = allItems.map((item) => String(item.meaningKey));
    const pairs = allItems.map((item) => `${String(item.sourceText)}\n${String(item.targetText)}`);
    if (new Set(ids).size !== ids.length || new Set(meanings).size !== meanings.length || new Set(pairs).size !== pairs.length)
        throw new Error('lesson_phrase_checkpoint_invalid');
    return recreated;
}
//# sourceMappingURL=lesson_phrase_checkpoint.js.map