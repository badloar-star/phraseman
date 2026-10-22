// зачем (Карточки 2.0, макет docs/design/v2-app/cards-v2.html, `.zg.s0…s3`): раскладка галереи — четыре остановки 1 / 2 / 3 / 5 колонок
// с высотами плиток 118 / 96 / 62 / 37 и зазорами 10 / 10 / 8 / 5; ползунок с четырьмя остановками; опора «карточка под пальцами» при смене шага.
import {
  GALLERY_OPEN_STEP,
  GALLERY_MORPH_MS,
  GALLERY_STEPS,
  clampStep,
  cssGradientPoints,
  galleryAnchorIndex,
  galleryHeight,
  galleryLayoutFor,
  galleryPosition,
  galleryScrollFor,
  galleryVisibleRange,
  unionRange,
} from '../components/cards-grid/cardsGalleryLayout';

describe('cards gallery layout (cards-v2 steps)', () => {
  test('four steps match the mockup CSS: columns, row heights, gaps, radii', () => {
    expect(GALLERY_STEPS.map((s) => s.cols)).toEqual([1, 2, 3, 5]);
    expect(GALLERY_STEPS.map((s) => s.h)).toEqual([118, 96, 62, 37]);
    expect(GALLERY_STEPS.map((s) => s.gap)).toEqual([10, 10, 8, 5]);
    expect(GALLERY_STEPS.map((s) => s.radius)).toEqual([16, 14, 12, 8]);
    expect(GALLERY_MORPH_MS).toBe(380);
    expect(GALLERY_OPEN_STEP).toBe(0);
  });

  test('tile width is the grid width minus gaps divided by columns', () => {
    expect(galleryLayoutFor(0, 390)).toMatchObject({ cols: 1, w: 390, h: 118, gap: 10 });
    expect(galleryLayoutFor(1, 390)).toMatchObject({ cols: 2, w: 190, h: 96 });
    expect(galleryLayoutFor(2, 390)).toMatchObject({ cols: 3, w: (390 - 16) / 3, h: 62, gap: 8 });
    expect(galleryLayoutFor(3, 390)).toMatchObject({ cols: 5, w: (390 - 20) / 5, h: 37, gap: 5 });
  });

  test('out-of-range and non-finite steps are clamped', () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(9)).toBe(3);
    expect(clampStep(Number.NaN)).toBe(GALLERY_OPEN_STEP);
    expect(galleryLayoutFor(7, 390).cols).toBe(5);
  });

  test('positions fill rows left to right and the height counts rows without the trailing gap', () => {
    const layout = galleryLayoutFor(1, 390);
    expect(galleryPosition(0, layout)).toEqual({ x: 0, y: 0 });
    expect(galleryPosition(1, layout)).toEqual({ x: 190 + 10, y: 0 });
    expect(galleryPosition(2, layout)).toEqual({ x: 0, y: 96 + 10 });
    expect(galleryHeight(5, layout)).toBe(3 * 96 + 2 * 10);
    expect(galleryHeight(0, layout)).toBe(0);
  });

  test('the render window covers the viewport with a margin and never exceeds the list', () => {
    const layout = galleryLayoutFor(1, 390);
    const range = galleryVisibleRange(200, layout, 2000, 800);
    expect(range.from).toBeLessThan(range.to);
    expect(range.from % layout.cols).toBe(0);
    expect(range.to).toBeLessThanOrEqual(200);
    expect(galleryVisibleRange(3, layout, 0, 800)).toEqual({ from: 0, to: 3 });
    expect(unionRange({ from: 10, to: 40 }, { from: 0, to: 20 })).toEqual({ from: 0, to: 40 });
  });

  test('anchor card stays under the finger after a step change', () => {
    const prev = galleryLayoutFor(1, 390);
    const next = galleryLayoutFor(0, 390);
    // палец на второй колонке третьей строки: x=250, высота окна 300, прокрутка 400, верх сетки 200
    const fx = 250;
    const fvY = 300;
    const scrollY = 400;
    const gridTop = 200;
    const focalGridY = fvY + scrollY - gridTop;
    const anchor = galleryAnchorIndex(100, prev, fx, focalGridY);
    expect(anchor).toBe(Math.floor(focalGridY / (96 + 10)) * 2 + 1);
    const newScroll = galleryScrollFor({ n: 100, prev, next, fx, fvY, scrollY, gridTop });
    // после смены опорная карточка снова под пальцем: её верх + доля высоты = точка пальца в содержимом
    const oldTop = galleryPosition(anchor, prev).y;
    const fy = (focalGridY - oldTop) / prev.h;
    const newTop = galleryPosition(anchor, next).y;
    expect(gridTop + newTop + fy * next.h - newScroll).toBeCloseTo(fvY);
    expect(galleryScrollFor({ n: 0, prev, next, fx, fvY, scrollY, gridTop })).toBe(scrollY);
  });

  test('css gradient angle uses the box proportions like a browser', () => {
    const square = cssGradientPoints(158, 100, 100);
    expect(square.start.x + square.end.x).toBeCloseTo(1);
    expect(square.start.y + square.end.y).toBeCloseTo(1);
    const wide = cssGradientPoints(158, 390, 118);
    expect(wide.start.y).toBeLessThan(0);
    expect(wide.end.y).toBeGreaterThan(1);
  });
});
