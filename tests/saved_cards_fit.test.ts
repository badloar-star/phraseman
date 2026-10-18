// Требование владельца 18.10: единые размеры, переворот на месте, один язык на каждой стороне.
// Подбор текста, геометрия zoom и обработчики проверяются без нативной среды.
import fs from 'node:fs';
import path from 'node:path';
import { GALLERY_OPEN_STEP, GALLERY_STEPS } from '../components/cards-grid/cardsGalleryLayout';
import { FIT_K_MAX, FIT_K_MIN, estimateLines, fitRefTileWidth, fitScaleFor, stepFace, tileFit } from '../components/cards-grid/cardsGalleryFit';
import { buildGalleryGrids, gridAnchorIndex, gridScrollFor, gridVisibleRange, rowAt } from '../components/cards-grid/cardsGalleryGrid';
import { galleryFaceColors } from '../components/cards-grid/galleryFaceColors';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// реальные длинные фразы набора (как на снимках владельца) и короткие слова
const PHRASES: ReadonlyArray<readonly [string, string]> = [
  ['Do you mind if I join you here?', 'Вы не против, если я присоединюсь к вам?'],
  ['Could you tell me how to get to the nearest metro station?', 'Не подскажете, как добраться до ближайшей станции метро?'],
  ['I would like to make a reservation for two people tonight', 'Я хотел бы забронировать столик на двоих на сегодня вечером'],
  ['Gate', 'Выход'],
  ['Boarding pass', 'Посадочный талон'],
  ['Could I possibly have the check, please? We are in a bit of a hurry', 'Можно счёт, пожалуйста? Мы немного спешим'],
  ['Supercalifragilisticexpialidocious', 'Суперкалифрагилистикэкспиалидошес'],
  ['It is what it is', 'Что есть, то есть'],
];
const WIDTHS = [320, 360, 390, 430, 480].map((w) => w - 40);

it('все размеры сохраняют горизонтальную карточку и полный перевод', () => {
  const cards = PHRASES.map(([front, back], i) => ({ id: String(i), front, back }));
  for (const width of WIDTHS) {
    for (const fontScale of [1, 1.2]) {
      for (const grid of buildGalleryGrids(cards, width, fontScale).grids) {
        expect(grid.face.translation).toBe(true);
        for (let i = 0; i < cards.length; i += 1) {
          expect(grid.geom(i).h).toBeLessThan(grid.geom(i).w);
          expect(grid.fit(i).trLines).toBeGreaterThan(0);
        }
      }
    }
  }
});

// «правдоподобный настоящий» замер: полужирный гротеск — узкие буквы 0.28 em, строчные 0.54, прописные 0.64, m/w 0.84, пробел 0.28; оценка модуля обязана быть НЕ меньше него (запас, а не обрезка)
function realWidth(word: string, size: number): number {
  let em = 0;
  for (const ch of word) {
    if ("iljtfr.,:;!|'’".includes(ch)) em += 0.28;
    else if ('mwMW'.includes(ch)) em += 0.84;
    else if (ch >= 'A' && ch <= 'Z') em += 0.64;
    else em += 0.54;
  }
  return em * size;
}
function plausibleRealLines(text: string, size: number, maxW: number): number {
  let lines = 1;
  let used = 0;
  for (const word of text.split(' ')) {
    const w = realWidth(word, size);
    if (used === 0) { used = Math.min(w, maxW); if (w > maxW) lines += Math.ceil(w / maxW) - 1; continue; }
    if (used + 0.28 * size + w <= maxW) used += 0.28 * size + w;
    else { lines += 1; used = Math.min(w, maxW); if (w > maxW) lines += Math.ceil(w / maxW) - 1; }
  }
  return lines;
}

describe('кегль и размеры считаются от ширины плитки, пропорционально шагу', () => {
  it('в макете (ширина 350) масштаб 1 на каждом шаге; пропорционален ширине и зажат в пределах', () => {
    for (let s = 0; s < 4; s += 1) expect(fitScaleFor(s, fitRefTileWidth(s))).toBeCloseTo(1, 5);
    expect(fitScaleFor(1, fitRefTileWidth(1) * 1.5)).toBe(FIT_K_MAX);
    expect(fitScaleFor(1, fitRefTileWidth(1) * 0.5)).toBe(FIT_K_MIN);
    const narrow = stepFace(1, fitRefTileWidth(1) * 0.9);
    const ref = stepFace(1, fitRefTileWidth(1));
    expect(narrow.wordSize).toBeCloseTo(ref.wordSize * 0.9, 1);
    expect(narrow.trSize).toBeLessThan(ref.trSize);
    expect(narrow.minH).toBeLessThan(ref.minH);
  });

  it('кегли убывают от шага 0 к шагу 3 (крупнее → мельче), как в макете', () => {
    const sizes = [0, 1, 2, 3].map((s) => stepFace(s, fitRefTileWidth(s)).wordSize);
    expect(sizes).toEqual([26, 20, 15, 10.5]);
  });
});

