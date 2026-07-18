"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arenaLedgerDocumentId = arenaLedgerDocumentId;
exports.parseArenaQuestionLedger = parseArenaQuestionLedger;
exports.previousArenaQuestionKeys = previousArenaQuestionKeys;
exports.arenaLedgerCoverage = arenaLedgerCoverage;
exports.assertArenaBatchApprovalIdempotent = assertArenaBatchApprovalIdempotent;
exports.approveArenaQuestionBatch = approveArenaQuestionBatch;
exports.approveArenaQuestionReplacement = approveArenaQuestionReplacement;
exports.rollbackArenaQuestionReplacement = rollbackArenaQuestionReplacement;
exports.rollbackArenaQuestionBatch = rollbackArenaQuestionBatch;
exports.planArenaWholeBatchRetry = planArenaWholeBatchRetry;
const node_crypto_1 = require("node:crypto");
const arena_artifacts_1 = require("./arena_artifacts");
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function ledgerItem(value) {
    const item = record(value);
    const id = String(item?.id ?? '').trim();
    const skillTag = String(item?.skillTag ?? '').trim();
    const difficulty = String(item?.difficulty ?? '').trim();
    const semanticKey = typeof item?.semanticKey === 'string'
        ? item.semanticKey
        : (0, arena_artifacts_1.arenaQuestionSemanticKey)(item);
    if (!id || !skillTag || !difficulty || semanticKey === '\u0000\u0000') {
        throw new Error('arena_question_ledger_item_invalid');
    }
    return Object.freeze({ id, semanticKey, skillTag, difficulty });
}
function batchContentHash(items) {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(items)).digest('hex');
}
function arenaLedgerDocumentId(requestId, topicArtifactId) {
    return (0, node_crypto_1.createHash)('sha256').update(`${requestId}\u0000${topicArtifactId}`).digest('hex');
}
function parseArenaQuestionLedger(value, topicArtifactId) {
    if (!topicArtifactId)
        throw new Error('arena_topic_artifact_id_required');
    if (!record(value))
        return Object.freeze({ topicArtifactId, revision: 0, batches: Object.freeze({}) });
    const input = record(value);
    if (input.topicArtifactId !== topicArtifactId || !Number.isSafeInteger(input.revision) || !record(input.batches)) {
        throw new Error('arena_question_ledger_invalid');
    }
    const batches = {};
    for (const [artifactId, rawBatch] of Object.entries(input.batches)) {
        const batch = record(rawBatch);
        if (!artifactId || !batch || !Array.isArray(batch.items) || typeof batch.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(batch.contentHash)) {
            throw new Error('arena_question_ledger_invalid');
        }
        const items = Object.freeze(batch.items.map(ledgerItem));
        const baseItems = Object.freeze((Array.isArray(batch.baseItems) ? batch.baseItems : batch.items).map(ledgerItem));
        const replacementInput = record(batch.replacements) ?? {};
        const replacements = {};
        for (const [questionId, rawHistory] of Object.entries(replacementInput)) {
            if (!Array.isArray(rawHistory))
                throw new Error('arena_question_ledger_invalid');
            replacements[questionId] = Object.freeze(rawHistory.map((raw) => { const revision = record(raw); if (!revision || !String(revision.artifactId ?? ''))
                throw new Error('arena_question_ledger_invalid'); return Object.freeze({ artifactId: String(revision.artifactId), item: ledgerItem(revision.item) }); }));
        }
        if (items.length !== 10 || baseItems.length !== 10 || batchContentHash(items) !== batch.contentHash)
            throw new Error('arena_question_ledger_invalid');
        batches[artifactId] = Object.freeze({ contentHash: batch.contentHash, baseItems, items, replacements: Object.freeze(replacements) });
    }
    return Object.freeze({ topicArtifactId, revision: Number(input.revision), batches: Object.freeze(batches) });
}
function previousArenaQuestionKeys(ledger, excludingBatchArtifactId) {
    return Object.freeze(Object.entries(ledger.batches)
        .filter(([artifactId]) => artifactId !== excludingBatchArtifactId)
        .flatMap(([, batch]) => batch.items.map((item) => item.semanticKey))
        .sort());
}
function arenaLedgerCoverage(ledger) {
    const bySkill = {};
    const byDifficulty = {};
    let total = 0;
    for (const batch of Object.values(ledger.batches)) {
        for (const item of batch.items) {
            bySkill[item.skillTag] = (bySkill[item.skillTag] ?? 0) + 1;
            byDifficulty[item.difficulty] = (byDifficulty[item.difficulty] ?? 0) + 1;
            total += 1;
        }
    }
    return Object.freeze({ bySkill: Object.freeze(bySkill), byDifficulty: Object.freeze(byDifficulty), total });
}
function proposedBatch(input) {
    if (!input.batchArtifactId)
        throw new Error('arena_question_batch_artifact_id_required');
    if (input.items.length !== 10)
        throw new Error('arena_question_batch_count_expected_10');
    const items = Object.freeze(input.items.map(ledgerItem));
    if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new Error('arena_question_batch_id_duplicate');
    if (new Set(items.map((item) => item.semanticKey)).size !== items.length)
        throw new Error('arena_question_batch_internal_duplicate');
    return Object.freeze({ contentHash: batchContentHash(items), baseItems: items, items, replacements: Object.freeze({}) });
}
function assertArenaBatchApprovalIdempotent(ledger, input) {
    const existing = ledger.batches[input.batchArtifactId];
    if (!existing)
        return false;
    if (existing.contentHash !== proposedBatch(input).contentHash)
        throw new Error('arena_question_batch_artifact_content_conflict');
    return true;
}
function approveArenaQuestionBatch(ledger, input) {
    const batch = proposedBatch(input);
    if (assertArenaBatchApprovalIdempotent(ledger, input))
        return Object.freeze({ ledger, idempotent: true });
    const prior = new Set(previousArenaQuestionKeys(ledger));
    if (batch.items.some((item) => prior.has(item.semanticKey)))
        throw new Error('arena_question_batch_previous_duplicate');
    const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: Object.freeze({ ...batch, baseItems: batch.items, replacements: Object.freeze({}) }) });
    return Object.freeze({
        ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }),
        idempotent: false,
    });
}
function approveArenaQuestionReplacement(ledger, input) {
    if (!input.replacementArtifactId)
        throw new Error('arena_replacement_artifact_id_required');
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('arena_question_batch_not_found');
    const index = batch.items.findIndex((item) => item.id === input.questionId);
    if (index < 0)
        throw new Error('arena_ledger_item_not_found');
    const replacement = ledgerItem(input.replacement);
    if (replacement.id !== input.questionId)
        throw new Error('arena_replacement_id_mismatch');
    const otherKeys = [...previousArenaQuestionKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
    if (new Set(otherKeys).has(replacement.semanticKey))
        throw new Error('arena_replacement_duplicate');
    const history = [...(batch.replacements[input.questionId] ?? [])];
    const supersededReplacementArtifactId = history[history.length - 1]?.artifactId ?? null;
    history.push(Object.freeze({ artifactId: input.replacementArtifactId, item: replacement }));
    const items = [...batch.items];
    items[index] = replacement;
    const replacements = Object.freeze({ ...batch.replacements, [input.questionId]: Object.freeze(history) });
    const nextBatch = Object.freeze({ ...batch, contentHash: batchContentHash(items), items: Object.freeze(items), replacements });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), supersededReplacementArtifactId });
}
function rollbackArenaQuestionReplacement(ledger, input) {
    const batch = ledger.batches[input.batchArtifactId];
    if (!batch)
        throw new Error('arena_question_batch_not_found');
    const history = [...(batch.replacements[input.questionId] ?? [])];
    const active = history[history.length - 1];
    if (!active || active.artifactId !== input.replacementArtifactId)
        throw new Error('arena_replacement_not_active');
    history.pop();
    const restoredRevision = history[history.length - 1];
    const restored = restoredRevision?.item ?? batch.baseItems.find((item) => item.id === input.questionId);
    if (!restored)
        throw new Error('arena_replacement_base_missing');
    const index = batch.items.findIndex((item) => item.id === input.questionId);
    if (index < 0)
        throw new Error('arena_ledger_item_not_found');
    const items = [...batch.items];
    items[index] = restored;
    const replacements = { ...batch.replacements };
    if (history.length)
        replacements[input.questionId] = Object.freeze(history);
    else
        delete replacements[input.questionId];
    const nextBatch = Object.freeze({ ...batch, contentHash: batchContentHash(items), items: Object.freeze(items), replacements: Object.freeze(replacements) });
    return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), restoredReplacementArtifactId: restoredRevision?.artifactId ?? null });
}
function rollbackArenaQuestionBatch(ledger, batchArtifactId) {
    if (!ledger.batches[batchArtifactId])
        return ledger;
    const batches = { ...ledger.batches };
    delete batches[batchArtifactId];
    return Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze(batches) });
}
function planArenaWholeBatchRetry(ledger, batchArtifactId) {
    if (!batchArtifactId)
        throw new Error('arena_question_batch_artifact_id_required');
    return Object.freeze({ stage: 'arena_questions', batchArtifactId, topicArtifactId: ledger.topicArtifactId, count: 10 });
}
//# sourceMappingURL=arena_question_ledger.js.map