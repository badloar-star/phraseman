"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flashcardRegistryPartitionKey = flashcardRegistryPartitionKey;
exports.flashcardRegistryDocumentId = flashcardRegistryDocumentId;
exports.buildFlashcardRegistryEntry = buildFlashcardRegistryEntry;
exports.mergeFlashcardRegistrySource = mergeFlashcardRegistrySource;
exports.removeFlashcardRegistrySource = removeFlashcardRegistrySource;
exports.compareFlashcardRegistryShadow = compareFlashcardRegistryShadow;
exports.resolveFlashcardRegistryAuthority = resolveFlashcardRegistryAuthority;
exports.planFlashcardRegistryBackfill = planFlashcardRegistryBackfill;
exports.mergeFlashcardRegistryBackfillManifests = mergeFlashcardRegistryBackfillManifests;
const node_crypto_1 = require("node:crypto");
const flashcard_artifacts_1 = require("./flashcard_artifacts");
function token(value) {
    const output = String(value ?? '').trim();
    if (!/^[A-Za-z0-9._-]{1,160}$/.test(output))
        throw new Error('flashcard_registry_partition_invalid');
    return output;
}
function flashcardRegistryPartitionKey(partition) {
    return `${token(partition.surface)}:${token(partition.studyTarget)}:${token(partition.sourceLocale)}`;
}
function flashcardRegistryDocumentId(partition, canonicalKey) {
    const partitionKey = flashcardRegistryPartitionKey(partition);
    if (!canonicalKey || canonicalKey === '\u0000')
        throw new Error('flashcard_registry_semantic_key_invalid');
    return (0, node_crypto_1.createHash)('sha256').update(`${partitionKey}\u0000${canonicalKey}`, 'utf8').digest('hex');
}
function buildFlashcardRegistryEntry(input) {
    const canonicalKey = (0, flashcard_artifacts_1.flashcardSemanticKey)(input.card);
    if (canonicalKey === '\u0000')
        throw new Error('flashcard_registry_semantic_key_invalid');
    const partitionKey = flashcardRegistryPartitionKey(input.partition);
    const cardId = token(input.card?.id);
    const packId = token(input.packId);
    const docId = flashcardRegistryDocumentId(input.partition, canonicalKey);
    return Object.freeze({ docId, partitionKey, canonicalKey, sources: Object.freeze([{ packId, cardId }]) });
}
function sourceKey(source) { return `${source.packId}\u0000${source.cardId}`; }
function mergeFlashcardRegistrySource(current, incoming) {
    if (current.docId !== incoming.docId || current.partitionKey !== incoming.partitionKey || current.canonicalKey !== incoming.canonicalKey)
        throw new Error('flashcard_registry_hash_collision');
    const sources = [...current.sources, ...incoming.sources].filter((source, index, all) => all.findIndex((item) => sourceKey(item) === sourceKey(source)) === index).sort((a, b) => sourceKey(a).localeCompare(sourceKey(b)));
    return Object.freeze({ ...current, sources: Object.freeze(sources) });
}
function removeFlashcardRegistrySource(entry, source) {
    const sources = entry.sources.filter((item) => sourceKey(item) !== sourceKey(source));
    return sources.length ? Object.freeze({ ...entry, sources: Object.freeze(sources) }) : null;
}
function compareFlashcardRegistryShadow(legacyKeys, registryKeys) {
    const legacy = new Set(legacyKeys);
    const registry = new Set(registryKeys);
    const missingFromRegistry = [...legacy].filter((key) => !registry.has(key)).sort();
    const extraInRegistry = [...registry].filter((key) => !legacy.has(key)).sort();
    return Object.freeze({ parity: missingFromRegistry.length === 0 && extraInRegistry.length === 0, missingFromRegistry: Object.freeze(missingFromRegistry), extraInRegistry: Object.freeze(extraInRegistry) });
}
function resolveFlashcardRegistryAuthority(input) {
    const comparison = compareFlashcardRegistryShadow(input.legacyKeys, input.registryKeys);
    const cutoverEligible = input.manifestComplete === true
        && !!input.manifestCatalogFingerprint
        && input.manifestCatalogFingerprint === input.currentCatalogFingerprint
        && !!input.manifestHighWaterMark
        && input.manifestHighWaterMark === input.currentHighWaterMark
        && comparison.parity;
    const authority = input.mode === 'registry' && cutoverEligible ? 'registry' : 'legacy';
    return Object.freeze({ authority, keys: Object.freeze([...(authority === 'registry' ? input.registryKeys : input.legacyKeys)]), comparison, cutoverEligible });
}
function registryFingerprint(entries) {
    return (0, node_crypto_1.createHash)('sha256').update(entries.map((entry) => `${entry.docId}:${entry.canonicalKey}:${entry.sources.map(sourceKey).join(',')}`).join('\n')).digest('hex');
}
function planFlashcardRegistryBackfill(input) {
    const byId = new Map();
    const conflicts = [];
    for (const pack of input.packs) {
        const partition = { surface: 'community_flashcards', studyTarget: pack.studyTarget || 'en', sourceLocale: pack.sourceLocale || 'ru' };
        for (const card of Array.isArray(pack.cards) ? pack.cards : []) {
            try {
                const entry = buildFlashcardRegistryEntry({ partition, packId: pack.id, card });
                const current = byId.get(entry.docId);
                byId.set(entry.docId, current ? mergeFlashcardRegistrySource(current, entry) : entry);
            }
            catch (error) {
                conflicts.push(`${pack.id}:${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    const entries = [...byId.values()].sort((a, b) => a.docId.localeCompare(b.docId));
    const catalogFingerprint = registryFingerprint(entries);
    const catalogHighWaterMark = input.packs.map((pack) => pack.id).sort().at(-1) ?? null;
    return Object.freeze({ schemaVersion: 1, runId: token(input.runId), dryRun: input.dryRun, inputCursor: input.inputCursor || null, nextCursor: input.nextCursor || null, complete: !input.nextCursor, scannedPacks: input.packs.length, entries: Object.freeze(entries), conflicts: Object.freeze(conflicts.sort()), catalogFingerprint, catalogHighWaterMark });
}
function mergeFlashcardRegistryBackfillManifests(previous, page) {
    if (previous.runId !== page.runId || previous.schemaVersion !== 1 || page.schemaVersion !== 1 || previous.nextCursor !== page.inputCursor)
        throw new Error('flashcard_registry_manifest_chain_invalid');
    const byId = new Map(previous.entries.map((entry) => [entry.docId, entry]));
    for (const entry of page.entries) {
        const current = byId.get(entry.docId);
        byId.set(entry.docId, current ? mergeFlashcardRegistrySource(current, entry) : entry);
    }
    const entries = [...byId.values()].sort((a, b) => a.docId.localeCompare(b.docId));
    return Object.freeze({ ...page, inputCursor: previous.inputCursor, scannedPacks: previous.scannedPacks + page.scannedPacks, entries: Object.freeze(entries), conflicts: Object.freeze([...new Set([...previous.conflicts, ...page.conflicts])].sort()), catalogFingerprint: registryFingerprint(entries), catalogHighWaterMark: [previous.catalogHighWaterMark, page.catalogHighWaterMark].filter((value) => !!value).sort().at(-1) ?? null });
}
//# sourceMappingURL=flashcard_semantic_registry.js.map