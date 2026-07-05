import AsyncStorage from '@react-native-async-storage/async-storage';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  addFlashcard,
  clearAllFlashcards,
  isFlashcardSaved,
  loadFlashcards,
  repairSavedFlashcardContent,
  removeFlashcardByEnglish,
} from '../hooks/use-flashcards';
import {
  readCustomCards,
  readFlashcardsProgress,
  writeCustomCards,
  writeFlashcardsProgress,
} from '../app/flashcards/storage';
import {
  customFlashcardsKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsHiddenCommunityPacksKey,
  flashcardsMarketDevActivePackKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsMarketplaceBuiltCardsCacheKey,
  flashcardsOpenedPacksKey,
  flashcardsOwnedPacksKey,
  flashcardsPackTrialGiftKey,
  flashcardsProgressKey,
  flashcardsSavedKey,
} from '../app/target_storage_keys';
import {
  isPackCeremoniallyOpened,
  markPackCeremoniallyOpened,
} from '../app/flashcards/openedPacksTracker';
import {
  buildCommunitySources,
  buildCachedTrainingSources,
  buildOfficialTrainingSourcesFromIds,
  loadTrainingSources,
} from '../app/flashcards/trainingSources';
import {
  buildMarketplaceOwnedCards,
  loadMarketplacePacks,
  consumeDevActivePack,
  loadDevOwnedPackIds,
  loadOwnedPackIds,
  loadBuiltMarketplaceCardsCache,
  MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
  saveOwnedPackIds,
  saveBuiltMarketplaceCardsCache,
  setDevActivePack,
} from '../app/flashcards/marketplace';
import {
  __resetFrenchFlashcardMarketplaceRuntimeForTests,
  primeFrenchFlashcardMarketplaceFromPayload,
} from '../app/french_flashcard_remote_runtime';
import {
  addCommunityOwnedPackId,
  loadCommunityOwnedPackIds,
} from '../app/community_packs/communityOwnedStorage';
import {
  hideCommunityPackOnDevice,
  loadHiddenCommunityPackIds,
} from '../app/community_packs/communityPackHiddenStorage';
import {
  consumePackGiftTrial,
  getPackGiftTrial,
  setRandomPackGiftTrial48h,
} from '../app/flashcards/pack_trial_gift';
import {
  flashcardsOfficialPacksAvailableForTarget,
  flashcardsSourceGateForTarget,
  flashcardsSourceGatedContentAvailableForTarget,
  flashcardsSystemCardsForTarget,
  frenchFlashcardsGateCopy,
} from '../app/flashcards_target_gate';
import { SYSTEM_CARDS } from '../app/flashcards/system-cards';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/firestore', () => jest.fn());
jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(() => Promise.resolve(true)) }));

const ROOT = path.join(__dirname, '..');
const FR_FLASHCARD_PAYLOAD_RU = path.join(
  ROOT,
  'docs',
  'gustav',
  'runs',
  '2026-07-04_fr_flashcard_phrase_packs_v1',
  'build',
  'server_payloads',
  'fr_flashcard_phrase_packs_ru.json',
);
const mockStorage: Record<string, string> = {};

beforeAll(() => {
  if (!fs.existsSync(FR_FLASHCARD_PAYLOAD_RU)) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'gustav_build_fr_flashcard_phrase_packs_v1.mjs')], {
      cwd: ROOT,
      stdio: 'pipe',
    });
  }
});

beforeEach(async () => {
  jest.clearAllMocks();
  __resetFrenchFlashcardMarketplaceRuntimeForTests();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
  await clearAllFlashcards('en');
  await clearAllFlashcards('fr');
});

