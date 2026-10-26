// зачем (слово владельца 26.10: «каталог Наборов заново, премиально, на сцене; одно главное действие; плитка без карточек-превью; всё слушает тему»):
// сторож модели «Набора месяца», порядка плиток, 9 языков текста, обложек из токенов темы и «исходного» вида (нет обводок, кегли 13/16/26, нет своих цветов, нет чипов-превью).
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { HOME_SCENE_MIN_WHITE_CONTRAST } from '../components/home/v2/scene/home_scene_tokens';
import { PACKS_CATALOG_V3_PREVIEW_ME, packsCatalogV3Fixtures } from '../components/packs/catalog_v3/packs_catalog_v3_fixtures';
import { packsCatalogV3Text, type PacksCatalogV3TextKey } from '../components/packs/catalog_v3/packs_catalog_v3_copy';
import { PACK_COVER_GLYPHS, packCoverPaint, packHash, packsCatalogColors, pickByHash } from '../components/packs/catalog_v3/packs_catalog_v3_tokens';
import { catalogOrder, contestDaysLeft, contestMonthKey, contestStanding, packPublishedAtMs } from '../components/packs/catalog_v3/packs_contest_model';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const COMPONENT_FILES = [
  'components/packs/catalog_v3/PackCoverV3.tsx',
  'components/packs/catalog_v3/PackTileV3.tsx',
  'components/packs/catalog_v3/PackFilterRailV3.tsx',
  'components/packs/catalog_v3/PackMonthContest.tsx',
  'components/packs/catalog_v3/PacksCatalogV3.tsx',
] as const;
/** Код без строк-комментариев, чтобы пояснения «зачем» не ловились сторожем литералов. */
const codeOnly = (source: string): string => source.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('{/*')).join('\n');

const MAY_10 = Date.UTC(2026, 4, 10, 12, 0, 0);

