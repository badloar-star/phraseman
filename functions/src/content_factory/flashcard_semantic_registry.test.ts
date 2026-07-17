import {
  buildFlashcardRegistryEntry,
  compareFlashcardRegistryShadow,
  mergeFlashcardRegistrySource,
  removeFlashcardRegistrySource,
  planFlashcardRegistryBackfill,
  resolveFlashcardRegistryAuthority,
  mergeFlashcardRegistryBackfillManifests,
} from './flashcard_semantic_registry';

const partition = { surface: 'community_flashcards' as const, studyTarget: 'en', sourceLocale: 'ru' };
const card = { id: 'c1', front: '  Where’s the STATION?! ', back: 'Где вокзал?' };

describe('flashcard semantic registry', () => {
  it('creates deterministic partitioned identities from the shared semantic key', () => {
    const first = buildFlashcardRegistryEntry({ partition, packId: 'p1', card });
    const replay = buildFlashcardRegistryEntry({ partition, packId: 'p1', card: { ...card, front: "where's the station" } });
    const otherLocale = buildFlashcardRegistryEntry({ partition: { ...partition, sourceLocale: 'uk' }, packId: 'p1', card });
    expect(replay.docId).toBe(first.docId);
    expect(otherLocale.docId).not.toBe(first.docId);
    expect(first.sources).toEqual([{ packId: 'p1', cardId: 'c1' }]);
  });

  it('chains bounded pages into one complete manifest without losing shared sources', () => {
    const first = planFlashcardRegistryBackfill({ runId: 'run-pages', dryRun: true, inputCursor: null, nextCursor: 'p1', packs: [{ id: 'p1', cards: [card] }] });
    const second = planFlashcardRegistryBackfill({ runId: 'run-pages', dryRun: true, inputCursor: 'p1', nextCursor: null, packs: [{ id: 'p2', cards: [{ ...card, id: 'c2' }] }] });
    const merged = mergeFlashcardRegistryBackfillManifests(first, second);
    expect(merged).toMatchObject({ complete: true, scannedPacks: 2, inputCursor: null, nextCursor: null });
    expect(merged.entries[0].sources).toHaveLength(2);
    expect(() => mergeFlashcardRegistryBackfillManifests(first, { ...second, inputCursor: 'wrong' })).toThrow('flashcard_registry_manifest_chain_invalid');
  });

  it('fails closed to legacy until full parity and a current complete manifest', () => {
    const base = { legacyKeys: ['a'], registryKeys: ['a'], mode: 'registry' as const, manifestComplete: true, manifestCatalogFingerprint: 'same', currentCatalogFingerprint: 'same', manifestHighWaterMark: 'pack-9', currentHighWaterMark: 'pack-9' };
    expect(resolveFlashcardRegistryAuthority(base)).toMatchObject({ authority: 'registry', cutoverEligible: true });
    expect(resolveFlashcardRegistryAuthority({ ...base, registryKeys: [] })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
    expect(resolveFlashcardRegistryAuthority({ ...base, manifestComplete: false })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
    expect(resolveFlashcardRegistryAuthority({ ...base, currentCatalogFingerprint: 'stale' })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
    expect(resolveFlashcardRegistryAuthority({ ...base, currentHighWaterMark: 'pack-10' })).toMatchObject({ authority: 'legacy', cutoverEligible: false });
    expect(resolveFlashcardRegistryAuthority({ ...base, mode: 'shadow' })).toMatchObject({ authority: 'legacy', cutoverEligible: true });
  });

  it('builds replay-stable dry-run manifests and merges duplicate pack memberships', () => {
    const packs = [{ id: 'p1', cards: [card] }, { id: 'p2', cards: [{ ...card, id: 'c2' }] }];
    const first = planFlashcardRegistryBackfill({ runId: 'run-1', dryRun: true, packs });
    const replay = planFlashcardRegistryBackfill({ runId: 'run-1', dryRun: true, packs });
    expect(replay).toEqual(first);
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0].sources).toHaveLength(2);
    expect(first.complete).toBe(true);
  });

  it('keeps multiple pack sources idempotently and rolls back only one membership', () => {
    const first = buildFlashcardRegistryEntry({ partition, packId: 'p1', card });
    const merged = mergeFlashcardRegistrySource(first, { ...first, sources: [{ packId: 'p2', cardId: 'c9' }] });
    expect(merged.sources).toHaveLength(2);
    expect(mergeFlashcardRegistrySource(merged, first)).toEqual(merged);
    expect(removeFlashcardRegistrySource(merged, { packId: 'p1', cardId: 'c1' })?.sources).toEqual([{ packId: 'p2', cardId: 'c9' }]);
    expect(removeFlashcardRegistrySource(first, { packId: 'p1', cardId: 'c1' })).toBeNull();
  });

  it('detects canonical hash collisions and exact shadow differences', () => {
    const first = buildFlashcardRegistryEntry({ partition, packId: 'p1', card });
    expect(() => mergeFlashcardRegistrySource(first, { ...first, canonicalKey: 'different\u0000key' })).toThrow('flashcard_registry_hash_collision');
    expect(compareFlashcardRegistryShadow([first.canonicalKey], [first.canonicalKey])).toEqual({ parity: true, missingFromRegistry: [], extraInRegistry: [] });
    expect(compareFlashcardRegistryShadow(['a', 'b'], ['b', 'c'])).toEqual({ parity: false, missingFromRegistry: ['a'], extraInRegistry: ['c'] });
  });
});
