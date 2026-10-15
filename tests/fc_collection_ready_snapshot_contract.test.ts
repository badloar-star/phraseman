import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const source = normalizeEol(fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'useCollectionData.ts'),
  'utf8',
));

describe('Cards collection ready-snapshot contract', () => {
  test('early storage hydration preserves staged pack metadata until the full catalog arrives', () => {
    expect(source).toContain('const marketCatalogSeed = useMemo(');
    expect(source).toContain('setMarketPackCatalog(marketCatalogSeed);');
    expect(source).not.toContain('setMarketPackCatalog(reserveBundledMarketPacks());');
  });

  test('collection reload follows the active study target and migration writes stay target-scoped', () => {
    // зачем (D158-ряд правок карточек, 01.10): миграция больше не перезаписывает весь список целиком `saveFlashcards(migratedLocal, studyTarget)` —
    // она ДОЛИВАЕТ исправления (uk, транскрипция, версия движка) только в карточки, что ещё существуют, под замком записи и токеном аккаунта
    // (запоздавшая миграция не воскресит удалённую карточку). Границу по языку держит сама функция: обновления берутся только для
    // карточек своего языка, список читается и пишется по каждому языку отдельно.
    expect(source).toContain('await mergeSavedFlashcardRepairs(migratedLocal, accountToken);');
    expect(source).not.toContain('await saveFlashcards(migratedLocal, studyTarget);');
    const hookSource = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-flashcards.ts'), 'utf8'));
    const repairStart = hookSource.indexOf('export const mergeSavedFlashcardRepairs');
    const repairBody = hookSource.slice(repairStart, repairStart + 1800);
    expect(repairBody).toContain('withWriteLock(accountToken');
    expect(repairBody).toContain('for (const target of PACK_LANGUAGES)'); // зачем (аудит #1, 15.10): ремонт идёт по всем пяти языкам, а не только en и fr
    expect(repairBody).toContain('updates.filter(card => card.studyTarget === target)');
    expect(repairBody).toContain('persistFlashcards(next, target, accountToken)');
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
    const hub = normalizeEol(fs.readFileSync(
      path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsCategoryHub.tsx'),
      'utf8',
    ));
    const mine = normalizeEol(fs.readFileSync(
      path.join(__dirname, '..', 'app', 'flashcards_my_packs.tsx'),
      'utf8',
    ));

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
