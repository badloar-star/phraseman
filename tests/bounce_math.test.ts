import { rubberBand, bounceOffset, APPLE_C } from '../components/bounceMath';

// Высота вьюпорта для тестов (типичный экран).
const DIM = 800;

describe('rubberBand (сопротивление Apple)', () => {
  it('f(0) = 0 и неположительный вход → 0', () => {
    expect(rubberBand(0, DIM)).toBe(0);
    expect(rubberBand(-50, DIM)).toBe(0);
  });

  it('dim<=0 → 0 (защита от деления на ноль)', () => {
    expect(rubberBand(100, 0)).toBe(0);
    expect(rubberBand(100, -10)).toBe(0);
  });

  it('монотонно растёт по x', () => {
    let prev = -1;
    for (let x = 0; x <= 2000; x += 50) {
      const v = rubberBand(x, DIM);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('при малых x ≈ линейно (наклон ≈ APPLE_C)', () => {
    // f(x) ≈ x·c когда x << dim
    expect(rubberBand(10, DIM)).toBeCloseTo(10 * APPLE_C, 0);
  });

  it('насыщается ниже dim (мягкий предел, нет жёсткой стенки)', () => {
    // f(x) → dim при x→∞, но всегда строго < dim
    const huge = rubberBand(1_000_000, DIM);
    expect(huge).toBeLessThan(DIM);
    expect(huge).toBeGreaterThan(DIM * 0.9);
  });

  it('сопротивление: оттянутое смещение всегда меньше входного пальца', () => {
    for (const x of [50, 200, 500, 1000]) {
      expect(rubberBand(x, DIM)).toBeLessThan(x);
    }
  });
});

describe('bounceOffset (двунаправленная резинка)', () => {
  const LAYOUT = 800;
  const CONTENT = 2000; // maxScroll = 1200

  it('в границах → null (резинки нет)', () => {
    expect(bounceOffset(0, LAYOUT, CONTENT, DIM)).toBeNull();
    expect(bounceOffset(600, LAYOUT, CONTENT, DIM)).toBeNull();
    expect(bounceOffset(1200, LAYOUT, CONTENT, DIM)).toBeNull(); // ровно у нижнего края
  });

  it('оверскролл СВЕРХУ (y<0) → смещение ВНИЗ (>0)', () => {
    const off = bounceOffset(-100, LAYOUT, CONTENT, DIM);
    expect(off).not.toBeNull();
    expect(off!).toBeGreaterThan(0);
    // равно сопротивлению от модуля оверскролла
    expect(off!).toBeCloseTo(rubberBand(100, DIM), 5);
  });

  it('оверскролл СНИЗУ (y>maxScroll) → смещение ВВЕРХ (<0)', () => {
    const off = bounceOffset(1200 + 100, LAYOUT, CONTENT, DIM);
    expect(off).not.toBeNull();
    expect(off!).toBeLessThan(0);
    expect(off!).toBeCloseTo(-rubberBand(100, DIM), 5);
  });

  it('симметрия: верх +x и низ +x дают противоположные по знаку, равные по модулю', () => {
    const top = bounceOffset(-150, LAYOUT, CONTENT, DIM)!;
    const bottom = bounceOffset(1200 + 150, LAYOUT, CONTENT, DIM)!;
    expect(top).toBeCloseTo(-bottom, 5);
  });

  it('контент короче вьюпорта (maxScroll<=0): низа нет, только верхняя резинка', () => {
    // CONTENT < LAYOUT → maxScroll отрицательный → тянуть вниз нельзя
    expect(bounceOffset(50, LAYOUT, 400, DIM)).toBeNull();
    // но оверскролл сверху всё ещё работает
    expect(bounceOffset(-50, LAYOUT, 400, DIM)!).toBeGreaterThan(0);
  });
});