describe('текст помещается целиком на любом шаге и ширине экрана', () => {
  it('высота плитки не ниже макета и растёт под длинную фразу; короткое слово остаётся в высоте макета', () => {
    for (const grid of WIDTHS) {
      for (let s = 0; s < 4; s += 1) {
        const def = GALLERY_STEPS[s]!;
        const face = stepFace(s, (grid - def.gap * (def.cols - 1)) / def.cols);
        const short = tileFit(face, 'Gate', 'Выход');
        const long = tileFit(face, PHRASES[1]![0], PHRASES[1]![1]);
        expect(short.h).toBeGreaterThanOrEqual(face.minH);
        expect(long.h).toBeGreaterThanOrEqual(short.h);
        if (s <= 1) expect(short.h).toBeLessThanOrEqual(Math.round(face.minH * 1.25)); // «Gate» не раздувает плитку
      }
    }
  });

  it('оценка строк не меньше правдоподобного настоящего замера (с запасом): фраза и перевод, все шаги, пять ширин экрана', () => {
    for (const grid of WIDTHS) {
      for (let s = 0; s < 4; s += 1) {
        const def = GALLERY_STEPS[s]!;
        const face = stepFace(s, (grid - def.gap * (def.cols - 1)) / def.cols);
        for (const [front, back] of PHRASES) {
          const fit = tileFit(face, front, back);
          expect([s, grid, front, fit.wordLines >= plausibleRealLines(front, face.wordSize, face.textW)]).toEqual([s, grid, front, true]);
          if (face.translation) expect([s, grid, back, fit.trLines >= plausibleRealLines(back, face.trSize, face.textW)]).toEqual([s, grid, back, true]);
          // Две стороны занимают одну высоту, а не сумму исходного текста и перевода.
          const needed = Math.max(fit.wordLines * face.wordLine + face.wordTop + (face.label ? face.lgLine : 0), face.trLine * fit.trLines + face.trTop);
          expect(fit.h).toBeGreaterThanOrEqual(needed);
        }
      }
    }
  });

  it('у́же текст — не меньше строк; пустой текст — 0 строк', () => {
    const a = estimateLines(PHRASES[0]![0], 20, 200);
    const b = estimateLines(PHRASES[0]![0], 20, 120);
    expect(b).toBeGreaterThanOrEqual(a);
    expect(estimateLines('   ', 20, 100)).toBe(0);
  });
});

describe('карточка всегда горизонтальная: ширина больше высоты на любом шаге (владелец 18.10)', () => {
  const normal = PHRASES.filter(([front]) => !front.startsWith('Supercali')).map(([front, back], i) => ({ id: `h${i}`, front, back }));

  it('все плитки шире, чем выше, на пяти ширинах экрана и всех шагах; длинная фраза уменьшает кегль, а не вытягивает плитку вверх', () => {
    for (const grid of WIDTHS.filter((w) => w >= 320)) { // у самых узких экранов (ширина сетки < 320) 5 колонок физически не дают места под длинную фразу
      const grids = buildGalleryGrids(normal, grid);
      for (const g of grids.grids) {
        for (let i = 0; i < normal.length; i += 1) {
          const t = g.geom(i);
          expect([g.step, grid, normal[i]!.front, t.w / t.h >= 1.05]).toEqual([g.step, grid, normal[i]!.front, true]);
        }
      }
    }
  });

  it('кегль длинной фразы меньше, чем у короткого слова, на тех же шагах; короткое слово остаётся крупным', () => {
    const grids = buildGalleryGrids(normal, 350);
    for (const g of [grids.grids[1]!, grids.grids[2]!]) {
      const longFit = g.fit(1); // «Could you tell me how to get…»
      const shortFit = g.fit(3); // «Gate»
      expect(longFit.wordSize).toBeLessThan(shortFit.wordSize);
      expect(shortFit.scale).toBe(1);
      expect(longFit.wordSize).toBeGreaterThanOrEqual(7);
    }
  });

  it('1 колонка ≈ 390×105: короткая карточка на ширине 390 — 105 × масштаб', () => {
    const g = buildGalleryGrids([{ id: 'a', front: 'Gate', back: 'Выход' }], 390).grids[0]!;
    expect(g.geom(0).h).toBeGreaterThanOrEqual(105);
    expect(g.geom(0).h).toBeLessThanOrEqual(135);
  });
});

