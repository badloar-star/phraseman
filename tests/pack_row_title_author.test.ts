/**
 * Строка набора: название без хвоста файла, автор официального набора, фиксированная высота.
 *
 * зачем (владелец, OWNER_REQUESTS_LEDGER строки 4, 5, 9, 29; пакет packs-author-title-row-height-2026-10-11):
 *   • название набора нигде не показывается с «.docx» / «(1)» / « - копия» — одна функция Ядра cleanPackSourceTitle;
 *   • у официальных наборов Professor Lingman автор — «Professor Lingman», и при этом НЕ тратится чтение
 *     несуществующего public_profiles/video:* (💸 экономия Firebase);
 *   • высота строки — от межстрочного × 2 с учётом масштаба шрифта, одинаковая для короткого и длинного названия.
 */
const mockCollection = jest.fn();

jest.mock('@react-native-firebase/firestore', () => {
  const firestore = () => ({
    collection: (name: string) => {
      mockCollection(name);
      return {
        doc: () => ({
          get: async () => ({ exists: true, data: () => ({ name: 'lingua_max', coinRank: 7 }) }),
        }),
      };
    },
  });
  return { __esModule: true, default: firestore };
});

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: async () => 'me-stable-id' }));

import { cleanPackSourceTitle } from '../shared/pack_source_title';
import { OFFICIAL_PACK_AUTHOR_NAME } from '../shared/official_pack_marker';
import { formatPackTitleForDisplay, packTitleForInterface, type FlashcardMarketPack } from '../app/flashcards/marketplace';
import {
  __resetCommunityAuthorNameCacheForTests,
  isOfficialPackAuthorId,
  officialPackAuthorName,
  resolveCommunityAuthorProfile,
} from '../app/community_packs/packAuthorNames';
import {
  COUNT_TILE_MAX_FONT_SCALE,
  PACK_ROW_BADGE_LINE,
  PACK_ROW_METRICS,
  PACK_ROW_TITLE_LINES,
  countTileWidth,
  estimatedTileWordWidth,
  packRowHeight,
  splitTitleHighlight,
} from '../components/packs/packRowModel';
import { bumpPackCounts, EMPTY_PACK_COUNTS_OVERLAY, livePackCounts, packBaseCounts } from '../app/community_packs/packLiveCounts';
import { packAddFailureToast, packHideFailureToast } from '../app/community_packs/packQuickAdd';

const VIDEO_ID = 'dQw4w9WgXcQ';

const pack = (over: Partial<FlashcardMarketPack> & { id: string }): FlashcardMarketPack =>
  ({
    codeName: over.id,
    titleRu: '', titleUk: '', titleEs: '', titlePtBr: '',
    titleVi: '', titleId: '', titleTr: '', titlePl: '',
    descriptionRu: '', descriptionUk: '', descriptionEs: '', descriptionPtBr: '',
    descriptionVi: '', descriptionId: '', descriptionTr: '', descriptionPl: '',
    category: 'slang',
    cardCount: 500,
    priceShards: 0,
    likesCount: 0,
    addedCount: 0,
    salesCount: 0,
    authorName: '',
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...over,
  }) as FlashcardMarketPack;

describe('название набора — через cleanPackSourceTitle', () => {
  it('formatPackTitleForDisplay совпадает с функцией Ядра и снимает хвост файла', () => {
    for (const raw of ['Английский по-человечески — 500 фраз.docx', 'Phrasal verbs (1)', 'Family - копия', 'Notes.PDF']) {
      expect(formatPackTitleForDisplay(raw)).toBe(cleanPackSourceTitle(raw));
    }
    expect(formatPackTitleForDisplay('Английский по-человечески — 500 фраз.docx')).toBe('Английский по-человечески — 500 фраз');
  });

  it('если от названия ничего не осталось, показывается исходник, а не пустота', () => {
    expect(formatPackTitleForDisplay('.docx')).toBe('.docx');
  });

  it('packTitleForInterface (каталог, «Мои наборы», тренировка, шапки) отдаёт чистое название', () => {
    const p = pack({ id: 'ugc1', titleRu: 'Английский по-человечески — 500 фраз.docx' });
    expect(packTitleForInterface(p, 'ru')).toBe('Английский по-человечески — 500 фраз');
    // язык автора, когда своей локали нет
    expect(packTitleForInterface(p, 'pl')).toBe('Английский по-человечески — 500 фраз');
    // середина названия не трогается
    expect(packTitleForInterface(pack({ id: 'ugc2', titleRu: 'Mr. Smith (part 2) notes' }), 'ru')).toBe('Mr. Smith (part 2) notes');
  });
});

