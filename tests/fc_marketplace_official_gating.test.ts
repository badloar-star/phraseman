/**
 * Cards 2.1 §1.1 — официальные наборы выведены из каталога.
 *
 * Инвариант: официальный пак попадает в выдачу каталога ТОЛЬКО если его id уже есть
 * у пользователя (`loadAccessiblePackIds()`); наборы сообщества не фильтруются никогда.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsOwnedPacksKey } from '../app/target_storage_keys';
import {
  BUNDLED_MARKETPLACE_PACKS,
  allBundledMarketPacks,
  fallbackBundledMarketPacks,
  filterCatalogPacksByOwnership,
  isOfficialCatalogPack,
  loadMarketplacePacks,
  resetAccessiblePackIdsCache,
  type FlashcardMarketPack,
} from '../app/flashcards/marketplace';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };

/** Ключ owned-паков скоуплен по цели обучения — берём дефолтную (en). */
const OWNED_PACKS_KEY = flashcardsOwnedPacksKey();

function pack(p: Partial<FlashcardMarketPack>): FlashcardMarketPack {
  return {
    id: 'pack_id',
    codeName: 'Code',
    titleRu: 'RU',
    titleUk: 'UK',
    titleEs: '',
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    category: 'daily',
    cardCount: 10,
    priceShards: 0,
    salesCount: 0,
    authorName: 'Author',
    isOfficial: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...p,
  };
}

const OFFICIAL_A = pack({ id: 'official_prep_in_en', isOfficial: true });
const OFFICIAL_B = pack({ id: 'official_wild_west_en', isOfficial: true });
const UGC = pack({ id: 'ugc_pack_1', isCommunityUgc: true, isOfficial: false });

describe('официальные наборы в каталоге', () => {
  beforeEach(() => {
    asyncStorageMock.__reset();
    resetAccessiblePackIdsCache();
  });

  test('бандл-каталог состоит только из официальных наборов', () => {
    expect(BUNDLED_MARKETPLACE_PACKS.length).toBeGreaterThan(0);
    expect(BUNDLED_MARKETPLACE_PACKS.every((p) => isOfficialCatalogPack(p))).toBe(true);
  });

  test('официальным считается пак по флагу или по префиксу id', () => {
    expect(isOfficialCatalogPack({ id: 'official_x', isOfficial: false })).toBe(true);
    expect(isOfficialCatalogPack({ id: 'ugc_x', isOfficial: true })).toBe(true);
    expect(isOfficialCatalogPack({ id: 'ugc_x', isOfficial: false })).toBe(false);
  });

  test('не-владелец не видит официальные паки в каталоге', () => {
    const out = filterCatalogPacksByOwnership([OFFICIAL_A, OFFICIAL_B, UGC], []);
    expect(out.map((p) => p.id)).toEqual(['ugc_pack_1']);
  });

  test('владелец видит свой официальный пак и не видит чужие', () => {
    const out = filterCatalogPacksByOwnership([OFFICIAL_A, OFFICIAL_B, UGC], ['official_prep_in_en']);
    expect(out.map((p) => p.id)).toEqual(['official_prep_in_en', 'ugc_pack_1']);
  });

  test('наборы сообщества не фильтруются владением', () => {
    const out = filterCatalogPacksByOwnership([UGC], []);
    expect(out).toHaveLength(1);
  });

  test('синхронный фолбек каталога пуст у нового пользователя', () => {
    expect(fallbackBundledMarketPacks()).toEqual([]);
    /** Бандлы при этом на месте — карточки владельцев продолжают собираться. */
    expect(allBundledMarketPacks().length).toBe(BUNDLED_MARKETPLACE_PACKS.length);
  });

  test('loadMarketplacePacks отдаёт только доступные пользователю официальные паки', async () => {
    const ownedId = BUNDLED_MARKETPLACE_PACKS[0].id;
    await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify([ownedId]));

    const list = await loadMarketplacePacks();
    expect(list.map((p) => p.id)).toEqual([ownedId]);
  });

  test('без купленных паков каталог официальных наборов пуст', async () => {
    await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify([]));
    expect(filterCatalogPacksByOwnership(allBundledMarketPacks(), [])).toEqual([]);
    expect(await loadMarketplacePacks()).toEqual([]);
  });
});