describe('сетка с одинаковой высотой рядов', () => {
  const cards = PHRASES.flatMap(([front, back], i) => [0, 1, 2].map((j) => ({ id: `c${i}-${j}`, front, back })));

  it('верха рядов растут с постоянным шагом; все плитки имеют одну высоту', () => {
    const grids = buildGalleryGrids(cards, 350);
    for (const grid of grids.grids) {
      for (let r = 1; r < grid.rowTops.length; r += 1) expect(grid.rowTops[r]!).toBeCloseTo(grid.rowTops[r - 1]! + grid.rowHeights[r - 1]! + grid.gap, 5);
      for (let i = 0; i < cards.length; i += 1) {
        const g = grid.geom(i);
        expect(g.h).toBe(grid.rowHeights[Math.floor(i / grid.cols)]);
        expect(g.w).toBeCloseTo(grid.tileW, 5);
      }
      expect(grid.height).toBeCloseTo(grid.rowTops[grid.rowTops.length - 1]! + grid.rowHeights[grid.rowHeights.length - 1]!, 5);
    }
    // карточки одной геометрии по шагам — один и тот же массив (плитка не перерисовывается зря)
    expect(grids.geoms(3)).toBe(grids.geoms(3));
    expect(grids.geoms(3)).toHaveLength(4);
  });

  it('окно отрисовки покрывает экран и не выходит за список; опора щипка остаётся под пальцами', () => {
    const grids = buildGalleryGrids(cards, 350);
    const grid = grids.grids[1]!;
    const range = gridVisibleRange(grid, cards.length, 300, 800);
    expect(range.from % grid.cols).toBe(0);
    expect(range.to).toBeLessThanOrEqual(cards.length);
    expect(gridVisibleRange(grid, 0, 0, 800)).toEqual({ from: 0, to: 0 });
    const row = rowAt(grid, 400);
    expect(grid.rowTops[row]! + grid.rowHeights[row]! + grid.gap).toBeGreaterThan(400);
    const anchor = gridAnchorIndex(grid, cards.length, 40, 400);
    expect(anchor).toBeGreaterThanOrEqual(0);
    const next = grids.grids[2]!;
    const scroll = gridScrollFor({ n: cards.length, prev: grid, next, fx: 40, fvY: 300, scrollY: 100, gridTop: 260 });
    expect(Number.isFinite(scroll)).toBe(true);
    expect(scroll).toBeGreaterThanOrEqual(0);
    // опорная карточка после смены шага — там же, где палец
    const a = next.geom(anchor);
    expect(a.y).toBeLessThanOrEqual(260 + scroll + 300 + 1000);
  });
});

describe('лицо плитки — токены темы, читаемо во всех темах', () => {
  const lumOf = (hex: string): number => {
    const h = hex.replace('#', '').slice(0, 6);
    const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const ratio = (a: string, b: string): number => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

  it('слово (≥ 4,5) и перевод/подпись (≥ 4,5) читаются на каждой остановке градиента: 23 темы × светлое/тёмное × 3 положения ползунка', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of [0, 0.5, 1]) {
          const g = liquidGlassTokens(id, { intensity, appearance } as never);
          const c = galleryFaceColors(g);
          for (const stop of [c.c1, c.c2, c.c3]) {
            if (ratio(c.ink, stop) < 4.5) bad.push(`${id}|${appearance}|${intensity} слово ${ratio(c.ink, stop).toFixed(2)} на ${stop}`);
            if (ratio(c.inkSoft, stop) < 4.5) bad.push(`${id}|${appearance}|${intensity} перевод ${ratio(c.inkSoft, stop).toFixed(2)} на ${stop}`);
          }
        }
      }
    }
    expect(bad.slice(0, 12)).toEqual([]);
  });
});

