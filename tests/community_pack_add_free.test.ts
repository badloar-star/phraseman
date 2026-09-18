/**
 * Наборы сообщества: бесплатные добавляются одним нажатием, платные покупаются
 * за руны.
 *
 * ⚠️ ПРАВИЛО ИЗМЕНЕНО ВЛАДЕЛЬЦЕМ 2026-09-17 (макет docs/design/runes/MAKET.html,
 * экраны 6–8). Прежнее Cards 2.1 §1.2 «наборы сообщества бесплатны всегда»
 * ОТМЕНЕНО: автор ставит цену ползунком 0…5 000 рун и может менять её когда
 * угодно. Руны остаются у приложения — автор получает читателей, не выплату.
 *
 * Что сторож охраняет ТЕПЕРЬ:
 *  • бесплатный набор (цена 0) и любой СТАРЫЙ набор по-прежнему добавляются
 *    одним нажатием, без подтверждений и без валюты — старые авторы не
 *    пострадали от ввода платности (прямое решение владельца);
 *  • ЖЕМЧУГ в наборы сообщества не возвращается: у них своя валюта — руны.
 *    Смешение двух валют в одном каталоге и было причиной прежнего запрета.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCommunityPackToLibrary } from '../app/community_packs/communityPackActions';
import {
  loadCommunityOwnedPackIds,
  loadCommunityOwnedPackTitles,
} from '../app/community_packs/communityOwnedStorage';
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

  test('повторное открытие уже добавленного набора обновляет сохранённую рубашку', async () => {
    await addCommunityPackToLibrary(pack({}));
    expect(await addCommunityPackToLibrary(pack({ ugcCardBackKey: 'community_06_forest_rune' })))
      .toBe('already_added');

    expect((await loadCommunityOwnedPackTitles()).ugc_1?.ugcCardBackKey)
      .toBe('community_06_forest_rune');
  });

  test('официальный набор больше не выдаётся', async () => {
    expect(await addCommunityPackToLibrary(pack({ id: 'official_wild_west_en', isCommunityUgc: false, isOfficial: true })))
      .toBe('unavailable');
    expect(await loadCommunityOwnedPackIds()).toEqual([]);
  });
});

describe('в потоке наборов нет ЖЕМЧУГА и XP', () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

  // зачем запрет остался, но сузился (владелец 2026-09-17): наборы сообщества
  // покупаются за РУНЫ. Жемчуг — валюта официальных наборов «Магазина
  // осколков», и смешение двух валют в одном каталоге как раз и было причиной
  // прежнего полного запрета. XP тут по-прежнему ни при чём: добавление набора
  // не учёба и не должно двигать прогресс.
  test('действия над наборами не импортируют жемчуг и XP', () => {
    for (const rel of [
      'app/community_packs/communityPackActions.ts',
      'app/community_packs/packSocial.ts',
      'app/community_packs/packSocialFirestore.ts',
      'app/community_packs/CommunityPackSocialBar.tsx',
      'app/flashcards/FlashcardsCategoryHub.tsx',
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/from '.*shards_system'/);
      expect(src).not.toMatch(/from '.*xp_/);
      expect(src).not.toMatch(/spendShards|getShardsBalance/);
    }
  });

  // Цена читается ОДНОЙ функцией. Разойдись показ и списание — в каталоге
  // стояла бы одна цифра, а списалась бы другая.
  test('цена набора берётся из единственного источника', () => {
    expect(read('app/flashcards/marketplace.ts')).toMatch(/export function communityPackPriceRunes\(/);
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx')).toMatch(/communityPackPriceRunes\(pack\)/);
  });

  // Цена, сохранённая автором, обязана доезжать из Firestore: без чтения поля
  // каталог и шит покупки всегда видели бы 0 — «механизм есть, данных нет».
  test('цена в рунах читается из документа набора', () => {
    expect(read('app/community_packs/communityFirestore.ts')).toMatch(/priceRunes: Math\.max\(0, num\(data\.priceRunes\)\)/);
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

  test('цена в ЖЕМЧУГЕ не вернулась в схему, публикацию и черновик набора', () => {
    for (const rel of [
      'app/community_packs/schema.ts',
      'app/community_packs/functionsClient.ts',
      'app/community_packs/communityPackDraftStorage.ts',
      'app/community_pack_create.tsx',
    ]) {
      expect(read(rel)).not.toMatch(/COMMUNITY_PACK_PRICE_SHARDS/);
    }
    /** Легаси-поле жемчуга в опубликованных документах читаем как ноль. */
    expect(read('app/community_packs/communityFirestore.ts')).toMatch(/priceShards: 0,/);
  });

  // Автор ставит цену ползунком (владелец выбрал дизайн 3 ради свободы: три
  // готовых пресета не дали бы поставить, например, 1 500).
  test('автор выбирает цену ползунком в границах 0…5 000', () => {
    const market = read('app/flashcards/marketplace.ts');
    expect(market).toMatch(/COMMUNITY_PACK_PRICE_MIN_RUNES = 0/);
    expect(market).toMatch(/COMMUNITY_PACK_PRICE_MAX_RUNES = 5000/);
    const create = read('app/community_pack_create.tsx');
    expect(create).toMatch(/testID="ugc-pack-price-slider"/);
    // Приватный набор ценой не обладает: его никто, кроме автора, не увидит.
    expect(create).toMatch(/priceRunes: publishToCommunity \? priceRunes : 0/);
  });
});
