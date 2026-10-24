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
  communitySortIonicon,
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

  it('фильтров ровно два: «Популярные» и «Новые» («Больше карточек» убран)', () => {
    expect(COMMUNITY_SORTS).toEqual(['popular', 'new']);
    expect(read('app', 'community_packs', 'communityCatalogFilter.ts')).not.toMatch(/'size'/);
    for (const rel of [
      ['app', 'flashcards', 'FlashcardsCategoryHub.tsx'],
      ['app', 'flashcards_packs.tsx'],
    ]) {
      const src = read(...(rel as string[]));
      expect(src).not.toMatch(/Больше карточек|Więcej kart|Daha çok kart/);
    }
  });

  it('у каждой сортировки есть иконка для круглой кнопки шапки', () => {
    for (const sort of COMMUNITY_SORTS) {
      expect(communitySortIonicon(sort, true).length).toBeGreaterThan(0);
      expect(communitySortIonicon(sort, false)).toContain('-outline');
      expect(communitySortIonicon(sort, true)).not.toContain('-outline');
    }
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
    // зачем: снимок 2.0 (efe19ae9d, 30.09) — в «Сохранённых» поиск виден даже при пустом списке; на экране набора (deeplink) его нет.
    expect(collection).toContain("showSearch={!packDeeplink && (activeCat === 'saved' || !(isEmpty && !searchActive))}");
    expect(header).toContain('testID="fc-search-input"');
  });

  it('режимы выбираются на хабе, коллекция не дублирует панель тренировки', () => {
    // The current hub owns this flow (already true in HEAD before Saved changes).
    const trainingHub = read('app', 'flashcards', 'FlashcardsHubScreen.tsx');
    expect(trainingHub).toContain('<FlashcardsTrainingModeSheet');
    expect(trainingHub).toContain("pathname: '/flashcards_training_setup'");
    expect(header).not.toContain('fc-train-deck');
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

describe('каталог сообщества: строки и тексты', () => {
  const hub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');

  // 11.10 (владелец, журнал 29): плашка набора — Вариант 1 «Плитка-счётчик» community-redesign.html #c1,
  // общий компонент PackRow (фиксированная высота под 2 строки названия) вместо строк packs-simple.html.
  // 12.10 (владелец, cards-v2 catalog()): плашка «Плитка-счётчик» заменена общей «стопкой» PackDeck; круглая «+» ушла в меню долгого нажатия
  it('наборы рисуются столбиком стопок через общий PackDeck', () => {
    expect(hub).toContain('renderCommunityPackRow');
    expect(hub).toContain('<PackDeck');
    expect(hub).toContain('<PackDeckLikes');
    expect(hub).not.toContain('<PackRowAddButton');
    expect(hub).toContain("actionRow('flashcards-pack-add'"); // быстрое «Добавить себе» живёт в меню долгого нажатия
    expect(hub).not.toContain('renderCommunityPackTile');
    expect(hub).not.toContain('minHeight: 74');
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

describe('шапка каталога сообщества (замечания владельца, iPhone)', () => {
  const hub = read('app', 'flashcards', 'FlashcardsCategoryHub.tsx');
  const screen = read('app', 'flashcards_packs.tsx');

  it('заголовок один — «Сообщество» 34/40 под панелью (cards-v2), «назад» в шапке', () => {
    expect(screen).toContain("'flashcards-packs-title'");
    expect(screen).toContain("ru: 'Сообщество'");
    expect(screen).toContain('testID="flashcards-header-back"');
    /** В теле каталога заголовков больше нет — дубль «Наборы» / «Наборы сообщества» убран. */
    expect(hub).not.toContain("ru: 'Наборы сообщества'");
    expect(hub).not.toMatch(/ru: 'Наборы',/);
  });

  it('поиск — постоянная капсула «Наборы и авторы» (cards-v2 catalog()), без лупы-переключателя', () => {
    expect(hub).not.toContain('TextInput');
    expect(screen).toContain('<KitSearchField g={g}');
    expect(screen).toContain('testID="flashcards-packs-search"');
    expect(screen).toContain("ru: 'Наборы и авторы'");
    expect(screen).not.toContain('flashcards-packs-search-toggle');
  });

  it('поиск находит и по имени автора', () => {
    expect(read('app', 'community_packs', 'communityCatalogFilter.ts')).toContain('pack.authorName,');
  });

  it('язык — в шапке, сортировки и уровни — чипы «Популярные / Новые / A1…» под капсулой поиска', () => {
    expect(screen).toContain('<PackLanguagePicker');
    expect(screen).toContain('value={packLanguage}');
    expect(screen).toContain('<PackChips g={g}');
    expect(screen).toContain("{ id: 'popular', label: topPacksLabel }");
    expect(screen).toContain("{ id: 'new', label: newPacksLabel }");
    // зачем: чипы уровней рисуются, только если у наборов каталога есть уровень (данные ждём от Ядра)
    expect(screen).toContain('...availableLevels.map(');
    expect(screen).toContain('testID="flashcards-packs-create"');
  });

  it('активный чип выделен заливкой темы и accessibilityState (kit PackChips)', () => {
    const chips = read('components', 'packs', 'PackScreenKit.tsx');
    expect(chips).toContain('accessibilityState={{ selected: on }}');
    expect(chips).toContain('on ? { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }');
    expect(chips).toContain('color: on ? g.accentInk : g.secondary');
    expect(screen).toContain('setCommunitySort(id)');
    expect(screen).toContain('setCommunityLevel(id)');
  });

  it('по умолчанию каталог открыт на «Новые» (макет packs-simple кадр 1), ?sort=popular ведёт на «Топ»', () => {
    expect(screen).toContain("params.sort === 'popular' ? 'popular' : 'new'");
    expect(screen).not.toContain("params.sort === 'new' ? 'new' : 'popular'");
    // сортировка клиентская над одним списком: нового запроса/индекса Firestore смена умолчания не требует
    expect(hub).toContain('applyCommunityPacksFilter(feed.packs, communityQuery, communitySort)'); // 24.10 (T3): язык наборов — в общем правиле communityFeedPacks
  });

  it('нижней плавающей плашки нет — список не перекрывается доком (макет #c1, 11.10)', () => {
    expect(screen).not.toContain('bottomTabsDock');
    expect(screen).not.toContain('dockClearance');
    expect(screen).toMatch(/paddingBottom: \(embedded \? tabContentBottomPad : Math\.max\(insets\.bottom, 16\)\) \+ 24/);
  });

  it('каталог получает фильтр готовым из шапки', () => {
    expect(screen).toContain('communityQuery={communityQuery}');
    expect(screen).toContain('communitySort={communitySort}');
    expect(screen).toContain('packLanguage={packLanguage}');
    expect(hub).toContain('applyCommunityPacksFilter(feed.packs, communityQuery, communitySort)'); // 24.10 (T3): язык наборов — в общем правиле communityFeedPacks
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
