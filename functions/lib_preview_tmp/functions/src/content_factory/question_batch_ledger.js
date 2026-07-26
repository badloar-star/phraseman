"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionLedgerDocumentId = questionLedgerDocumentId;
exports.parseQuestionBatchLedger = parseQuestionBatchLedger;
exports.previousQuestionKeys = previousQuestionKeys;
exports.approveQuestionBatch = approveQuestionBatch;
exports.replaceLedgerQuestion = replaceLedgerQuestion;
exports.approveQuestionReplacement = approveQuestionReplacement;
exports.rollbackQuestionReplacement = rollbackQuestionReplacement;
exports.rollbackQuestionBatch = rollbackQuestionBatch;
const node_crypto_1 = require("node:crypto");
const question_artifacts_1 = require("./question_artifacts");
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function ledgerItem(value) {
    const item = record(value);
    const id = String(item?.id ?? '').trim();
    const semanticKey = typeof item?.semanticKey === 'string' ? item.semanticKey : (0, question_artifacts_1.questionSemanticKey)(item);
    const skillTag = String(item?.skillTag ?? '').trim();
    const difficulty = String(item?.difficulty ?? '').trim();
    if (!id || semanticKey === '\u0000' || !skillTag || !difficulty)
        throw new Error('question_batch_ledger_item_invalid');
    return Object.freeze({ id, semanticKey, skillTag, difficulty });
}
function contentHash(items) { return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(items)).digest('hex'); }
function questionLedgerDocumentId(requestId, topicArtifactId) { return (0, node_crypto_1.createHash)('sha256').update(`${requestId}\u0000${topicArtifactId}`).digest('hex'); }
function parseQuestionBatchLedger(value, topicArtifactId) {
    if (!record(value))
        return Object.freeze({ topicArtifactId, revision: 0, batches: Object.freeze({}) });
    const input = record(value);
    if (input.topicArtifactId !== topicArtifactId || !Number.isSafeInteger(input.revision) || !record(input.batches))
        throw new Error('question_batch_ledger_invalid');
    const batches = {};
    for (const [artifactId, raw] of Object.entries(input.batches)) {
        const batch = record(raw);
        if (!artifactId || !batch || typeof batch.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(batch.contentHash) || !Array.isArray(batch.items))
            throw new Error('question_batch_ledger_invalid');
        const items = Object.freeze(batch.items.map(ledgerItem));
        const baseItems = Object.freeze((Array.isArray(batch.baseItems) ? batch.baseItems : batch.items).map(ledgerItem));
        const replacementsInput = record(batch.replacements) ?? {};
        const replacements = {};
        for (const [questionId, rawHistory] of Object.entries(replacementsInput)) {
            if (!Array.isArray(rawHistory))
                throw new Error('question_batch_ledger_invalid');
            replacements[questionId] = Object.freeze(rawHistory.map((raw) => { const revision = record(raw); if (!revision || typeof revision.artifactId !== 'string')
                throw new Error('question_batch_ledger_invalid'); return Object.freeze({ artifactId: revision.artifactId, item: ledgerItem(revision.item) }); }));
        }
        batches[artifactId] = Object.freeze({ contentHash: batch.contentHash, baseItems, items, replacements: Object.freeze(replacements) });
    }
    return Object.freeze({ topicArtifactId, revision: Number(input.revision), batches: Object.freeze(batches) });
}
function previousQuestionKeys(ledger, excludingBatchArtifactId) {
    return Object.freeze(Object.entries(ledger.batches).filter(([artifactId]) => artifactId !== excludingBatchArtifactId).flatMap(([, batch]) => batch.items.map((item) => item.semanticKey)).sort());
}
function approveQuestionBatch(ledger, input) {
    if (!input.batchArtifactId)
        throw new Error('question_batch_artifact_id_required');
    const items = Object.freeze(input.items.map(ledgerItem));
    const prior = new Set(previousQuestionKeys(ledger, input.batchArtifactId));
    const current = new Set();
    if (items.some((item) => prior.has(item.semanticKey)))
        throw new Error('question_batch_previous_duplicate');
    if (items.some((item) => current.has(item.semanticKey) ? true : (current.add(item.semanticKey), false)))
        throw new Error('question_batch_internal_duplicate');
    const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: Object.freeze({ contentHash: contentHash(items), baseItems: items, items, replacements: Object.freeze({}) }) });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }), previousQuestionKeys: previousQuestionKeys(ledger, input.batchArtifactId) });
}
function replaceLedgerQuestion(ledger, input) {
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('question_batch_not_found');
    const index = batch.items.findIndex((item) => item.id === input.questionId);
    if (index < 0)
        throw new Error('question_ledger_item_not_found');
    const replacement = ledgerItem(input.replacement);
    const others = [...previousQuestionKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
    if (replacement.id !== input.questionId)
        throw new Error('question_replacement_id_mismatch');
    if (new Set(others).has(replacement.semanticKey))
        throw new Error('question_replacement_duplicate');
    const items = [...batch.items];
    items[index] = replacement;
    const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items) }) });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }), replacedQuestionId: input.questionId });
}
function approveQuestionReplacement(ledger, input) {
    if (!input.replacementArtifactId)
        throw new Error('question_replacement_artifact_id_required');
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('question_batch_not_found');
    const replacement = ledgerItem(input.replacement);
    if (replacement.id !== input.questionId)
        throw new Error('question_replacement_id_mismatch');
    const index = batch.items.findIndex((item) => item.id === input.questionId);
    if (index < 0)
        throw new Error('question_ledger_item_not_found');
    const others = [...previousQuestionKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
    if (new Set(others).has(replacement.semanticKey))
        throw new Error('question_replacement_duplicate');
    const history = [...(batch.replacements[input.questionId] ?? [])];
    const supersededReplacementArtifactId = history[history.length - 1]?.artifactId ?? null;
    history.push(Object.freeze({ artifactId: input.replacementArtifactId, item: replacement }));
    const items = [...batch.items];
    items[index] = replacement;
    const replacements = Object.freeze({ ...batch.replacements, [input.questionId]: Object.freeze(history) });
    const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), supersededReplacementArtifactId });
}
function rollbackQuestionReplacement(ledger, input) {
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('question_batch_not_found');
    const history = [...(batch.replacements[input.questionId] ?? [])];
    const active = history[history.length - 1];
    if (!active || active.artifactId !== input.replacementArtifactId)
        throw new Error('question_replacement_not_active');
    history.pop();
    const restoredRevision = history[history.length - 1];
    const restored = restoredRevision?.item ?? batch.baseItems.find((item) => item.id === input.questionId);
    if (!restored)
        throw new Error('question_replacement_base_missing');
    const index = batch.items.findIndex((item) => item.id === input.questionId);
    if (index < 0)
        throw new Error('question_ledger_item_not_found');
    const items = [...batch.items];
    items[index] = restored;
    const replacements = { ...batch.replacements };
    if (history.length)
        replacements[input.questionId] = Object.freeze(history);
    else
        delete replacements[input.questionId];
    const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements: Object.freeze(replacements) });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), restoredReplacementArtifactId: restoredRevision?.artifactId ?? null });
}
function rollbackQuestionBatch(ledger, batchArtifactId) {
    if (!ledger.batches[batchArtifactId])
        return ledger;
    const batches = { ...ledger.batches };
    delete batches[batchArtifactId];
    return Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze(batches) });
}
//# sourceMappingURL=question_batch_ledger.js.map