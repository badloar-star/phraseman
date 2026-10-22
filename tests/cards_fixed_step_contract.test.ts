// зачем (владелец 22.10 через координатора: «ползунок, который уменьшает карточки, убираем, оставляем только их нормальный вид»; выбор «Полоса и щипок»): сторож — ползунка (ZoomBar) и щипка нет,
// шаг сетки всегда 0 (одна горизонтальная карточка на строку, высота 118, радиус 16), прежний сохранённый шаг сбрасывается на 0 с журналом [CARDS-GRID] old=… → 0, поиск остаётся на месте,
// переключатель «список ↔ колода» не тронут.
import fs from 'node:fs';
import path from 'node:path';

import { GALLERY_OPEN_STEP, GALLERY_STEPS } from '../components/cards-grid/cardsGalleryLayout';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const exists = (rel: string): boolean => fs.existsSync(path.join(ROOT, rel));
// комментарии «зачем» называют убранные вещи по именам — проверяем только код
const code = (rel: string): string => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('«Карточки»: только нормальный вид (шаг 0)', () => {
  it('нормальный вид по макету: шаг 0 — одна колонка, высота 118, радиус 16', () => {
    expect(GALLERY_OPEN_STEP).toBe(0);
    expect(GALLERY_STEPS[GALLERY_OPEN_STEP]).toMatchObject({ cols: 1, h: 118, radius: 16 });
  });

  it('полосы масштаба и хука щипка больше нет, функций положения ползунка тоже', () => {
    expect(exists('components/cards-grid/ZoomBar.tsx')).toBe(false);
    expect(exists('components/cards-grid/useCardsScale.ts')).toBe(false);
    const layout = code('components/cards-grid/cardsGalleryLayout.ts');
    expect(layout).not.toMatch(/stepForSliderFraction|sliderFractionForStep|GALLERY_DEFAULT_STEP/);
  });

  it('ни в экранах «Сохранённые» и «Набор до добавления», ни в галерее нет щипка, ползунка, выбора шага и анимации перетекания', () => {
    for (const file of ['app/flashcards/CollectionGalleryView.tsx', 'app/flashcards/CommunityPackPreview.tsx', 'components/cards-grid/CardsGallery.tsx']) {
      const src = code(file);
      expect(src).not.toMatch(/Gesture\.Pinch|GestureDetector|ZoomBar|useCardsGridStep|useCardsScale|useFixedGalleryStep|setStep\(|onZoomStep|fc-zoom|CARDS-ZOOM|morph|useAnimatedStyle|react-native-reanimated/);
    }
    expect(exists('components/cards-grid/useFixedGalleryStep.ts')).toBe(false);
  });

  it('мёртвый код галереи удалён: таблица шагов из одной строки, сетка одна, нет опоры щипка и докрутки', () => {
    const layout = code('components/cards-grid/cardsGalleryLayout.ts');
    expect(layout).not.toMatch(/galleryScrollFor|galleryAnchorIndex|unionRange|GALLERY_MORPH|galleryLayoutFor|galleryVisibleRange/);
    expect(GALLERY_STEPS).toHaveLength(1);
    const grid = code('components/cards-grid/cardsGalleryGrid.ts');
    expect(grid).not.toMatch(/gridScrollFor|gridAnchorIndex/);
    expect(grid).toContain('const grids = [buildGalleryGrid(0, cards, width, fontScale, fixes)] as const;');
    // сброс сохранённого шага подключают экраны (сама галерея остаётся лёгкой и не тянет хранилище)
    expect(read('app/flashcards/CollectionGalleryView.tsx')).toContain("import '../../components/cards-grid/gallery_step_prefs';");
    expect(read('app/flashcards/CommunityPackPreview.tsx')).toContain("import '../../components/cards-grid/gallery_step_prefs';");
  });

  it('поиск остаётся на месте: залипающая полоса под шапкой держит поле, шаг при поиске не меняется', () => {
    const view = code('app/flashcards/CollectionGalleryView.tsx');
    expect(view).toContain('stickyHeaderIndices={[1]}');
    expect(view).toContain('<StickySearchBar g={g} search={searchField ?? null} />');
    expect(view).not.toMatch(/SEARCH_STEP|beforeSearchStep|поиск начат/);
    expect(view).toContain('highlight={searching ? searchQuery : undefined}');
    const bar = read('components/cards-grid/StickySearchBar.tsx');
    expect(bar).toContain("withAlpha(bg, 'FF'), withAlpha(bg, 'FF'), withAlpha(bg, '00')");
    expect(bar).toContain('if (!search) return');
  });

  it('в наборе сообщества нигде не осталась залипающая «полоса» вместо сетки', () => {
    expect(code('app/flashcards/CommunityPackPreview.tsx')).not.toContain('stickyHeaderIndices');
  });

  it('переключатель вида «список ↔ колода» не тронут', () => {
    const collection = read('app/flashcards_collection.tsx');
    expect(collection).toContain("const next: FcCollectionViewMode = prev === 'list' ? 'deck' : 'list';");
    expect(read('app/flashcards/CollectionHeaderV2.tsx')).toContain("menu.viewMode === 'list' ? 'albums-outline' : 'grid-outline'");
  });
});

describe('сохранённый шаг прошлых версий сбрасывается на 0', () => {
  const KEY = 'fc_gallery_step_v1';
  type Store = Record<string, string>;

  async function runReset(initial: Store, failRead = false): Promise<{ writes: Array<[string, string]>; logs: string[] }> {
    const writes: Array<[string, string]> = [];
    const logs: string[] = [];
    const spyLog = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
    try {
      jest.resetModules();
      jest.doMock('@react-native-async-storage/async-storage', () => ({
        __esModule: true,
        default: {
          getItem: jest.fn(async (k: string) => {
            if (failRead) throw new Error('диск недоступен');
            return k in initial ? initial[k] : null;
          }),
          setItem: jest.fn(async (k: string, v: string) => { writes.push([k, v]); }),
        },
      }));
      jest.doMock('../app/swallow_log', () => ({ noteSwallowedHandler: () => () => undefined }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- свежий модуль под каждый случай
      const prefs = require('../components/cards-grid/gallery_step_prefs') as typeof import('../components/cards-grid/gallery_step_prefs');
      await prefs.resetStoredGalleryStep();
    } finally {
      spyLog.mockRestore();
      spyWarn.mockRestore();
    }
    return { writes, logs };
  }

  it.each(['1', '2', '3'])('на диске был шаг %s: пишем 0 и журнал «old=… → 0»', async (old) => {
    const { writes, logs } = await runReset({ [KEY]: old });
    expect(writes).toEqual([[KEY, '0']]);
    expect(logs.some((l) => l.includes(`[CARDS-GRID] old=${old} → 0`))).toBe(true);
  });

  it('на диске уже 0 или ничего нет: на диск не пишем, журнал называет находку', async () => {
    const zero = await runReset({ [KEY]: '0' });
    expect(zero.writes).toEqual([]);
    expect(zero.logs.some((l) => l.includes('[CARDS-GRID] old=0 → 0'))).toBe(true);
    const none = await runReset({});
    expect(none.writes).toEqual([]);
    expect(none.logs.some((l) => l.includes('[CARDS-GRID] old=нет → 0'))).toBe(true);
  });

  it('диск не читается: не падаем, причина в журнале', async () => {
    const { writes, logs } = await runReset({ [KEY]: '2' }, true);
    expect(writes).toEqual([]);
    expect(logs.some((l) => l.includes('не удалось сбросить сохранённый шаг') && l.includes('диск недоступен'))).toBe(true);
  });
});