describe('исходник и шаг по умолчанию', () => {
  const gallery = read('components/cards-grid/CardsGallery.tsx');

  it('без многоточия и без adjustsFontSizeToFit; кегль — из размеров шага; плитка сверяет настоящие строки', () => {
    const code = gallery.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    expect(code).not.toMatch(/numberOfLines|ellipsizeMode|adjustsFontSizeToFit/);
    expect(code).toContain('onTextLayout');
    expect(code).toContain('fontSize: fit.wordSize');
    expect(code).toContain('maxFontSizeMultiplier={FIT_MAX_FONT_SCALE}');
    expect(code).not.toMatch(/borderWidth|borderColor/);
  });

  it('первый вход — горизонтальный вид (шаг 0); выбор человека запоминается и важнее', () => {
    expect(GALLERY_OPEN_STEP).toBe(0);
    const prefs = read('components/cards-grid/gallery_step_prefs.ts');
    expect(prefs).toContain('return memory ?? GALLERY_OPEN_STEP;');
    expect(read('components/cards-grid/useCardsScale.ts')).toContain('initialGalleryStep()');
    expect(read('components/cards-grid/useCardsScale.ts')).toContain("if (persist) saveGalleryStep(target);");
  });

  it('экран «Сохранённые»: сетки с рядами под текст, точки силы слова из strengthForCard, журнал [SAVED-CARDS-SIZE]', () => {
    const view = read('app/flashcards/CollectionGalleryView.tsx');
    expect(view).toContain('useGalleryGrids(items, width)');
    expect(view).toContain('dots: strength ? strengthDotCount(strength) : 0');
    expect(view).toContain('grids={grids}');
    expect(read('components/cards-grid/useGalleryGrids.ts')).toContain('[SAVED-CARDS-SIZE]');
  });
});

it('один масштаб даёт одинаковые размеры независимо от раздела, длины текста и замеров', () => {
  const short = [{ id: 'short', front: 'Gate', back: 'Выход' }];
  const mixed = PHRASES.map(([front, back], i) => ({ id: String(i), front, back }));
  for (const width of WIDTHS) {
    for (const fontScale of [1, 1.2]) {
      const saved = buildGalleryGrids(short, width, fontScale);
      const video = buildGalleryGrids(mixed, width, fontScale);
      const community = buildGalleryGrids([...mixed].reverse(), width, fontScale, new Map([['0|1', 12]]));
      for (let step = 0; step < 4; step += 1) {
        const expected = saved.grids[step]!.geom(0);
        for (const grid of [video.grids[step]!, community.grids[step]!]) {
          for (let i = 0; i < mixed.length; i += 1) {
            expect(grid.geom(i).w).toBe(expected.w);
            expect(grid.geom(i).h).toBe(expected.h);
            expect(grid.fit(i).h).toBeLessThanOrEqual(expected.h);
          }
        }
      }
    }
  }
});