describe('Gustav flashcards target isolation', () => {
  it('opens French server system cards while keeping English marketplace packs gated', () => {
    const swipeSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');

    expect(flashcardsSourceGatedContentAvailableForTarget('en', 'system_cards')).toBe(true);
    expect(flashcardsSourceGatedContentAvailableForTarget('es', 'system_cards')).toBe(true);
    expect(flashcardsSourceGatedContentAvailableForTarget('fr', 'system_cards')).toBe(true);
    expect(flashcardsOfficialPacksAvailableForTarget('fr')).toBe(false);
    expect(flashcardsSystemCardsForTarget(SYSTEM_CARDS, 'fr')).toEqual([]);
    expect(flashcardsSystemCardsForTarget(SYSTEM_CARDS, 'en')).toHaveLength(SYSTEM_CARDS.length);
    expect(flashcardsSourceGateForTarget('fr', 'system_cards')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_flashcards_server_system_cards_available',
      blockedRoutes: [],
    });
    expect(flashcardsSourceGateForTarget('fr', 'official_marketplace_packs')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_flashcards_source_gate',
      blockedRoutes: expect.arrayContaining(['/flashcards_collection', '/flashcards_swipe', '/flashcards_audio']),
    });
    expect(swipeSource).toContain('flashcardsSwipeMemoryKey(studyTarget)');
    expect(swipeSource).not.toContain("const SWIPE_MEMORY_KEY = 'flashcards_swipe_memory_v1'");
  });

  it('hard-gates flashcard training helpers against French official packs even with stale owned ids', () => {
    const officialIds = ['official_peaky_blinders_en'];

    expect(buildOfficialTrainingSourcesFromIds(officialIds, 'ru', 'fr')).toEqual([]);
    expect(buildCachedTrainingSources(
      'ru',
      [],
      [],
      officialIds,
      'official:official_peaky_blinders_en',
      '',
      'fr',
    )).toEqual([]);

    expect(buildOfficialTrainingSourcesFromIds(officialIds, 'ru', 'en').length).toBeGreaterThan(0);
  });

  it('opens French official marketplace packs only from the French server payload cache', async () => {
    const payload = fs.readFileSync(FR_FLASHCARD_PAYLOAD_RU, 'utf8');
    const primed = primeFrenchFlashcardMarketplaceFromPayload(payload, 'ru');

    expect(primed).toHaveLength(5);
    expect(primed.every((pack) => pack.studyTarget === 'fr')).toBe(true);
    expect(primed.map((pack) => pack.id)).not.toContain('official_peaky_blinders_en');
    expect(flashcardsOfficialPacksAvailableForTarget('fr', 'ru')).toBe(true);
    expect(flashcardsSourceGateForTarget('fr', 'official_marketplace_packs', 'ru')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_flashcards_server_marketplace_packs_available',
      blockedRoutes: [],
    });

    const loaded = await loadMarketplacePacks('fr', 'ru');
    expect(loaded).toHaveLength(5);
    expect(loaded.every((pack) => pack.isOfficial && pack.studyTarget === 'fr')).toBe(true);
    expect(loaded.map((pack) => pack.id)).toEqual(expect.arrayContaining([
      'fr_cafe_terrace_life',
      'fr_pronouns_and_politeness',
      'fr_apero_social_life',
      'fr_pharmacy_healthcare',
      'fr_texting_reactions',
    ]));

    const cards = buildMarketplaceOwnedCards([loaded[0]], 'ru', 'fr');
    expect(cards).toHaveLength(20);
    expect(cards[0]).toMatchObject({
      en: expect.any(String),
      ru: expect.any(String),
      sourceId: `DEV:${loaded[0].id}`,
      categoryId: 'situations',
    });
    expect(cards[0].en).toMatch(/[A-Za-zÀ-ÿ]/);
    expect(cards[0].ru).not.toBe('');
  });

  it('hard-gates flashcard training helpers against French community packs even with stale caller flags', async () => {
    await addFlashcard({
      en: 'bonjour',
      ru: 'Ð·Ð´Ñ€Ð°Ð²ÑÑ‚Ð²ÑƒÐ¹Ñ‚Ðµ',
      uk: 'Ð²Ñ–Ñ‚Ð°ÑŽ',
      source: 'lesson',
    }, 'fr');

    await expect(buildCommunitySources('ru', ['stale_community_pack'], 'fr')).resolves.toEqual([]);

    const sources = await loadTrainingSources({
      lang: 'ru',
      studyTarget: 'fr',
      officialPacksEnabled: true,
      communityPacksEnabled: true,
      requestedSourceId: '',
      requestedFilter: '',
    });

    expect(sources.map((source) => source.kind)).toEqual(['saved']);
    expect(sources.some((source) => source.kind === 'official' || source.kind === 'community')).toBe(false);
  });

  it('uses only Russian/Ukrainian source UI copy for French flashcard gates', () => {
    expect(frenchFlashcardsGateCopy('ru').title).toBe('Французские наборы карточек ещё на проверке');
    expect(frenchFlashcardsGateCopy('uk').title).toBe('Французькі набори карток ще на перевірці');
    expect(frenchFlashcardsGateCopy('ru').body).toContain('Английские системные, маркет- и community-наборы скрыты');
    expect(frenchFlashcardsGateCopy('uk').body).toContain('Англійські системні, маркет- і community-набори приховано');
    expect(JSON.stringify(frenchFlashcardsGateCopy('ru'))).not.toMatch(/Cartes françaises|French flashcards|Commencer/);
  });

  it('extends the global French source gate with flashcard-bank evidence blockers', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_flashcard_system_bank',
      'french_flashcard_marketplace_pack_review',
      'french_flashcard_community_pack_policy',
      'ru_uk_flashcard_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_flashcard_system_bank_reuse_without_french_source_gate',
      'english_flashcard_marketplace_pack_reuse_without_french_source_gate',
      'english_flashcard_community_pack_reuse_without_french_source_gate',
    ]));
  });

  it('stores saved flashcards for French outside the legacy English deck', async () => {
    await expect(addFlashcard({
      en: 'hello',
      ru: 'привет',
      uk: 'привіт',
      source: 'lesson',
    }, 'en')).resolves.toBe('added');

    await expect(addFlashcard({
      en: 'bonjour',
      ru: 'здравствуйте',
      uk: 'вітаю',
      source: 'lesson',
    }, 'fr')).resolves.toBe('added');

    expect(mockStorage[flashcardsSavedKey('en')]).toContain('hello');
    expect(mockStorage[flashcardsSavedKey('fr')]).toContain('bonjour');
    expect(mockStorage[flashcardsSavedKey('en')]).not.toContain('bonjour');
    expect(await isFlashcardSaved('bonjour', 'en')).toBe(false);
    expect(await isFlashcardSaved('bonjour', 'fr')).toBe(true);

    await expect(removeFlashcardByEnglish('bonjour', 'en')).resolves.toBe(false);
    expect(await loadFlashcards('fr')).toHaveLength(1);
    await expect(removeFlashcardByEnglish('bonjour', 'fr')).resolves.toBe(true);
    expect(await loadFlashcards('fr')).toHaveLength(0);
  });

  it('repairs stale saved flashcard translations without deleting the user card', () => {
    const cards = [
      repairSavedFlashcardContent({
        id: 'word_shower_old',
        en: 'shower',
        ru: 'Показывать',
        uk: 'Показувати',
        es: 'mostrar',
        source: 'word',
        addedAt: 1,
      }),
      repairSavedFlashcardContent({
        id: 'lesson11_phrase_47_old',
        en: 'They cleaned their room last Sunday',
        ru: 'Они убрали комнаты вчера',
        uk: 'Вони прибрали кімнати вчора',
        source: 'lesson',
        sourceId: '11',
        addedAt: 2,
      }),
      repairSavedFlashcardContent({
        id: 'untouched',
        en: 'show',
        ru: 'показывать',
        uk: 'показувати',
        source: 'word',
        addedAt: 3,
      }),
    ];

    expect(cards).toHaveLength(3);
    expect(cards.find((card) => card.en === 'shower')).toMatchObject({
      ru: 'Душ',
      uk: 'Душ',
      es: 'ducha',
    });
    expect(cards.find((card) => card.en === 'They cleaned their room last Sunday')).toMatchObject({
      ru: 'Они убрали свою комнату в прошлое воскресенье',
      uk: 'Вони прибрали свою кімнату минулої неділі',
      es: 'Limpiaron su habitación el domingo pasado.',
    });
    expect(cards.find((card) => card.en === 'show')).toMatchObject({
      ru: 'показывать',
      uk: 'показувати',
    });
  });

  it('stores custom cards and collection progress per study target', async () => {
    await writeCustomCards([{ id: 'en_custom', en: 'hello' }], 'en');
    await writeCustomCards([{ id: 'fr_custom', en: 'bonjour' }], 'fr');
    await writeFlashcardsProgress({ cat: 'saved', idx: 2 }, 'en');
    await writeFlashcardsProgress({ cat: 'custom', idx: 4 }, 'fr');

    expect(mockStorage[customFlashcardsKey('en')]).toContain('en_custom');
    expect(mockStorage[customFlashcardsKey('fr')]).toContain('fr_custom');
    expect(await readCustomCards('en')).toEqual([{ id: 'en_custom', en: 'hello' }]);
    expect(await readCustomCards('fr')).toEqual([{ id: 'fr_custom', en: 'bonjour' }]);
    expect(await readFlashcardsProgress('en')).toEqual({ cat: 'saved', idx: 2 });
    expect(await readFlashcardsProgress('fr')).toEqual({ cat: 'custom', idx: 4 });
    expect(mockStorage[flashcardsProgressKey('en')]).not.toBe(mockStorage[flashcardsProgressKey('fr')]);
  });

  it('keeps marketplace card cache target-scoped and source-gated for French', async () => {
    const englishCard = {
      id: 'market_en_1',
      en: 'Could you walk me through the key idea?',
      ru: 'Можешь кратко объяснить основную идею?',
      uk: 'Можеш коротко пояснити основну ідею?',
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: 'DEV:pack_en',
    } as const;
    const englishKey = flashcardsMarketplaceBuiltCardsCacheKey('en');
    const frenchKey = flashcardsMarketplaceBuiltCardsCacheKey('fr');

    await saveBuiltMarketplaceCardsCache(['pack_en'], [englishCard], 'en');
    expect(mockStorage[englishKey]).toContain('market_en_1');
    expect(await loadBuiltMarketplaceCardsCache('en')).toMatchObject({
      epoch: MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
      ownedKey: 'pack_en',
    });

    mockStorage[frenchKey] = JSON.stringify({
      epoch: MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
      ownedKey: 'pack_en',
      cards: [englishCard],
    });
    await saveBuiltMarketplaceCardsCache(['pack_en'], [englishCard], 'fr');
    expect(mockStorage[frenchKey]).toBeUndefined();
    await expect(loadBuiltMarketplaceCardsCache('fr')).resolves.toBeNull();
    expect(mockStorage[englishKey]).toContain('market_en_1');
  });

  it('keeps the DEV active flashcard pack marker per study target', async () => {
    await setDevActivePack('pack_en', 'en');
    await setDevActivePack('pack_fr', 'fr');

    expect(mockStorage[flashcardsMarketDevActivePackKey('en')]).toBe('pack_en');
    expect(mockStorage[flashcardsMarketDevActivePackKey('fr')]).toBe('pack_fr');
    await expect(consumeDevActivePack('en')).resolves.toBe('pack_en');
    await expect(consumeDevActivePack('fr')).resolves.toBe('pack_fr');
    expect(mockStorage[flashcardsMarketDevActivePackKey('en')]).toBeUndefined();
    expect(mockStorage[flashcardsMarketDevActivePackKey('fr')]).toBeUndefined();
  });

  it('keeps marketplace owned pack ids per study target', async () => {
    await saveOwnedPackIds(['pack_en'], 'en');
    await saveOwnedPackIds(['pack_fr'], 'fr');
    mockStorage[flashcardsMarketDevOwnedPacksKey('fr')] = JSON.stringify(['dev_pack_fr']);

    expect(mockStorage[flashcardsOwnedPacksKey('en')]).toContain('pack_en');
    expect(mockStorage[flashcardsOwnedPacksKey('fr')]).toContain('pack_fr');
    expect(mockStorage[flashcardsMarketDevOwnedPacksKey('fr')]).toContain('dev_pack_fr');
    await expect(loadOwnedPackIds('en')).resolves.toEqual(['pack_en']);
    await expect(loadOwnedPackIds('fr')).resolves.toEqual(['pack_fr', 'dev_pack_fr']);
    await expect(loadDevOwnedPackIds('fr')).resolves.toEqual(['pack_fr', 'dev_pack_fr']);
    expect(mockStorage[flashcardsOwnedPacksKey('en')]).not.toContain('pack_fr');
  });

  it('keeps opened marketplace pack ceremonies per study target', async () => {
    await markPackCeremoniallyOpened('pack_en', 'en');
    await markPackCeremoniallyOpened('pack_fr', 'fr');

    expect(mockStorage[flashcardsOpenedPacksKey('en')]).toContain('pack_en');
    expect(mockStorage[flashcardsOpenedPacksKey('fr')]).toContain('pack_fr');
    await expect(isPackCeremoniallyOpened('pack_fr', 'en')).resolves.toBe(false);
    await expect(isPackCeremoniallyOpened('pack_fr', 'fr')).resolves.toBe(true);
  });

  it('keeps community pack ownership and hidden UGC state per study target', async () => {
    await addCommunityOwnedPackId('community_en', 'en');
    await addCommunityOwnedPackId('community_fr', 'fr');
    await hideCommunityPackOnDevice('hidden_en', 'en');
    await hideCommunityPackOnDevice('hidden_fr', 'fr');

    expect(mockStorage[flashcardsCommunityOwnedPacksKey('en')]).toContain('community_en');
    expect(mockStorage[flashcardsCommunityOwnedPacksKey('fr')]).toContain('community_fr');
    expect(mockStorage[flashcardsCommunityOwnedPacksKey('en')]).not.toContain('community_fr');
    await expect(loadCommunityOwnedPackIds('en')).resolves.toEqual(['community_en']);
    await expect(loadCommunityOwnedPackIds('fr')).resolves.toEqual(['community_fr']);

    expect(mockStorage[flashcardsHiddenCommunityPacksKey('en')]).toContain('hidden_en');
    expect(mockStorage[flashcardsHiddenCommunityPacksKey('fr')]).toContain('hidden_fr');
    expect(mockStorage[flashcardsHiddenCommunityPacksKey('en')]).not.toContain('hidden_fr');
    await expect(loadHiddenCommunityPackIds('en')).resolves.toEqual(['hidden_en']);
    await expect(loadHiddenCommunityPackIds('fr')).resolves.toEqual(['hidden_fr']);
  });

  it('keeps pack gift vouchers target-scoped and source-gated for French', async () => {
    const englishKey = flashcardsPackTrialGiftKey('en');
    const frenchKey = flashcardsPackTrialGiftKey('fr');

    await expect(setRandomPackGiftTrial48h('en')).resolves.toMatchObject({ packId: expect.any(String) });
    expect(mockStorage[englishKey]).toBeTruthy();
    await expect(getPackGiftTrial('en')).resolves.toMatchObject({ packId: expect.any(String) });

    await expect(setRandomPackGiftTrial48h('fr')).resolves.toBeNull();
    expect(mockStorage[frenchKey]).toBeUndefined();

    mockStorage[frenchKey] = JSON.stringify({
      packId: 'official_peaky_blinders_en',
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
    });
    await expect(getPackGiftTrial('fr')).resolves.toBeNull();
    expect(mockStorage[frenchKey]).toBeUndefined();

    await consumePackGiftTrial('en');
    expect(mockStorage[englishKey]).toBeUndefined();
  });

  it('threads studyTarget through flashcard UI save, collection, and swipe surfaces', () => {
    const addButtonSource = fs.readFileSync(path.join(ROOT, 'components', 'AddToFlashcard.tsx'), 'utf8');
    const collectionSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_collection.tsx'), 'utf8');
    const swipeSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');
    const hubSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards.tsx'), 'utf8');
    const marketDevSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_market_dev.tsx'), 'utf8');
    const packOpeningSource = fs.readFileSync(path.join(ROOT, 'app', 'pack_opening.tsx'), 'utf8');
    const shardsShopSource = fs.readFileSync(path.join(ROOT, 'app', 'shards_shop.tsx'), 'utf8');
    const paywallHookSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'useCardPackShardPaywall.tsx'), 'utf8');
    const lifetimeSource = fs.readFileSync(path.join(ROOT, 'app', 'lifetime_profile_stats.ts'), 'utf8');
    const levelGiftSource = fs.readFileSync(path.join(ROOT, 'app', 'level_gift_system.ts'), 'utf8');
    const leagueChestSource = fs.readFileSync(path.join(ROOT, 'app', 'services', 'league_chest_rewards.ts'), 'utf8');
    const globalBroadcastSource = fs.readFileSync(path.join(ROOT, 'app', 'global_broadcast_modal.ts'), 'utf8');
    const globalBroadcastModalSource = fs.readFileSync(path.join(ROOT, 'components', 'GlobalBroadcastModal.tsx'), 'utf8');
    const clubSource = fs.readFileSync(path.join(ROOT, 'app', 'club_screen.tsx'), 'utf8');
    const levelGiftModalSource = fs.readFileSync(path.join(ROOT, 'components', 'LevelGiftModal.tsx'), 'utf8');
    const levelGiftDualModalSource = fs.readFileSync(path.join(ROOT, 'components', 'LevelGiftDualModal.tsx'), 'utf8');
    const levelGiftInventorySource = fs.readFileSync(path.join(ROOT, 'app', 'level_gift_inventory.ts'), 'utf8');
    const levelGiftsInventoryScreenSource = fs.readFileSync(path.join(ROOT, 'app', 'level_gifts_inventory.tsx'), 'utf8');

    expect(addButtonSource).toContain('const { studyTarget: contextStudyTarget } = useStudyTarget()');
    expect(addButtonSource).toContain('addFlashcard({');
    expect(addButtonSource).toContain('}, activeStudyTarget)');
    expect(addButtonSource).toContain('removeFlashcardByEnglish(enSnap, activeStudyTarget)');
    expect(addButtonSource).toContain('updateMultipleTaskProgress(updates, { studyTarget: activeStudyTarget })');

    expect(collectionSource).toContain('loadFlashcards(studyTarget)');
    expect(collectionSource).toContain('readCustomCards(studyTarget)');
    expect(collectionSource).toContain('readFlashcardsProgress(studyTarget)');
    expect(collectionSource).toContain('flashcardsDeleteHintSeenKey(studyTarget)');
    expect(collectionSource).toContain('writeFlashcardsProgress({ cat: activeCat, idx: index }, studyTarget)');
    expect(collectionSource).toContain('removeFlashcard(target.id, studyTarget)');
    expect(collectionSource).toContain('writeCustomCards(updated, studyTarget)');
    expect(collectionSource).toContain('flashcardsSystemCardsForTarget(SYSTEM_CARDS, studyTarget, lang)');
    expect(collectionSource).toContain('ensureFrenchRemoteFlashcards(lang)');
    expect(collectionSource).toContain('officialPacksEnabled ? marketCards : []');
    expect(collectionSource).toContain('loadBuiltMarketplaceCardsCache(studyTarget, lang)');
    expect(collectionSource).toContain('loadAccessiblePackIds(studyTarget)');
    expect(collectionSource).toContain('loadCommunityOwnedPackIds(studyTarget)');
    expect(collectionSource).toContain('saveBuiltMarketplaceCardsCache([...ownedIds, ...communityIdsToLoad].sort(), builtMarket, studyTarget, lang)');
    expect(collectionSource).toContain('consumeDevActivePack(studyTarget)');

    expect(swipeSource).toContain('peekFlashcardsCache(studyTarget)');
    expect(swipeSource).toContain('peekCustomCardsCache(studyTarget)');
    expect(swipeSource).toContain('loadFlashcards(studyTarget)');
    expect(swipeSource).toContain('readCustomCards(studyTarget)');
    expect(swipeSource).toContain('loadSwipeMemory(studyTarget)');
    expect(swipeSource).toContain('saveSwipeMemory(memoryRef.current, studyTarget)');
    expect(swipeSource).toContain('loadFlashcardsSwipeSessionDraft(sessionDraftScope, Date.now(), studyTarget)');
    expect(swipeSource).toContain('saveFlashcardsSwipeSessionDraft(draft, studyTarget)');
    expect(swipeSource).toContain('const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(swipeSource).toContain('officialPacksEnabled ? requestedOfficialOwnedIds : []');
    expect(swipeSource).toContain('officialPacksEnabled ? loadAccessiblePackIds(studyTarget)');
    expect(swipeSource).toContain('buildOfficialTrainingSourcesFromIds(officialOwnedIds, lang, studyTarget)');
    expect(swipeSource).toContain('loadCommunityOwnedPackIds(studyTarget)');
    expect(swipeSource).toContain('buildCommunitySources(lang, officialOwnedIds, studyTarget)');

    const audioSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_audio.tsx'), 'utf8');
    const trainingSourcesSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'trainingSources.ts'), 'utf8');
    expect(audioSource).toContain('buildCachedTrainingSources(');
    expect(audioSource).toContain('studyTarget,');
    expect(trainingSourcesSource).toContain('flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(trainingSourcesSource).toContain('flashcardsCommunityPacksAvailableForTarget(studyTarget)');

    expect(hubSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(hubSource).toContain('primeCustomFlashcardsCache(studyTarget)');
    expect(hubSource).toContain('const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(hubSource).toContain('loadAccessiblePackIds(studyTarget)');
    expect(hubSource).toContain('loadCommunityOwnedPackIds(studyTarget)');
    expect(hubSource).toContain("const owned = officialPacksEnabled && ownedPackIds.length > 0 ? ownedPackIds.join('|') : ''");
    expect(hubSource).toContain('marketPacks={officialPacksEnabled ? marketPacks : []}');
    expect(hubSource).toContain('studyTarget={studyTarget}');

    expect(marketDevSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(marketDevSource).toContain('const frenchPacksBlocked = !flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(marketDevSource).toContain('const frenchGateCopy = frenchFlashcardsGateCopy(lang)');
    expect(marketDevSource).toContain('if (frenchPacksBlocked)');
    expect(marketDevSource).toContain('loadDevOwnedPackIds(studyTarget)');
    expect(marketDevSource).toContain('saveDevOwnedPackIds(updated, studyTarget)');
    expect(marketDevSource).toContain('primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget)');
    expect(marketDevSource).toContain('setDevActivePack(packId, studyTarget)');

    expect(shardsShopSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(shardsShopSource).toContain('const officialCardPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(shardsShopSource).toContain('if (!officialCardPacksEnabled)');
    expect(shardsShopSource).toContain('studyTarget,');
    expect(shardsShopSource).toContain('getPackGiftTrial(studyTarget)');

    expect(paywallHookSource).toContain('studyTarget?: RuntimeStudyTarget');
    expect(paywallHookSource).toContain('isPackCeremoniallyOpened(pw.pack.id, studyTarget)');
    expect(paywallHookSource).toContain('redeemPackGiftVoucher(pw.pack, studyTarget)');
    expect(paywallHookSource).toContain('purchaseCardPackWithShards(pw.pack, studyTarget)');

    const categoryHubSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'FlashcardsCategoryHub.tsx'), 'utf8');
    const shardPurchaseSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'cardPackShardPurchase.ts'), 'utf8');
    const paywallModalSource = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'CardPackShardPaywallModal.tsx'), 'utf8');
    const reportModalSource = fs.readFileSync(path.join(ROOT, 'components', 'ReportPackModal.tsx'), 'utf8');
    const communityCreateSource = fs.readFileSync(path.join(ROOT, 'app', 'community_pack_create.tsx'), 'utf8');
    expect(categoryHubSource).toContain('loadHiddenCommunityPackIds(studyTarget)');
    expect(categoryHubSource).toContain('hideCommunityPackOnDevice(pack.id, studyTarget)');
    expect(categoryHubSource).toContain('studyTarget={studyTarget}');
    expect(categoryHubSource).toContain('stageOwnedPackCardsForNavigation(pack.id, studyTarget)');
    expect(categoryHubSource).toContain("frenchFlashcardsGateCopy('ru').body");
    expect(shardPurchaseSource).toContain('purchaseCommunityPackWithShards(pack, studyTarget)');
    expect(shardPurchaseSource).toContain('flashcardsOfficialPacksAvailableForTarget(studyTarget)');
    expect(shardPurchaseSource).toContain('getPackGiftTrial(studyTarget)');
    expect(shardPurchaseSource).toContain('consumePackGiftTrial(studyTarget)');
    expect(paywallModalSource).toContain('studyTarget?: RuntimeStudyTarget');
    expect(paywallModalSource).toContain('hideCommunityPackOnDevice(pack.id, studyTarget)');
    expect(reportModalSource).toContain('studyTarget?: RuntimeStudyTarget');
    expect(reportModalSource).toContain('hideCommunityPackOnDevice(packId, studyTarget)');
    expect(communityCreateSource).toContain('const communityPacksTargetEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget)');
    expect(communityCreateSource).toContain('Community-наборы для French закрыты до отдельной проверки источников.');

    expect(collectionSource).toContain('if (!flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale)) return false;');
    expect(collectionSource).toContain('consumeStagedOwnedPackMarketCards(studyTarget)');
    expect(collectionSource).toContain('communityPacksEnabled && CLOUD_SYNC_ENABLED && !IS_EXPO_GO');

    expect(packOpeningSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(packOpeningSource).toContain('const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang)');
    expect(packOpeningSource).toContain('if (!officialPacksEnabled && !communityPacksEnabled)');
    expect(packOpeningSource).toContain('officialPacksEnabled ? peekWarmMarketplacePacks(studyTarget, lang) ?? reserveBundledMarketPacks(studyTarget, lang) : []');
    expect(packOpeningSource).toContain('if (!foundPack && officialPacksEnabled)');
    expect(packOpeningSource).toContain('if (!foundPack && communityPacksEnabled)');
    expect(packOpeningSource).toContain('if (!communityPacksEnabled)');
    expect(packOpeningSource).toContain('if (!officialPacksEnabled)');
    expect(packOpeningSource).toContain('markPackCeremoniallyOpened(packId, studyTarget)');

    expect(lifetimeSource).toContain("const LIFETIME_STATS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr']");
    expect(lifetimeSource).toContain('lessonProgressKey(lessonId, studyTarget)');
    expect(lifetimeSource).toContain('lessonWordsKey(id, studyTarget)');
    expect(lifetimeSource).toContain('readCustomCards(studyTarget)');
    expect(levelGiftSource).toContain('setRandomPackGiftTrial48h(opts?.studyTarget)');
    expect(levelGiftSource).toContain('flashcardsOfficialPacksAvailableForTarget(studyTarget)');
    expect(levelGiftSource).toContain('loadOwnedPackIds(studyTarget)');
    expect(levelGiftSource).toContain('isFlashcardPackLevelGiftId(id)');
    expect(leagueChestSource).toContain('setRandomPackGiftTrial48h(studyTarget)');
    expect(globalBroadcastSource).toContain('setRandomPackGiftTrial48h(studyTarget)');
    expect(globalBroadcastModalSource).toContain('claimAndDismissGlobalBroadcastModal(payload, studyTarget)');
    expect(clubSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(levelGiftModalSource).toContain('rollF2pLevelGiftForUser(level, { studyTarget })');
    expect(levelGiftDualModalSource).toContain('rollF2pLevelGiftForUser(level, { premiumSafe: true, studyTarget })');
    expect(levelGiftDualModalSource).toContain('rollPremiumLevelGiftForUser(level, { studyTarget })');
    expect(levelGiftInventorySource).toContain('sanitizeLevelGiftForStudyTarget(gift, target)');
    expect(levelGiftsInventoryScreenSource).toContain('loadPendingLevelGiftInventory(studyTarget)');
  });
});