describe('«Набор месяца»: модель', () => {
  it('месяц и дни до конца считаются по UTC; в последний день — 1', () => {
    expect(contestMonthKey(Date.UTC(2026, 9, 31, 23, 59, 59))).toBe('2026-10');
    expect(contestMonthKey(Date.UTC(2026, 10, 1, 0, 0, 0))).toBe('2026-11');
    expect(contestDaysLeft(Date.UTC(2026, 9, 1, 0, 0, 0))).toBe(31);
    expect(contestDaysLeft(Date.UTC(2026, 9, 31, 12, 0, 0))).toBe(1);
    expect(contestDaysLeft(Date.UTC(2026, 9, 31, 23, 59, 59))).toBe(1);
    expect(contestDaysLeft(Date.UTC(2026, 1, 28, 0, 0, 1))).toBe(1);
  });

  it('дата публикации: publishedAt, иначе updatedAt, иначе null', () => {
    expect(packPublishedAtMs({ publishedAt: '2026-05-03T10:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' })).toBe(Date.UTC(2026, 4, 3, 10));
    expect(packPublishedAtMs({ updatedAt: '2026-05-04T00:00:00.000Z' })).toBe(Date.UTC(2026, 4, 4));
    expect(packPublishedAtMs({ updatedAt: 'не дата' })).toBeNull();
    expect(packPublishedAtMs({})).toBeNull();
  });

  it('в конкурсе — только наборы людей этого месяца; официальные, видео, прошлые и без даты не участвуют', () => {
    const base = { cardCount: 10, authorName: 'A' };
    const standing = contestStanding([
      { ...base, id: 'in-1', likesCount: 5, publishedAt: '2026-05-02T00:00:00.000Z' },
      { ...base, id: 'old', likesCount: 500, publishedAt: '2026-04-30T23:59:59.000Z' },
      { ...base, id: 'official', likesCount: 400, isOfficial: true, publishedAt: '2026-05-02T00:00:00.000Z' },
      { ...base, id: 'video', likesCount: 300, videoId: 'x', publishedAt: '2026-05-02T00:00:00.000Z' },
      { ...base, id: 'undated', likesCount: 200 },
    ], MAY_10, null);
    expect(standing.entries).toBe(1);
    expect(standing.podium.map((e) => e.id)).toEqual(['in-1']);
    expect(standing.monthKey).toBe('2026-05');
    expect(standing.daysLeft).toBe(22);
    expect(standing.myPlace).toBeNull();
  });

  it('порядок мест: лайки, поровну — раньше опубликованный, затем id; подиум — не больше трёх', () => {
    const base = { cardCount: 1, authorName: 'A' };
    const standing = contestStanding([
      { ...base, id: 'c', likesCount: 3, publishedAt: '2026-05-05T00:00:00.000Z' },
      { ...base, id: 'b', likesCount: 3, publishedAt: '2026-05-03T00:00:00.000Z' },
      { ...base, id: 'a', likesCount: 9, publishedAt: '2026-05-09T00:00:00.000Z' },
      { ...base, id: 'd', likesCount: 1, publishedAt: '2026-05-01T00:00:00.000Z' },
      { ...base, id: 'e', publishedAt: '2026-05-01T00:00:00.000Z' },
    ], MAY_10, null);
    expect(standing.podium.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(standing.entries).toBe(5);
  });

  it('своё место — лучший из своих наборов; лайки — этого набора; нет своих — null и 0', () => {
    const base = { cardCount: 1, authorName: 'A' };
    const packs = [
      { ...base, id: 'x', likesCount: 8, publishedAt: '2026-05-01T00:00:00.000Z', authorStableId: 'other' },
      { ...base, id: 'm1', likesCount: 2, publishedAt: '2026-05-02T00:00:00.000Z', authorStableId: 'me' },
      { ...base, id: 'm2', likesCount: 5, publishedAt: '2026-05-03T00:00:00.000Z', authorStableId: 'me' },
    ];
    const mine = contestStanding(packs, MAY_10, 'me');
    expect(mine.myPlace).toBe(2);
    expect(mine.myLikes).toBe(5);
    const none = contestStanding(packs, MAY_10, 'stranger');
    expect(none.myPlace).toBeNull();
    expect(none.myLikes).toBe(0);
  });

  it('«Топ» и «Новые» — два порядка одного списка, без изменения исходного', () => {
    const packs = [
      { id: 'a', cardCount: 1, authorName: 'A', likesCount: 1, publishedAt: '2026-05-09T00:00:00.000Z' },
      { id: 'b', cardCount: 1, authorName: 'A', likesCount: 7, publishedAt: '2026-05-01T00:00:00.000Z' },
      { id: 'c', cardCount: 1, authorName: 'A', likesCount: 7, publishedAt: '2026-05-05T00:00:00.000Z' },
    ];
    const snapshot = JSON.stringify(packs);
    expect(catalogOrder(packs, 'popular').map((p) => p.id)).toEqual(['c', 'b', 'a']);
    expect(catalogOrder(packs, 'new').map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(JSON.stringify(packs)).toBe(snapshot);
  });

  it('моки: набор прошлого месяца с рекордом лайков в подиум не попадает; «me» — четвёртое место', () => {
    const full = packsCatalogV3Fixtures('full', MAY_10);
    expect(full.packs.some((p) => p.id === 'preview-old')).toBe(true);
    const standing = contestStanding(full.packs, MAY_10, null);
    expect(standing.podium.map((e) => e.id)).toEqual(['preview-1', 'preview-2', 'preview-3']);
    const me = packsCatalogV3Fixtures('me', MAY_10);
    expect(contestStanding(me.packs, MAY_10, me.myStableId).myPlace).toBe(4);
    expect(me.myStableId).toBe(PACKS_CATALOG_V3_PREVIEW_ME);
    expect(packsCatalogV3Fixtures('few', MAY_10).packs).toHaveLength(2);
    expect(packsCatalogV3Fixtures('loading', MAY_10)).toMatchObject({ packs: [], loaded: false });
    expect(packsCatalogV3Fixtures('empty', MAY_10)).toMatchObject({ packs: [], loaded: true });
  });
});

describe('каталог на сцене: тексты и цвета', () => {
  const KEYS: readonly PacksCatalogV3TextKey[] = ['contestTitle', 'myPlace', 'notInContest', 'create', 'empty', 'daysLeft', 'cardsA11y', 'likesA11y', 'openPack'];

  it('каждый текст есть на 9 языках и не пустой; числа подставляются', () => {
    for (const key of KEYS) {
      const seen = new Set<string>();
      for (const lang of LANGS) {
        const text = packsCatalogV3Text(lang, key, 7);
        expect(text.trim().length).toBeGreaterThan(0);
        seen.add(text);
      }
      expect(seen.size).toBeGreaterThan(1);
    }
    for (const lang of LANGS) {
      expect(packsCatalogV3Text(lang, 'daysLeft', 12)).toContain('12');
      expect(packsCatalogV3Text(lang, 'myPlace', 3)).toContain('3');
    }
  });

  it('обложка — чистая функция id: одинаковый id даёт ту же обложку, значок из списка', () => {
    const colors = packsCatalogColors(LIQUID_GLASS_THEME_IDS[0], 'dark');
    const a = packCoverPaint('pack-1', colors);
    expect(packCoverPaint('pack-1', colors)).toEqual(a);
    expect(PACK_COVER_GLYPHS).toContain(a.glyph);
    expect(packHash('pack-1')).toBe(packHash('pack-1'));
    expect(packHash('pack-1')).not.toBe(packHash('pack-2'));
  });

  it('обложка не падает ни на каком id, в том числе с большим хэшем (старший бит): индекс всегда внутри списка', () => {
    const colors = packsCatalogColors(LIQUID_GLASS_THEME_IDS[0], 'dark');
    let highBit = 0;
    for (let i = 0; i < 6000; i += 1) {
      const id = `pack-${i}-${(i * 2654435761) >>> 0}`;
      if (packHash(id) >= 2 ** 31) highBit += 1;
      const paint = packCoverPaint(id, colors);
      expect(paint.angle).toBeDefined();
      expect(typeof paint.angle.x).toBe('number');
      expect(PACK_COVER_GLYPHS).toContain(paint.glyph);
      expect(paint.from).toBeTruthy();
      expect(paint.to).toBeTruthy();
    }
    expect(highBit).toBeGreaterThan(1000); // зачем: ловим именно класс бага — без хэшей с большим старшим битом тест бы его не видел
  });

  it('pickByHash: пустой список или выход за границы — не исключение, а журнал [PACKS-V3] и первый элемент', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(pickByHash(['a', 'b', 'c'], 7, 'probe')).toBe('b');
      expect(pickByHash(['a', 'b', 'c'], -1, 'probe')).toBe('a');
      expect(warn.mock.calls.some((c) => String(c[0]).startsWith('[PACKS-V3]'))).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it('все темы × оба оформления: сцена читаема белым (≥ 4,5) и обложки собираются', () => {
    const bad: string[] = [];
    for (const themeId of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        const colors = packsCatalogColors(themeId, appearance);
        if (colors.scene.whiteContrastTop < HOME_SCENE_MIN_WHITE_CONTRAST) bad.push(`${themeId}/${appearance}: ${colors.scene.whiteContrastTop.toFixed(2)}`);
        const paint = packCoverPaint('probe', colors);
        if (!paint.from || !paint.to || !colors.cta || !colors.ctaInk) bad.push(`${themeId}/${appearance}: пустой цвет`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('каталог на сцене: исходный вид (правила владельца)', () => {
  it('нет обводок контейнеров, ужатия шрифта и своих цветов; кегли только 13 / 16 / 26', () => {
    for (const file of COMPONENT_FILES) {
      const source = read(file);
      const code = codeOnly(source);
      expect(code).not.toMatch(/borderWidth|borderColor|borderTopWidth|borderBottomWidth/);
      expect(code).not.toContain('adjustsFontSizeToFit');
      expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(code).not.toMatch(/rgba?\(\s*\d/);
      const sizes = [...code.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      for (const size of sizes) expect([13, 16, 26]).toContain(size);
    }
  });

  it('плитка набора — без карточек-превью и чипов; одно главное действие на экране', () => {
    const tile = read('components/packs/catalog_v3/PackTileV3.tsx');
    expect(tile).not.toMatch(/PackChips|packDeckLevel|chips|Chip/);
    const catalog = read('components/packs/catalog_v3/PacksCatalogV3.tsx');
    expect(catalog.match(/testID="packs-v3-create"/g)?.length).toBe(1);
    expect(catalog).toContain('SpireSceneBackdrop');
  });

  it('блок конкурса — тот же язык, что у пьедестала Пика (стекло и белый текст сцены); подиум 2-1-3', () => {
    const contest = read('components/packs/catalog_v3/PackMonthContest.tsx');
    expect(contest).toContain('SPIRE_SCENE_BLOCK');
    expect(contest).toContain('SPIRE_SCENE_INK');
    expect(contest).toContain('const COLUMN_ORDER = [2, 1, 3] as const;');
  });

  it('dev-маршрут: в релизе уводит на Главную; в прод и во вкладку «Сообщество» экран не подключён', () => {
    const route = read('app/dev_packs_catalog_v3.tsx');
    expect(route).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;');
    const storeBranch = read('router.ctx.js').split(': require.context(')[0] ?? '';
    expect(storeBranch).toContain('dev_packs_catalog_v3'); // стор-ветка router.ctx.js вырезает dev-вход
    expect(read('app/(tabs)/community.tsx')).not.toContain('catalog_v3');
    expect(read('app/flashcards_packs.tsx')).not.toContain('catalog_v3');
  });
});