describe('тап галереи переворачивает карточку, отдельные действия сохраняются', () => {
  it('показывает один язык; выбор, озвучка и longpress сохраняются', () => {
    jest.isolateModules(() => {
      let flipped = false;
      jest.doMock('react', () => ({
        ...jest.requireActual('react'),
        memo: (component: unknown) => component,
        useMemo: (factory: () => unknown) => factory(),
        useEffect: () => undefined,
        useState: (initial: unknown) => typeof initial === 'boolean'
          ? [flipped, (update: (old: boolean) => boolean) => { flipped = update(flipped); }]
          : [initial, () => undefined],
      }));
      jest.doMock('react-native', () => ({ Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: (s: unknown) => s, absoluteFillObject: {} } }));
      jest.doMock('react-native-reanimated', () => ({
        __esModule: true, default: { View: 'AnimatedView' }, useAnimatedStyle: (f: () => unknown) => f(),
        useSharedValue: (value: number) => ({ value }), withTiming: (value: number) => value, Easing: { bezier: () => undefined },
      }));
      jest.doMock('@expo/vector-icons/Ionicons', () => 'Icon');
      jest.doMock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
      jest.doMock('../components/cards-grid/useLineScale', () => ({ useLineScale: () => (n: number) => n }));
      jest.doMock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => [], nestedBoxShadow: () => [], PlateFill: 'PlateFill' }));
      jest.doMock('../components/cards-grid/GalleryTileFace', () => ({ GalleryTileFace: 'Gradient' }));
      jest.doMock('../components/cards-grid/useGalleryGrids', () => ({ useGalleryGrids: () => ({}) }));
      // Execute the real component functions and event handlers; replace only hooks/native adapters.
      type Node = { type: string | ((props: Record<string, unknown>) => Node); props: Record<string, unknown> & { children?: unknown } };
      function expand(node: unknown): Node[] {
        if (Array.isArray(node)) return node.flatMap(expand);
        if (!node || typeof node !== 'object' || !('props' in node)) return [];
        const el = node as Node;
        if (typeof el.type === 'function') return expand(el.type(el.props));
        return [el, ...expand(el.props.children)];
      }
      const { CardsGallery } = require('../components/cards-grid/CardsGallery');
      const cards = [{ id: 'a', front: 'Gate', back: 'Выход', dots: 2 }];
      const onOpen = jest.fn(); const onSpeak = jest.fn(); const onLongPress = jest.fn();
      const props = {
        cards, g: liquidGlassTokens('graphite'), width: 350, step: 0, scrollY: 0, viewportH: 800,
        grids: buildGalleryGrids(cards, 350), onOpen, onSpeak, onLongPress, speakLabel: 'Speak',
        morph: { from: { value: 0 }, to: { value: 0 }, t: { value: 1 }, shift: { value: 0 }, live: { value: false }, fx: { value: 0 }, fy: { value: 0 } },
      };
      let nodes = expand(CardsGallery(props));
      const tile = () => nodes.find((n) => n.type === 'Pressable' && n.props.testID === 'fc-gallery-tile-a')!;
      const press = (node: Node, event = {}) => (node.props.onPress as (event: unknown) => void)(event);
      expect(tile().props.accessibilityLabel).toBe('Gate');
      press(tile()); nodes = expand(CardsGallery(props));
      expect(tile().props.accessibilityLabel).toBe('Выход');
      nodes = expand(CardsGallery({ ...props, step: 2 }));
      expect(tile().props.accessibilityLabel).toBe('Выход');
      nodes = expand(CardsGallery({ ...props, cards: [{ ...cards[0], back: '' }] }));
      expect(tile().props.accessibilityLabel).toBe('Gate');
      nodes = expand(CardsGallery(props));
      expect(onOpen).not.toHaveBeenCalled();
      const front = nodes.find((n) => n.props.testID === 'fc-gallery-tile-a-front')!;
      const back = nodes.find((n) => n.props.testID === 'fc-gallery-tile-a-back')!;
      expect(front.props.pointerEvents).toBe('none');
      expect(back.props.pointerEvents).toBe('auto');
      expect(expand(front).filter((n) => n.type === 'Text').map((n) => n.props.children)).not.toContain('Выход');
      expect(expand(back).filter((n) => n.type === 'Text').map((n) => n.props.children)).not.toContain('Gate');
      (tile().props.onLongPress as () => void)();
      expect(onLongPress).toHaveBeenCalledWith('a');
      press(tile()); nodes = expand(CardsGallery(props));
      expect(tile().props.accessibilityLabel).toBe('Gate');
      const speak = nodes.find((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Speak')!;
      const stopPropagation = jest.fn(); press(speak, { stopPropagation });
      expect(stopPropagation).toHaveBeenCalled(); expect(onSpeak).toHaveBeenCalledWith('a');
      nodes = expand(CardsGallery({ ...props, selectedIds: new Set<string>() }));
      press(tile()); nodes = expand(CardsGallery({ ...props, selectedIds: new Set<string>() }));
      expect(onOpen).toHaveBeenCalledWith('a'); expect(tile().props.accessibilityLabel).toBe('Gate');
      nodes = expand(CardsGallery({ ...props, cards: [{ ...cards[0], back: '' }] }));
      press(tile());
      expect(flipped).toBe(false);
    });
  });
});

it('длинное широкое слово и поправка замера не обрезаются фиксированной плиткой', () => {
  const cards = [{ id: 'wide', front: 'W'.repeat(80), back: 'Ш'.repeat(80) }];
  for (const extra of [0, 12, 100]) {
    const fixes = new Map([0, 1, 2, 3].map((step) => [`wide|${step}`, extra]));
    for (const grid of buildGalleryGrids(cards, 280, 1.3, fixes).grids) {
      expect(grid.fit(0).h).toBeLessThanOrEqual(grid.geom(0).h);
    }
  }
});
