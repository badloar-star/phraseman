// зачем (владелец: «Карточки меняют размер и форму», движок cards-gallery «LOCKED:cards-engine»): раскладка в приложении совпадает с формулами макета.
import {
  GALLERY_GAP,
  cssGradientPoints,
  galleryHeight,
  galleryLayoutFor,
  galleryPosition,
  galleryVisibleRange,
} from '../components/cards-grid/cardsGalleryLayout';

describe('cards gallery layout (mockup engine)', () => {
  test('columns, width and height follow the slider like the mockup', () => {
    const one = galleryLayoutFor(0, 390);
    expect(one).toMatchObject({ cols: 1, idx: 0, w: 390, h: 111 });
    const two = galleryLayoutFor(0.5, 390);
    expect(two).toMatchObject({ cols: 2, idx: 1, w: 189 });
    expect(two.h).toBe(144);
    const four = galleryLayoutFor(1, 390);
    expect(four).toMatchObject({ cols: 4, idx: 3, w: 88.5 });
    expect(four.h).toBe(97);
  });

  test('out-of-range values are clamped', () => {
    expect(galleryLayoutFor(-3, 390).cols).toBe(1);
    expect(galleryLayoutFor(7, 390).cols).toBe(4);
  });

  test('positions fill rows left to right and the height counts whole rows', () => {
    const layout = galleryLayoutFor(0.5, 390);
    expect(galleryPosition(0, layout)).toEqual({ x: 0, y: 0 });
    expect(galleryPosition(1, layout)).toEqual({ x: 189 + GALLERY_GAP, y: 0 });
    expect(galleryPosition(2, layout)).toEqual({ x: 0, y: layout.h + GALLERY_GAP });
    expect(galleryHeight(5, layout)).toBe(3 * (layout.h + GALLERY_GAP));
    expect(galleryHeight(0, layout)).toBe(0);
  });

  test('the render window covers the viewport with a margin and never exceeds the list', () => {
    const layout = galleryLayoutFor(0.5, 390);
    const range = galleryVisibleRange(200, layout, 2000, 800);
    expect(range.from).toBeLessThan(range.to);
    expect(range.from % layout.cols).toBe(0);
    expect(range.to).toBeLessThanOrEqual(200);
    expect(galleryVisibleRange(3, layout, 0, 800)).toEqual({ from: 0, to: 3 });
  });

  test('css gradient angle uses the box proportions like a browser', () => {
    const square = cssGradientPoints(145, 100, 100);
    expect(square.start.x + square.end.x).toBeCloseTo(1);
    expect(square.start.y + square.end.y).toBeCloseTo(1);
    const wide = cssGradientPoints(145, 390, 105);
    // у вытянутой карточки линия градиента выходит за верх и низ бокса
    expect(wide.start.y).toBeLessThan(0);
    expect(wide.end.y).toBeGreaterThan(1);
  });
});
