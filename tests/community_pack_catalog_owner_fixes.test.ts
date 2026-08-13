/**
 * Замечания владельца после теста набора на iPhone:
 *   1) вместо ника автора показывался технический UID;
 *   3) лайк можно ставить только ПОСЛЕ добавления набора себе;
 *   4) набор открывается на просмотр ДО добавления (`?preview=1`);
 *   5) «невидимая стена» — соседний блок с flex:1 съедал половину экрана;
 *   6) на экране набора нет поиска по карточкам;
 *   7) «Слушать»/«Тренировать» — компактные иконки вверху, без текста;
 *   8) каталог сообщества — сетка по 3 в ряд;
 *   9) у каталога есть фильтр (поиск + сортировка);
 *  10) своя неопубликованная коллекция показывает «Сделать публичным»;
 *  11) рекламные подписи-слоганы убраны;
 *  12) слово «колода» в этих файлах не используется.
 */
import fs from 'fs';
import path from 'path';

import {
  applyCommunityPacksFilter,
  COMMUNITY_SORTS,
  communityPackMatchesQuery,
  communitySortLabel,
} from '../app/community_packs/communityCatalogFilter';
import {
  communityAuthorFallbackName,
  communityAuthorLabel,
  looksLikeRawUserId,
} from '../app/community_packs/packAuthorNames';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const ROOT = path.join(__dirname, '..');
const read = (...p: string[]): string => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const pack = (over: Partial<FlashcardMarketPack> & { id: string }): FlashcardMarketPack =>
  ({
    codeName: over.id,
    titleRu: '', titleUk: '', titleEs: '', titlePtBr: '',
    titleVi: '', titleId: '', titleTr: '', titlePl: '',
    descriptionRu: '', descriptionUk: '', descriptionEs: '', descriptionPtBr: '',
    descriptionVi: '', descriptionId: '', descriptionTr: '', descriptionPl: '',
    category: 'slang',
    cardCount: 10,
    priceShards: 0,
    likesCount: 0,
    addedCount: 0,
    salesCount: 0,
    authorName: '',
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as FlashcardMarketPack;

describe('ник автора набора вместо UID', () => {
  it('обрезанный stableId / uid не считается ником', () => {
    expect(looksLikeRawUserId('kZ8f2Ld0Qn3pWx7bVt91aQ')).toBe(true);
    expect(looksLikeRawUserId('9f6c1b2a-77d3-4e01-b8aa-5c0f2d1e9a44')).toBe(true);
    expect(looksLikeRawUserId('Community')).toBe(true);
    expect(looksLikeRawUserId('Unknown')).toBe(true);
  });

  it('нормальные ники проходят', () => {
    expect(looksLikeRawUserId('Максим')).toBe(false);
    expect(looksLikeRawUserId('lingua_max')).toBe(false);
    expect(looksLikeRawUserId('Anna Smith')).toBe(false);
  });

  it('подпись автора — ник, иначе нейтральный фолбэк, но не UID', () => {
    expect(communityAuthorLabel('lingua_max', 'ru')).toBe('lingua_max');
    expect(communityAuthorLabel('kZ8f2Ld0Qn3pWx7bVt91aQ', 'ru')).toBe(communityAuthorFallbackName('ru'));
    expect(communityAuthorLabel('', 'ru')).toBe(communityAuthorFallbackName('ru'));
  });

  it('фолбэк переведён во все 8 локалей интерфейса', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    const labels = langs.map((l) => communityAuthorFallbackName(l));
    expect(labels.every((s) => s.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBeGreaterThan(1);
  });

  it('каталог больше не кладёт идентификатор автора в authorName', () => {
    const src = read('app', 'community_packs', 'communityFirestore.ts');
    expect(src).not.toContain('authorSid.slice(0, 24)');
    expect(src).toContain('packAuthorNames.ts');
  });
});

describe('фильтр каталога наборов сообщества', () => {
  const packs = [
    pack({ id: 'a', titleRu: 'Сленг улиц', likesCount: 1, addedCount: 9, cardCount: 12, updatedAt: '2026-03-01T00:00:00.000Z' }),
    pack({ id: 'b', titleRu: 'Бизнес-английский', likesCount: 7, addedCount: 2, cardCount: 40, updatedAt: '2026-02-01T00:00:00.000Z' }),
    pack({ id: 'c', titleRu: 'Сленг сериалов', likesCount: 3, addedCount: 3, cardCount: 25, updatedAt: '2026-04-01T00:00:00.000Z' }),
  ];

  it('поиск по названию нечувствителен к регистру и работает по всем локалям', () => {
    expect(communityPackMatchesQuery(packs[0], 'сленг')).toBe(true);
    expect(communityPackMatchesQuery(packs[1], 'сленг')).toBe(false);
    expect(communityPackMatchesQuery(pack({ id: 'd', titlePl: 'Zestaw slangu' }), 'slang')).toBe(true);
    expect(communityPackMatchesQuery(packs[0], '   ')).toBe(true);
  });

  it('«Популярные» — по лайкам вниз', () => {
    expect(applyCommunityPacksFilter(packs, '', 'popular').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('«Новые» — по свежести вниз', () => {
    expect(applyCommunityPacksFilter(packs, '', 'new').map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('«Больше карточек» — по размеру набора вниз', () => {
    expect(applyCommunityPacksFilter(packs, '', 'size').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('поиск и сортировка применяются вместе', () => {
    expect(applyCommunityPacksFilter(packs, 'сленг', 'new').map((p) => p.id)).toEqual(['c', 'a']);
  });

  it('подписи сортировок переведены во все 8 локалей', () => {
    const langs = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const sort of COMMUNITY_SORTS) {
      for (const lang of langs) {
        expect(communitySortLabel(sort, lang).trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('экран набора: раскладка и действия', () => {
  const collection = read('app', 'flashcards_collection.tsx');
  const header = read('app', 'flashcards', 'CollectionHeader.tsx');
  const listView = read('app', 'flashcards', 'CollectionListView.tsx');
  const hub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');
  const socialBar = read('app', 'community_packs', 'CommunityPackSocialBar.tsx');

  it('«невидимая стена» убрана: соц-строка больше не в ContentWrap с flex:1', () => {
    expect(collection).not.toMatch(/<ContentWrap>\s*<CommunityPackSocialBar/);
    expect(collection).toContain('st.socialRow');
  });

  it('на экране набора нет поиска по карточкам, в «Сохранённых» — есть', () => {
    expect(collection).toContain('showSearch={!packDeeplink && !(isEmpty && !searchActive)}');
    expect(header).toContain('testID="fc-search-input"');
  });

  it('«Слушать» и «Тренировать» — иконки в шапке, широкой панели внизу нет', () => {
    expect(header).toContain("testID={key === 'listen' ? 'fc-listen-deck' : 'fc-train-deck'}");
    expect(header).toContain('headset-outline');
    expect(header).toContain('barbell-outline');
    expect(listView).not.toContain('fc-train-deck');
    expect(listView).not.toContain('fc-listen-deck');
  });

  it('набор открывается на просмотр до добавления', () => {
    expect(hub).toContain("preview: '1'");
    expect(collection).toContain('previewPackId: previewRequested ? packDeeplink : null');
    expect(collection).toContain('previewMode: previewRequested');
  });

  it('в режиме просмотра нельзя редактировать и создавать карточки', () => {
    expect(collection).toContain('allowAddCustomCard={allowAddCustomCard && !previewMode}');
    expect(collection).toContain('isEditableCustomCard={previewMode ? () => false : isEditableCustomCard}');
  });

  it('лайк доступен только после добавления набора себе', () => {
    expect(socialBar).toContain('if (!isAdded) {');
    expect(socialBar).toContain('likeLockedToast');
    expect(socialBar).toContain('qa-pack-like-locked');
  });

  it('кнопка «Сделать публичным» есть у своей неопубликованной коллекции', () => {
    expect(header).toContain('testID="fc-pack-publish"');
    expect(collection).toContain("currentMarketPack.listingStatus === 'local_only'");
    expect(collection).toContain('publishLocalAuthorPack');
  });
});

describe('каталог сообщества: сетка и тексты', () => {
  const hub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');

  it('плитки рисуются сеткой по 3 в ряд', () => {
    expect(hub).toContain('const COLS = 3;');
    expect(hub).toContain('renderCommunityPackTile');
    expect(hub).toContain("flexWrap: 'wrap'");
  });

  it('иконка набора берёт обложку автора, а не только бандл по id', () => {
    expect(hub).toContain('packTileImageForPack(pack) ?? bundledPackTilePng(pack.id)');
  });

  it('рекламные подписи-слоганы убраны', () => {
    for (const slogan of [
      'Наборы сообщества — бесплатно',
      'Набори спільноти — безкоштовно',
      'Packs de la comunidad — gratis',
    ]) {
      expect(hub).not.toContain(slogan);
    }
  });
});

describe('слово «колода» выведено из обихода', () => {
  const files = [
    ['app', 'flashcards_packs.tsx'],
    ['app', 'flashcards_collection.tsx'],
    ['app', 'community_pack_create.tsx'],
    ['app', 'flashcards', 'CollectionHeader.tsx'],
    ['app', 'flashcards', 'CollectionListView.tsx'],
    ['app', 'flashcards', 'useCollectionData.ts'],
    ['app', 'flashcards', 'FlashcardsCategoryHub.tsx'],
    ['app', 'community_packs', 'CommunityPackSocialBar.tsx'],
    ['app', 'community_packs', 'communityCatalogFilter.ts'],
    ['app', 'community_packs', 'packAuthorNames.ts'],
    ['app', 'community_packs', 'publishLocalPack.ts'],
  ];

  it.each(files)('%s/%s/%s не содержит «колода»', (...parts) => {
    expect(read(...(parts.filter(Boolean) as string[]))).not.toMatch(/колод/i);
  });
});
