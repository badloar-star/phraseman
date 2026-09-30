/**
 * Официальные наборы удалены из приложения; наборы сообщества остаются.
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

  test('официальный бандл-каталог пуст', () => {
    expect(BUNDLED_MARKETPLACE_PACKS).toEqual([]);
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

  test('старое владение не возвращает удалённые официальные паки', () => {
    const out = filterCatalogPacksByOwnership([OFFICIAL_A, OFFICIAL_B, UGC], ['official_prep_in_en']);
    expect(out.map((p) => p.id)).toEqual(['ugc_pack_1']);
  });

  test('наборы сообщества не фильтруются владением', () => {
    const out = filterCatalogPacksByOwnership([UGC], []);
    expect(out).toHaveLength(1);
  });

  test('синхронный фолбек каталога пуст у нового пользователя', () => {
    expect(fallbackBundledMarketPacks()).toEqual([]);
    expect(allBundledMarketPacks()).toEqual([]);
  });

  test('loadMarketplacePacks остаётся пустым даже со старым owned id', async () => {
    const ownedId = OFFICIAL_A.id;
    await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify([ownedId]));

    const list = await loadMarketplacePacks();
    expect(list).toEqual([]);
  });

  test('без купленных паков каталог официальных наборов пуст', async () => {
    await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify([]));
    expect(filterCatalogPacksByOwnership(allBundledMarketPacks(), [])).toEqual([]);
    expect(await loadMarketplacePacks()).toEqual([]);
  });
});
