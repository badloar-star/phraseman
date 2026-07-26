"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlashcardPartialCheckpoint = createFlashcardPartialCheckpoint;
exports.parseFlashcardPartialCheckpoint = parseFlashcardPartialCheckpoint;
exports.mergeFlashcardPartialCheckpoint = mergeFlashcardPartialCheckpoint;
const node_crypto_1 = require("node:crypto");
const flashcard_artifacts_1 = require("./flashcard_artifacts");
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function hashPayload(requestedTotal, items) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ requestedTotal, items })).digest('hex');
}
function createFlashcardPartialCheckpoint(artifact, requestedTotal, grounding) {
    const output = record(artifact);
    if (!Number.isSafeInteger(requestedTotal) || requestedTotal < 1 || requestedTotal > 20 || output?.stage !== 'flashcard_items' || !Array.isArray(output.items))
        return null;
    if (output.items.length < 1 || output.items.length >= requestedTotal)
        return null;
    if ((0, flashcard_artifacts_1.validateFlashcardItemsArtifact)(output, { count: output.items.length, grounding }).length)
        return null;
    const items = output.items;
    const ids = items.map((item) => String(item.id ?? '').trim());
    const keys = items.map(flashcard_artifacts_1.flashcardSemanticKey);
    if (new Set(ids).size !== ids.length || new Set(keys).size !== keys.length)
        return null;
    const acceptedItems = Object.freeze(items.map((item) => Object.freeze({ ...item })));
    return Object.freeze({ requestedTotal, acceptedCount: items.length, missingCount: requestedTotal - items.length, acceptedItems, acceptedIds: Object.freeze(ids), acceptedSemanticKeys: Object.freeze(keys), contentHash: hashPayload(requestedTotal, acceptedItems) });
}
function parseFlashcardPartialCheckpoint(value, requestedTotal) {
    const input = record(value);
    if (!input || input.requestedTotal !== requestedTotal || !Number.isSafeInteger(requestedTotal) || requestedTotal < 1 || requestedTotal > 20)
        throw new Error('flashcard_partial_checkpoint_identity_mismatch');
    if (!Array.isArray(input.acceptedItems) || !Array.isArray(input.acceptedIds) || !Array.isArray(input.acceptedSemanticKeys))
        throw new Error('flashcard_partial_checkpoint_invalid');
    const recreated = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: input.acceptedItems }, requestedTotal, { packIdea: {}, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] });
    if (!recreated || recreated.acceptedCount !== input.acceptedCount || recreated.missingCount !== input.missingCount || JSON.stringify(recreated.acceptedIds) !== JSON.stringify(input.acceptedIds) || JSON.stringify(recreated.acceptedSemanticKeys) !== JSON.stringify(input.acceptedSemanticKeys))
        throw new Error('flashcard_partial_checkpoint_invalid');
    if (input.contentHash !== recreated.contentHash)
        throw new Error('flashcard_partial_checkpoint_hash_mismatch');
    return recreated;
}
function mergeFlashcardPartialCheckpoint(checkpoint, retryArtifact, grounding) {
    const output = record(retryArtifact);
    if (output?.stage !== 'flashcard_items' || !Array.isArray(output.items) || output.items.length !== checkpoint.missingCount)
        throw new Error('flashcard_partial_retry_count_mismatch');
    const retryItems = output.items;
    const retryIds = retryItems.map((item) => String(item.id ?? '').trim());
    const retryKeys = retryItems.map(flashcard_artifacts_1.flashcardSemanticKey);
    if (retryIds.some((id) => checkpoint.acceptedIds.includes(id)) || new Set(retryIds).size !== retryIds.length)
        throw new Error('flashcard_partial_retry_id_conflict');
    if (retryKeys.some((key) => checkpoint.acceptedSemanticKeys.includes(key)) || new Set(retryKeys).size !== retryKeys.length)
        throw new Error('flashcard_partial_retry_semantic_conflict');
    const merged = Object.freeze([...checkpoint.acceptedItems, ...retryItems.map((item) => Object.freeze({ ...item }))]);
    const artifact = Object.freeze({ stage: 'flashcard_items', items: merged });
    const errors = (0, flashcard_artifacts_1.validateFlashcardItemsArtifact)(artifact, { count: checkpoint.requestedTotal, grounding });
    if (errors.length)
        throw new Error(`flashcard_partial_merge_invalid:${errors.join(',')}`);
    return artifact;
}
//# sourceMappingURL=flashcard_partial_checkpoint.js.map