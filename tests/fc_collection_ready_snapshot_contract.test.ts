import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'useCollectionData.ts'),
  'utf8',
);

describe('Cards collection ready-snapshot contract', () => {
  test('early storage hydration preserves staged pack metadata until the full catalog arrives', () => {
    expect(source).toContain('const marketCatalogSeed = useMemo(');
    expect(source).toContain('setMarketPackCatalog(marketCatalogSeed);');
    expect(source).not.toContain('setMarketPackCatalog(reserveBundledMarketPacks());');
  });

  test('collection reload follows the active study target and migration writes stay target-scoped', () => {
    expect(source).toContain('await saveFlashcards(migratedLocal, studyTarget);');
    expect(source).toContain('loadBuiltMarketplaceCardsCache(studyTarget, lang)');
    expect(source).toContain('bundledPacksForOwned(ownedIdsEarly, studyTarget, lang)');
    expect(source).toContain('buildMarketplaceOwnedCards(ownedBundled, lang, studyTarget)');
    expect(source).toContain('buildMarketplaceOwnedCards(ownedOfficialPacks, lang, studyTarget)');
    expect(source).toContain('saveBuiltMarketplaceCardsCache(\n          [...ownedIds, ...communityIdsToLoad].sort(),\n          builtMarket,\n          studyTarget,\n          lang,\n        )');
    expect(source).toMatch(
      /\}, \[isDevMarketEnabled, lang, marketCatalogSeed, setCardsIfChanged, setIdsIfChanged, studyTarget\]\);/,
    );
    const trackingStart = source.indexOf('export function useFlashcardViewTracking()');
    const trackingEnd = source.indexOf('// ── E11: производные списки', trackingStart);
    expect(source.slice(trackingStart, trackingEnd)).toContain('}, [studyTarget]);');
  });

  test('official pack staging uses the active study target on both entry screens', () => {
    const hub = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsCategoryHub.tsx'),
      'utf8',
    );
    const mine = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'),
      'utf8',
    );

    expect(source).toContain('stageOwnedPackCardsForNavigation(\n  packId: string,\n  studyTarget?: RuntimeStudyTarget,');
    expect(source).toContain('bundledPacksForOwned([packId], studyTarget)');
    expect(source).toContain('buildMarketplaceOwnedCards(packs, undefined, studyTarget)');
    expect(hub).toContain('stageOwnedPackCardsForNavigation(pack.id, studyTarget);');
    expect(mine).toContain('stageOwnedPackCardsForNavigation(pack.id, studyTarget);');
  });

  test('official staged cards are consumed only by the matching pack and study target', () => {
    expect(source).toContain("let stagedOwnedPackMarketCards: { key: string; cards: CardItem[] } | null = null;");
    expect(source).toContain('function ownedPackStageKey(packId: string, studyTarget?: RuntimeStudyTarget): string');
    expect(source).toContain('consumeStagedOwnedPackMarketCards(opts.deeplinkPackId ?? null, studyTarget)');
    expect(source).not.toContain('const snap = stagedOwnedPackMarketCards;');
  });
});