describe('автор официального набора — Professor Lingman без чтения public_profiles', () => {
  beforeEach(() => {
    mockCollection.mockClear();
    __resetCommunityAuthorNameCacheForTests();
  });

  it('строгий признак Ядра: id автора video:<videoId> и videoId формата YouTube', () => {
    expect(officialPackAuthorName({ authorStableId: `video:${VIDEO_ID}`, videoId: VIDEO_ID })).toBe(OFFICIAL_PACK_AUTHOR_NAME);
    expect(OFFICIAL_PACK_AUTHOR_NAME).toBe('Professor Lingman');
    // подделка: ник или чужой id — не официальный
    expect(officialPackAuthorName({ authorStableId: 'user-123', authorName: 'Professor Lingman' })).toBeNull();
    expect(officialPackAuthorName({ authorStableId: `video:${VIDEO_ID}`, videoId: 'other' })).toBeNull();
    expect(officialPackAuthorName(null)).toBeNull();
  });

  it('официальный id автора не читает public_profiles', async () => {
    expect(isOfficialPackAuthorId(`video:${VIDEO_ID}`)).toBe(true);
    const profile = await resolveCommunityAuthorProfile(`video:${VIDEO_ID}`);
    expect(profile.name).toBe('');
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('обычный автор по-прежнему читает профиль один раз и получает ранг монеты', async () => {
    const profile = await resolveCommunityAuthorProfile('kZ8f2Ld0Qn3pWx7bVt91aQ');
    expect(profile.name).toBe('lingua_max');
    expect(profile.coinRank).toBe(7);
    expect(mockCollection).toHaveBeenCalledTimes(1);
    expect(mockCollection).toHaveBeenCalledWith('public_profiles');
    // повтор — из кэша, без второго чтения
    await resolveCommunityAuthorProfile('kZ8f2Ld0Qn3pWx7bVt91aQ');
    expect(mockCollection).toHaveBeenCalledTimes(1);
  });
});

describe('строка набора: фиксированная высота и подсветка поиска', () => {
  const unit = (n: number): number => n;
  const scaled = (k: number) => (n: number): number => n * k;

  it('высота под две строки названия: плашка 92, kit-строка 85 при шрифте 1.0', () => {
    expect(PACK_ROW_TITLE_LINES).toBe(2);
    // 12 + (22×2 + 6 + 18) + 12 — плитка-счётчик 68 ровно по тексту (макет #c1 `.ct`)
    expect(packRowHeight('plate', unit)).toBe(92);
    // 10 + (22×2 + 21) + 10
    expect(packRowHeight('row', unit)).toBe(85);
  });

  it('при крупном системном шрифте высота растёт от межстрочного, а не остаётся пиксельной', () => {
    expect(packRowHeight('plate', scaled(1.5))).toBe(Math.ceil(24 + (33 * 2 + 6 + 27)));
    expect(packRowHeight('row', scaled(2))).toBe(Math.ceil(20 + (44 * 2 + 42)));
    expect(packRowHeight('plate', scaled(1.5))).toBeGreaterThan(packRowHeight('plate', unit));
  });

  it('совпадение поиска выделяется без учёта регистра, нет запроса — без подсветки', () => {
    expect(splitTitleHighlight('B2 глаголы', 'ГЛАГОЛ')).toEqual({ before: 'B2 ', match: 'глагол', after: 'ы' });
    expect(splitTitleHighlight('Family', '')).toEqual({ before: 'Family', match: '', after: '' });
    expect(splitTitleHighlight('Family', 'zzz')).toEqual({ before: 'Family', match: '', after: '' });
  });

  it('бейдж «Топ» ниже межстрочного названия при любом масштабе — строка не раздувается (ревью п.7)', () => {
    for (const k of [1, 1.3, 2, 3]) {
      expect(PACK_ROW_BADGE_LINE * k).toBeLessThan(PACK_ROW_METRICS.plate.titleLine * k);
    }
  });

  it('плитка-счётчик: подпись и 4-значное число помещаются при любом масштабе шрифта (ревью п.6)', () => {
    // самые длинные подписи всех 9 языков (packCardsWord)
    const words = ['карточек', 'карточки', 'карточка', 'карток', 'картки', 'tarjetas', 'cartões', 'fiszek', 'fiszki', 'kartu', 'cards', 'thẻ', 'kart'];
    for (const scale of [1, 1.1, 1.2, 1.3, 1.5, 2, 3]) {
      const width = countTileWidth(scale);
      expect(width).toBeGreaterThanOrEqual(PACK_ROW_METRICS.plate.tileWidth);
      for (const w of words) expect(estimatedTileWordWidth(w, scale)).toBeLessThanOrEqual(width);
      // «9999»: цифра Inter 700 ≈ 0.62 em от 23, растёт не больше предела
      expect(4 * 23 * 0.62 * Math.min(Math.max(scale, 1), COUNT_TILE_MAX_FONT_SCALE)).toBeLessThanOrEqual(width);
    }
    expect(countTileWidth(1)).toBe(68);
    expect(countTileWidth(1.3)).toBe(Math.ceil(68 * 1.3));
    expect(countTileWidth(3)).toBe(Math.ceil(68 * COUNT_TILE_MAX_FONT_SCALE));
  });
});

describe('живые счётчики поверх каталога (ревью п.2)', () => {
  const base = packBaseCounts({ likesCount: 4, addedCount: 17, commentsCount: 0 });

  it('лайк, отклик и «+» сдвигают цифры сразу', () => {
    let o = bumpPackCounts(EMPTY_PACK_COUNTS_OVERLAY, 'p1', base, { likes: 1 });
    o = bumpPackCounts(o, 'p1', base, { comments: 1 });
    o = bumpPackCounts(o, 'p1', base, { added: 1 });
    expect(livePackCounts(o, 'p1', base)).toEqual({ likes: 5, added: 18, comments: 1 });
    // другие наборы не затронуты
    expect(livePackCounts(o, 'p2', base)).toEqual(base);
  });

  it('откат «+» возвращает цифру, ниже нуля не уходит', () => {
    let o = bumpPackCounts(EMPTY_PACK_COUNTS_OVERLAY, 'p1', base, { added: 1 });
    o = bumpPackCounts(o, 'p1', base, { added: -1 });
    expect(livePackCounts(o, 'p1', base).added).toBe(17);
    const zero = packBaseCounts({});
    expect(livePackCounts(bumpPackCounts(EMPTY_PACK_COUNTS_OVERLAY, 'p1', zero, { likes: -1 }), 'p1', zero).likes).toBe(0);
  });

  it('экран набора: чтение пришло ПОСЛЕ лайка и уже учло его — показываем N+1, а не N+2 (ревью 2, п.2)', () => {
    const catalog = packBaseCounts({ likesCount: 4, addedCount: 17, commentsCount: 0 });
    const afterLike = bumpPackCounts(EMPTY_PACK_COUNTS_OVERLAY, 'p1', catalog, { likes: 1 });
    expect(livePackCounts(afterLike, 'p1', catalog).likes).toBe(5);
    const lateRead = packBaseCounts({ likesCount: 5, addedCount: 17, commentsCount: 0 });
    expect(livePackCounts(afterLike, 'p1', lateRead).likes).toBe(5);
  });

  it('пришло новое значение каталога (сервер учёл действие) — сдвиг отбрасывается, двойного счёта нет', () => {
    const o = bumpPackCounts(EMPTY_PACK_COUNTS_OVERLAY, 'p1', base, { likes: 1 });
    const fresh = packBaseCounts({ likesCount: 5, addedCount: 17, commentsCount: 0 });
    expect(livePackCounts(o, 'p1', fresh)).toEqual(fresh);
  });
});

describe('честные тексты отказа (ревью п.1, п.9; коммит 8e8fe95a8)', () => {
  const all = (t: ReturnType<typeof packAddFailureToast>): string => JSON.stringify(t);

  it('unavailable — «Этот набор пока нельзя добавить себе.», как у CommunityPackSocialBar', () => {
    const t = packAddFailureToast('unavailable');
    expect(t.messageRu).toBe('Этот набор пока нельзя добавить себе.');
    expect(t.type).toBe('error');
  });

  it('сбой записи на устройство — про телефон, без слова «связь» ни на одном языке', () => {
    const t = packAddFailureToast('throw:Error');
    expect(t.messageRu).toBe('Не получилось сохранить набор на телефоне. Попробуй ещё раз.');
    for (const toast of [t, packAddFailureToast('unavailable'), packHideFailureToast()]) {
      expect(all(toast)).not.toMatch(/связ|зв’яз|зв'яз|conex|connection|conexão|kết nối|koneksi|bağlant|połącz/i);
    }
  });

  it('тексты переведены на 9 языков', () => {
    for (const toast of [packAddFailureToast('unavailable'), packAddFailureToast('throw:x'), packHideFailureToast()]) {
      for (const key of ['messageRu', 'messageUk', 'messageEn', 'messageEs', 'messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl'] as const) {
        expect(String((toast as Record<string, unknown>)[key] ?? '').length).toBeGreaterThan(0);
      }
    }
  });
});
