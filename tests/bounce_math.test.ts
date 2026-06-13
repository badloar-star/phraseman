import { rubberBand, bounceOffset, edgePull, APPLE_C } from '../components/bounceMath';

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

describe('edgePull (анти-скачок Android edge-pull)', () => {
  const NA = NaN;

  it('первое касание края НЕ прыгает: stretch=0, якорь = текущий палец', () => {
    // Палец уже прошёл 300px (накоплено нативным скроллом), но мы только что
    // упёрлись в верх. Резинка обязана стартовать с НУЛЯ, а не прыгнуть.
    const r = edgePull(300, NA, /*atTop*/ true, /*atBottom*/ false, DIM);
    expect(r.stretch).toBe(0);
    expect(r.anchor).toBe(300);
  });

  it('после касания тянем дальше → плавный рост ОТ якоря, не от начала жеста', () => {
    // Якорь зафиксирован на 300, палец ушёл до 380 → реальная оттяжка = 80.
    const r = edgePull(380, 300, true, false, DIM);
    expect(r.anchor).toBe(300);
    expect(r.stretch).toBeCloseTo(rubberBand(80, DIM), 5);
  });

  it('АНТИ-СКАЧОК: оттяжка от якоря намного меньше наивной от начала жеста', () => {
    // Наивная (баг v9): rubberBand(380). Наша: rubberBand(380-300)=rubberBand(80).
    const fixed = edgePull(380, 300, true, false, DIM).stretch;
    const naive = rubberBand(380, DIM);
    expect(fixed).toBeLessThan(naive);
    expect(fixed).toBeCloseTo(rubberBand(80, DIM), 5);
  });

  it('нижний край: тянем вверх → отрицательный stretch, симметрично', () => {
    const first = edgePull(-300, NA, false, true, DIM);
    expect(first.stretch).toBe(0);
    expect(first.anchor).toBe(-300);
    const pulled = edgePull(-380, -300, false, true, DIM);
    expect(pulled.stretch).toBeCloseTo(-rubberBand(80, DIM), 5);
  });

  it('не у края → резинки нет и якорь сброшен в NaN', () => {
    const r = edgePull(120, 50, /*atTop*/ false, /*atBottom*/ false, DIM);
    expect(r.stretch).toBe(0);
    expect(Number.isNaN(r.anchor)).toBe(true);
  });

  it('палец откатился НИЖЕ якоря у верха → оттяжка не уходит в минус, якорь сброшен', () => {
    // У верхнего края тянем вниз, но палец откатился назад (280 < якоря 300):
    // считаем это «отпустил край» → stretch 0, якорь NaN (следующий тяг с нуля).
    const r = edgePull(280, 300, true, false, DIM);
    expect(r.stretch).toBe(0);
    expect(Number.isNaN(r.anchor)).toBe(true);
  });

  it('переход верх→низ проходит через тело: middle-кадр обнуляет якорь до нижнего края', () => {
    // Реальная траектория пальца top→bottom ВСЕГДА пересекает прокручиваемое тело
    // (atTop=atBottom=false), и этот кадр сбрасывает якорь в NaN…
    const middle = edgePull(120, 300, /*atTop*/ false, /*atBottom*/ false, DIM);
    expect(Number.isNaN(middle.anchor)).toBe(true);
    // …поэтому у нижнего края якорь уже чистый и резинка стартует с нуля.
    const bottom = edgePull(-10, middle.anchor, false, true, DIM);
    expect(bottom.anchor).toBe(-10);
    expect(bottom.stretch).toBe(0);
  });
});
