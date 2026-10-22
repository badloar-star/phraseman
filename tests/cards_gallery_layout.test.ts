// зачем (Карточки 2.0, макет docs/design/v2-app/cards-v2.html, `.zg.s0`; владелец 22.10: «ползунок и щипок убираем, оставляем только нормальный вид»): раскладка галереи — единственный шаг 0, одна колонка,
// высота плитки 118, зазор 10, радиус 16; четыре остановки, перетекание, опора щипка и докрутка удалены вместе с ползунком. Остаётся и проверяется градиент по пропорциям плитки (cssGradientPoints).
import {
  GALLERY_LAST_STEP,
  GALLERY_OPEN_STEP,
  GALLERY_STEPS,
  clampStep,
  cssGradientPoints,
} from '../components/cards-grid/cardsGalleryLayout';

describe('cards gallery layout (single normal view)', () => {
  test('the only step matches the mockup CSS: one column, row height 118, gap 10, radius 16', () => {
    expect(GALLERY_STEPS).toEqual([{ cols: 1, h: 118, gap: 10, radius: 16 }]);
    expect(GALLERY_LAST_STEP).toBe(0);
    expect(GALLERY_OPEN_STEP).toBe(0);
  });

  test('every step value is clamped to the only step', () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(9)).toBe(0);
    expect(clampStep(2)).toBe(0);
    expect(clampStep(Number.NaN)).toBe(GALLERY_OPEN_STEP);
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
