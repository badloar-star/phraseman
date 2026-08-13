/**
 * Cards 2.1 §1.3/§1.4 — «Добавить себе» вместо покупки:
 * одно нажатие, без списаний и подтверждений; повторное добавление ничего не меняет.
 * Плюс структурная защита: поток наборов не импортирует осколки/звёзды/XP.
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCommunityPackToLibrary } from '../app/community_packs/communityPackActions';
import { loadCommunityOwnedPackIds } from '../app/community_packs/communityOwnedStorage';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };

function pack(p: Partial<FlashcardMarketPack>): FlashcardMarketPack {
  return {
    id: 'ugc_1',
    codeName: 'Code',
    titleRu: 'Набор',
    titleUk: 'Набір',
    titleEs: '',
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    category: 'slang',
    cardCount: 12,
    priceShards: 0,
    salesCount: 0,
    authorName: 'Community',
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...p,
  };
}

describe('добавление набора сообщества', () => {
  beforeEach(() => {
    asyncStorageMock.__reset();
  });

  test('первое нажатие добавляет набор, повторное — нет', async () => {
    expect(await addCommunityPackToLibrary(pack({}))).toBe('added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['ugc_1']);
    expect(await addCommunityPackToLibrary(pack({}))).toBe('already_added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['ugc_1']);
  });

  test('официальный набор больше не выдаётся', async () => {
    expect(await addCommunityPackToLibrary(pack({ id: 'official_wild_west_en', isCommunityUgc: false, isOfficial: true })))
      .toBe('unavailable');
    expect(await loadCommunityOwnedPackIds()).toEqual([]);
  });
});

describe('в потоке наборов нет валюты', () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

  test('действия над наборами не импортируют осколки/звёзды/XP', () => {
    for (const rel of [
      'app/community_packs/communityPackActions.ts',
      'app/community_packs/packSocial.ts',
      'app/community_packs/packSocialFirestore.ts',
      'app/community_packs/CommunityPackSocialBar.tsx',
      'app/flashcards/FlashcardsCategoryHub.tsx',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/from '.*shards_system'/);
      expect(src).not.toMatch(/from '.*stars_system'/);
      expect(src).not.toMatch(/from '.*xp_/);
      expect(src).not.toMatch(/spendShards|getShardsBalance/);
    }
  });

  /**
   * Отступление от буквы §1.3: сами модули покупки за осколки остаются на диске —
   * их использует «Магазин осколков» (`shards_shop.tsx`) для официальных наборов,
   * это другой раздел приложения. Инвариант, который реально нужен спеке: КАТАЛОГ
   * наборов раздела «Карточки» ничего не покупает и не знает про paywall.
   */
  test('каталог наборов не использует покупку за осколки', () => {
    for (const rel of [
      'app/flashcards/FlashcardsCategoryHub.tsx',
      'app/flashcards_packs.tsx',
      'app/community_packs/communityPackActions.ts',
      'app/community_packs/CommunityPackSocialBar.tsx',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/useCardPackShardPaywall|CardPackShardPaywallModal/);
      expect(src).not.toMatch(/purchaseCardPackWithShards|purchaseCommunityPackWithShards/);
      expect(src).not.toMatch(/callCommunityPurchasePack/);
    }
    /** Экран набора в коллекции — тоже без покупки. */
    expect(read('app/flashcards_collection.tsx')).not.toMatch(/purchaseCommunityPackWithShards/);
  });

  test('цена ушла из схемы, публикации и черновика набора', () => {
    for (const rel of [
      'app/community_packs/schema.ts',
      'app/community_packs/functionsClient.ts',
      'app/community_packs/communityPackDraftStorage.ts',
      'app/community_pack_create.tsx',
    ]) {
      expect(read(rel)).not.toMatch(/COMMUNITY_PACK_PRICE_SHARDS/);
    }
    /** Легаси-поле в опубликованных документах читаем как ноль и нигде не показываем. */
    expect(read('app/community_packs/communityFirestore.ts')).toMatch(/priceShards: 0,/);
  });
});
