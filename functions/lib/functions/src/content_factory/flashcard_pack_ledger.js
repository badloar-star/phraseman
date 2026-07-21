"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashcardSemanticKey = void 0;
exports.flashcardLedgerDocumentId = flashcardLedgerDocumentId;
exports.parseFlashcardPackLedger = parseFlashcardPackLedger;
exports.previousFlashcardKeys = previousFlashcardKeys;
exports.approveFlashcardBatch = approveFlashcardBatch;
exports.approveFlashcardReplacement = approveFlashcardReplacement;
exports.rollbackFlashcardReplacement = rollbackFlashcardReplacement;
exports.rollbackFlashcardBatch = rollbackFlashcardBatch;
exports.planFlashcardPartialRetry = planFlashcardPartialRetry;
const node_crypto_1 = require("node:crypto");
const flashcard_artifacts_1 = require("./flashcard_artifacts");
var flashcard_artifacts_2 = require("./flashcard_artifacts");
Object.defineProperty(exports, "flashcardSemanticKey", { enumerable: true, get: function () { return flashcard_artifacts_2.flashcardSemanticKey; } });
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function ledgerItem(value) {
    const item = record(value);
    const id = String(item?.id ?? '').trim();
    const semanticKey = typeof item?.semanticKey === 'string' ? item.semanticKey : (0, flashcard_artifacts_1.flashcardSemanticKey)(item);
    if (!id || semanticKey === '\u0000' || !semanticKey.includes('\u0000'))
        throw new Error('flashcard_batch_ledger_item_invalid');
    return Object.freeze({ id, semanticKey });
}
function contentHash(items) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(items)).digest('hex');
}
function flashcardLedgerDocumentId(requestId, packIdeaArtifactId) {
    return (0, node_crypto_1.createHash)('sha256').update(`${requestId}\u0000${packIdeaArtifactId}`).digest('hex');
}
function parseFlashcardPackLedger(value, packIdeaArtifactId) {
    if (!record(value))
        return Object.freeze({ packIdeaArtifactId, revision: 0, batches: Object.freeze({}) });
    const input = record(value);
    if (input.packIdeaArtifactId !== packIdeaArtifactId || !Number.isSafeInteger(input.revision) || !record(input.batches))
        throw new Error('flashcard_pack_ledger_invalid');
    const batches = {};
    for (const [artifactId, raw] of Object.entries(input.batches)) {
        const batch = record(raw);
        if (!artifactId || !batch || typeof batch.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(batch.contentHash) || !Array.isArray(batch.items))
            throw new Error('flashcard_pack_ledger_invalid');
        const items = Object.freeze(batch.items.map(ledgerItem));
        const baseItems = Object.freeze((Array.isArray(batch.baseItems) ? batch.baseItems : batch.items).map(ledgerItem));
        const histories = record(batch.replacements) ?? {};
        const replacements = {};
        for (const [cardId, rawHistory] of Object.entries(histories)) {
            if (!Array.isArray(rawHistory))
                throw new Error('flashcard_pack_ledger_invalid');
            replacements[cardId] = Object.freeze(rawHistory.map((rawRevision) => {
                const revision = record(rawRevision);
                if (!revision || typeof revision.artifactId !== 'string' || !revision.artifactId)
                    throw new Error('flashcard_pack_ledger_invalid');
                return Object.freeze({ artifactId: revision.artifactId, item: ledgerItem(revision.item) });
            }));
        }
        batches[artifactId] = Object.freeze({ contentHash: batch.contentHash, baseItems, items, replacements: Object.freeze(replacements) });
    }
    return Object.freeze({ packIdeaArtifactId, revision: Number(input.revision), batches: Object.freeze(batches) });
}
function previousFlashcardKeys(ledger, excludingBatchArtifactId) {
    return Object.freeze(Object.entries(ledger.batches).filter(([artifactId]) => artifactId !== excludingBatchArtifactId).flatMap(([, batch]) => batch.items.map((item) => item.semanticKey)).sort());
}
function approveFlashcardBatch(ledger, input) {
    if (!input.batchArtifactId)
        throw new Error('flashcard_batch_artifact_id_required');
    if (input.items.length < 1 || input.items.length > 20)
        throw new Error('flashcard_batch_count_out_of_range');
    const items = Object.freeze(input.items.map(ledgerItem));
    const prior = new Set(previousFlashcardKeys(ledger, input.batchArtifactId));
    const current = new Set();
    if (items.some((item) => prior.has(item.semanticKey)))
        throw new Error('flashcard_batch_previous_duplicate');
    if (items.some((item) => current.has(item.semanticKey) ? true : (current.add(item.semanticKey), false)))
        throw new Error('flashcard_batch_internal_duplicate');
    if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new Error('flashcard_batch_id_duplicate');
    const batch = Object.freeze({ contentHash: contentHash(items), baseItems: items, items, replacements: Object.freeze({}) });
    const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: batch });
    return Object.freeze({ ledger: Object.freeze({ packIdeaArtifactId: ledger.packIdeaArtifactId, revision: ledger.revision + 1, batches }) });
}
function approveFlashcardReplacement(ledger, input) {
    if (!input.replacementArtifactId)
        throw new Error('flashcard_replacement_artifact_id_required');
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('flashcard_batch_not_found');
    const index = batch.items.findIndex((item) => item.id === input.cardId);
    if (index < 0)
        throw new Error('flashcard_ledger_item_not_found');
    const replacement = ledgerItem(input.replacement);
    if (replacement.id !== input.cardId)
        throw new Error('flashcard_replacement_id_mismatch');
    const otherKeys = [...previousFlashcardKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
    if (new Set(otherKeys).has(replacement.semanticKey))
        throw new Error('flashcard_replacement_duplicate');
    const history = [...(batch.replacements[input.cardId] ?? [])];
    const supersededReplacementArtifactId = history[history.length - 1]?.artifactId ?? null;
    history.push(Object.freeze({ artifactId: input.replacementArtifactId, item: replacement }));
    const items = [...batch.items];
    items[index] = replacement;
    const replacements = Object.freeze({ ...batch.replacements, [input.cardId]: Object.freeze(history) });
    const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements });
    return Object.freeze({ ledger: Object.freeze({ packIdeaArtifactId: ledger.packIdeaArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), supersededReplacementArtifactId });
}
function rollbackFlashcardReplacement(ledger, input) {
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('flashcard_batch_not_found');
    const history = [...(batch.replacements[input.cardId] ?? [])];
    const active = history[history.length - 1];
    if (!active || active.artifactId !== input.replacementArtifactId)
        throw new Error('flashcard_replacement_not_active');
    history.pop();
    const restoredRevision = history[history.length - 1];
    const restored = restoredRevision?.item ?? batch.baseItems.find((item) => item.id === input.cardId);
    if (!restored)
        throw new Error('flashcard_replacement_base_missing');
    const index = batch.items.findIndex((item) => item.id === input.cardId);
    if (index < 0)
        throw new Error('flashcard_ledger_item_not_found');
    const items = [...batch.items];
    items[index] = restored;
    const replacements = { ...batch.replacements };
    if (history.length)
        replacements[input.cardId] = Object.freeze(history);
    else
        delete replacements[input.cardId];
    const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements: Object.freeze(replacements) });
    return Object.freeze({ ledger: Object.freeze({ packIdeaArtifactId: ledger.packIdeaArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), restoredReplacementArtifactId: restoredRevision?.artifactId ?? null });
}
function rollbackFlashcardBatch(ledger, batchArtifactId) {
    if (!ledger.batches[batchArtifactId])
        return ledger;
    const batches = { ...ledger.batches };
    delete batches[batchArtifactId];
    return Object.freeze({ packIdeaArtifactId: ledger.packIdeaArtifactId, revision: ledger.revision + 1, batches: Object.freeze(batches) });
}
function planFlashcardPartialRetry(input) {
    if (!Number.isSafeInteger(input.requestedTotal) || input.requestedTotal < 1 || input.requestedTotal > 20)
        throw new Error('flashcard_partial_total_out_of_range');
    const acceptedIds = input.acceptedItems.map((item) => String(item.id ?? '').trim());
    if (acceptedIds.some((id) => !id))
        throw new Error('flashcard_partial_id_required');
    if (new Set(acceptedIds).size !== acceptedIds.length)
        throw new Error('flashcard_partial_id_duplicate');
    if (input.acceptedItems.length > input.requestedTotal)
        throw new Error('flashcard_partial_accepted_exceeds_total');
    return Object.freeze({ acceptedItems: input.acceptedItems, acceptedIds: Object.freeze(acceptedIds), missingCount: input.requestedTotal - input.acceptedItems.length, requestedTotal: input.requestedTotal });
}
//# sourceMappingURL=flashcard_pack_ledger.js.map