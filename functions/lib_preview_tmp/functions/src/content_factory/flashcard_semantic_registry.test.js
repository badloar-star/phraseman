"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const flashcard_semantic_registry_1 = require("./flashcard_semantic_registry");
const partition = { surface: 'community_flashcards', studyTarget: 'en', sourceLocale: 'ru' };
const card = { id: 'c1', front: '  Where’s the STATION?! ', back: 'Где вокзал?' };
describe('flashcard semantic registry', () => {
    it('creates deterministic partitioned identities from the shared semantic key', () => {
        const first = (0, flashcard_semantic_registry_1.buildFlashcardRegistryEntry)({ partition, packId: 'p1', card });
        const replay = (0, flashcard_semantic_registry_1.buildFlashcardRegistryEntry)({ partition, packId: 'p1', card: { ...card, front: "where's the station" } });
        const otherLocale = (0, flashcard_semantic_registry_1.buildFlashcardRegistryEntry)({ partition: { ...partition, sourceLocale: 'uk' }, packId: 'p1', card });
        expect(replay.docId).toBe(first.docId);
        expect(otherLocale.docId).not.toBe(first.docId);
        expect(first.sources).toEqual([{ packId: 'p1', cardId: 'c1' }]);
    });
    it('chains bounded pages into one complete manifest without losing shared sources', () => {
        const first = (0, flashcard_semantic_registry_1.planFlashcardRegistryBackfill)({ runId: 'run-pages', dryRun: true, inputCursor: null, nextCursor: 'p1', packs: [{ id: 'p1', cards: [card] }] });
        const second = (0, flashcard_semantic_registry_1.planFlashcardRegistryBackfill)({ runId: 'run-pages', dryRun: true, inputCursor: 'p1', nextCursor: null, packs: [{ id: 'p2', cards: [{ ...card, id: 'c2' }] }] });
        const merged = (0, flashcard_semantic_registry_1.mergeFlashcardRegistryBackfillManifests)(first, second);
        expect(merged).toMatchObject({ complete: true, scannedPacks: 2, inputCursor: null, nextCursor: null });
        expect(merged.entries[0].sources).toHaveLength(2);
        expect(() => (0, flashcard_semantic_registry_1.mergeFlashcardRegistryBackfillManifests)(first, { ...second, inputCursor: 'wrong' })).toThrow('flashcard_registry_manifest_chain_invalid');
    });
    it('fails closed to legacy until full parity and a current complete manifest', () => {
        const base = { legacyKeys: ['a'], registryKeys: ['a'], mode: 'registry', manifestComplete: true, manifestCatalogFingerprint: 'same', currentCatalogFingerprint: 'same', manifestHighWaterMark: 'pack-9', currentHighWaterMark: 'pack-9' };
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)(base)).toMatchObject({ authority: 'registry', cutoverEligible: true });
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)({ ...base, registryKeys: [] })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)({ ...base, manifestComplete: false })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)({ ...base, currentCatalogFingerprint: 'stale' })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)({ ...base, currentHighWaterMark: 'pack-10' })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
        expect((0, flashcard_semantic_registry_1.resolveFlashcardRegistryAuthority)({ ...base, mode: 'shadow' })).toMatchObject({ authority: 'legacy', cutoverEligible: true });
    });
    it('builds replay-stable dry-run manifests and merges duplicate pack memberships', () => {
        const packs = [{ id: 'p1', cards: [card] }, { id: 'p2', cards: [{ ...card, id: 'c2' }] }];
        const first = (0, flashcard_semantic_registry_1.planFlashcardRegistryBackfill)({ runId: 'run-1', dryRun: true, packs });
        const replay = (0, flashcard_semantic_registry_1.planFlashcardRegistryBackfill)({ runId: 'run-1', dryRun: true, packs });
        expect(replay).toEqual(first);
        expect(first.entries).toHaveLength(1);
        expect(first.entries[0].sources).toHaveLength(2);
        expect(first.complete).toBe(true);
    });
    it('keeps multiple pack sources idempotently and rolls back only one membership', () => {
        const first = (0, flashcard_semantic_registry_1.buildFlashcardRegistryEntry)({ partition, packId: 'p1', card });
        const merged = (0, flashcard_semantic_registry_1.mergeFlashcardRegistrySource)(first, { ...first, sources: [{ packId: 'p2', cardId: 'c9' }] });
        expect(merged.sources).toHaveLength(2);
        expect((0, flashcard_semantic_registry_1.mergeFlashcardRegistrySource)(merged, first)).toEqual(merged);
        expect((0, flashcard_semantic_registry_1.removeFlashcardRegistrySource)(merged, { packId: 'p1', cardId: 'c1' })?.sources).toEqual([{ packId: 'p2', cardId: 'c9' }]);
        expect((0, flashcard_semantic_registry_1.removeFlashcardRegistrySource)(first, { packId: 'p1', cardId: 'c1' })).toBeNull();
    });
    it('detects canonical hash collisions and exact shadow differences', () => {
        const first = (0, flashcard_semantic_registry_1.buildFlashcardRegistryEntry)({ partition, packId: 'p1', card });
        expect(() => (0, flashcard_semantic_registry_1.mergeFlashcardRegistrySource)(first, { ...first, canonicalKey: 'different\u0000key' })).toThrow('flashcard_registry_hash_collision');
        expect((0, flashcard_semantic_registry_1.compareFlashcardRegistryShadow)([first.canonicalKey], [first.canonicalKey])).toEqual({ parity: true, missingFromRegistry: [], extraInRegistry: [] });
        expect((0, flashcard_semantic_registry_1.compareFlashcardRegistryShadow)(['a', 'b'], ['b', 'c'])).toEqual({ parity: false, missingFromRegistry: ['a'], extraInRegistry: ['c'] });
    });
});
//# sourceMappingURL=flashcard_semantic_registry.test.js.map