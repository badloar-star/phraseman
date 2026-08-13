/**
 * cards-2.1 (§7.1 SPEC_2_1): чистая модель эквалайзера плеера «Слушание».
 * Проверяем то, от чего зависит вид анимации: детерминизм, диапазоны, форма
 * «арки», РАЗНЫЕ периоды/фазы у соседних полос (иначе «шагающий строй»),
 * и корректную деградацию (reduce motion / слабое устройство).
 */
import {
  EQ_DEFAULT_BARS,
  EQ_MAX_BARS,
  EQ_MAX_DURATION_MS,
  EQ_MIN_BARS,
  EQ_MIN_DURATION_MS,
  EQ_REST_SCALE_MAX,
  EQ_REST_SCALE_MIN,
  eqArch,
  eqNoise,
  equalizerBarParams,
  equalizerBars,
  equalizerMotionMode,
  equalizerSimpleScale,
  equalizerStaticScale,
  resolveBarCount,
} from '../app/flashcards/listening_equalizer_model';

describe('resolveBarCount — зажим количества полос', () => {
  it('мусор → дефолт', () => {
    expect(resolveBarCount(undefined)).toBe(EQ_DEFAULT_BARS);
    expect(resolveBarCount(null)).toBe(EQ_DEFAULT_BARS);
    expect(resolveBarCount(NaN)).toBe(EQ_DEFAULT_BARS);
    expect(resolveBarCount(Infinity)).toBe(EQ_DEFAULT_BARS);
  });

  it('выход за границы зажимается', () => {
    expect(resolveBarCount(1)).toBe(EQ_MIN_BARS);
    expect(resolveBarCount(0)).toBe(EQ_MIN_BARS);
    expect(resolveBarCount(-5)).toBe(EQ_MIN_BARS);
    expect(resolveBarCount(99)).toBe(EQ_MAX_BARS);
  });

  it('валидное значение проходит как есть (дробное округляется)', () => {
    expect(resolveBarCount(7)).toBe(7);
    expect(resolveBarCount(6.4)).toBe(6);
  });
});

describe('eqNoise — детерминированный псевдошум', () => {
  it('всегда в [0,1)', () => {
    for (let i = -20; i < 60; i++) {
      for (let s = 0; s < 4; s++) {
        const v = eqNoise(i, s);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('детерминирован и различается по seed/salt', () => {
    expect(eqNoise(3, 1)).toBe(eqNoise(3, 1));
    expect(eqNoise(3, 1)).not.toBe(eqNoise(4, 1));
    expect(eqNoise(3, 1)).not.toBe(eqNoise(3, 2));
  });
});

describe('eqArch — форма «арки»', () => {
  it('центр = 1, края = 0', () => {
    expect(eqArch(2, 5)).toBeCloseTo(1, 6);
    expect(eqArch(0, 5)).toBeCloseTo(0, 6);
    expect(eqArch(4, 5)).toBeCloseTo(0, 6);
  });

  it('симметрична и монотонна к центру', () => {
    expect(eqArch(1, 7)).toBeCloseTo(eqArch(5, 7), 6);
    expect(eqArch(2, 7)).toBeGreaterThan(eqArch(1, 7));
    expect(eqArch(3, 7)).toBeGreaterThan(eqArch(2, 7));
  });

  it('одна полоса → 1 (без деления на ноль)', () => {
    expect(eqArch(0, 1)).toBe(1);
  });
});

describe('equalizerBarParams — параметры полосы по индексу', () => {
  it('детерминированы: два вызова дают одно и то же', () => {
    expect(equalizerBarParams(2, 7)).toEqual(equalizerBarParams(2, 7));
  });

  it('все значения в допустимых диапазонах', () => {
    for (let count = EQ_MIN_BARS; count <= EQ_MAX_BARS; count++) {
      for (let i = 0; i < count; i++) {
        const p = equalizerBarParams(i, count);
        expect(p.maxScale).toBeGreaterThan(p.minScale);
        expect(p.maxScale).toBeLessThanOrEqual(1);
        expect(p.minScale).toBeGreaterThan(0);
        expect(p.restScale).toBeGreaterThanOrEqual(EQ_REST_SCALE_MIN);
        expect(p.restScale).toBeLessThanOrEqual(EQ_REST_SCALE_MAX);
        expect(p.durationMs).toBeGreaterThanOrEqual(EQ_MIN_DURATION_MS);
        expect(p.durationMs).toBeLessThanOrEqual(EQ_MAX_DURATION_MS);
        // Затухание длиннее атаки — движение живое, а не «маятник»
        expect(p.downDurationMs).toBeGreaterThan(p.durationMs);
        expect(p.delayMs).toBeGreaterThanOrEqual(0);
        expect(p.delayMs).toBeLessThanOrEqual(p.durationMs);
        expect(p.phase01).toBeGreaterThanOrEqual(0);
        expect(p.phase01).toBeLessThan(1);
        // Статичное «играет» выше статичного «пауза» — озвучка видна
        expect(p.activeStaticScale).toBeGreaterThan(p.restScale);
        expect(Number.isFinite(p.activeStaticScale)).toBe(true);
      }
    }
  });

  it('индекс за границами зажимается (никаких NaN-таймингов)', () => {
    expect(equalizerBarParams(-3, 5)).toEqual(equalizerBarParams(0, 5));
    expect(equalizerBarParams(99, 5)).toEqual(equalizerBarParams(4, 5));
  });

  it('центральная полоса выше крайней (арка читается)', () => {
    const edge = equalizerBarParams(0, 7);
    const center = equalizerBarParams(3, 7);
    expect(center.maxScale).toBeGreaterThan(edge.maxScale);
  });

  it('соседние полосы НЕ синхронны: разные период и фаза', () => {
    const bars = equalizerBars(7);
    for (let i = 1; i < bars.length; i++) {
      expect(bars[i]!.durationMs).not.toBe(bars[i - 1]!.durationMs);
      expect(bars[i]!.phase01).not.toBeCloseTo(bars[i - 1]!.phase01, 3);
    }
    // И глобально: периодов много разных, а не два-три
    const uniqueDurations = new Set(bars.map((b) => b.durationMs));
    expect(uniqueDurations.size).toBe(bars.length);
  });
});

describe('equalizerBars — набор полос', () => {
  it('длина = зажатому barCount', () => {
    expect(equalizerBars(7)).toHaveLength(7);
    expect(equalizerBars(1)).toHaveLength(EQ_MIN_BARS);
    expect(equalizerBars(50)).toHaveLength(EQ_MAX_BARS);
  });

  it('i-я полоса совпадает с equalizerBarParams(i, count)', () => {
    const bars = equalizerBars(5);
    bars.forEach((b, i) => expect(b).toEqual(equalizerBarParams(i, 5)));
  });
});

describe('equalizerMotionMode — деградация', () => {
  it('пауза → всегда static', () => {
    expect(equalizerMotionMode({ playing: false })).toBe('static');
    expect(equalizerMotionMode({ playing: false, lowPower: true })).toBe('static');
    expect(equalizerMotionMode({ playing: false, reduceMotion: true })).toBe('static');
  });

  it('«уменьшить движение» перекрывает всё остальное', () => {
    expect(equalizerMotionMode({ playing: true, reduceMotion: true })).toBe('static');
    expect(equalizerMotionMode({ playing: true, reduceMotion: true, lowPower: true })).toBe('static');
  });

  it('слабое устройство → упрощённый режим (один общий драйвер)', () => {
    expect(equalizerMotionMode({ playing: true, lowPower: true })).toBe('simple');
  });

  it('обычный случай → полная анимация', () => {
    expect(equalizerMotionMode({ playing: true })).toBe('full');
    expect(equalizerMotionMode({ playing: true, reduceMotion: false, lowPower: false })).toBe('full');
  });
});

describe('equalizerStaticScale — статичный вид', () => {
  const p = equalizerBarParams(2, 7);

  it('пауза → низкое положение', () => {
    expect(equalizerStaticScale(p, false)).toBe(p.restScale);
  });

  it('идёт озвучка (reduce motion) → выше паузы: видно, что звук есть', () => {
    expect(equalizerStaticScale(p, true)).toBe(p.activeStaticScale);
    expect(equalizerStaticScale(p, true)).toBeGreaterThan(equalizerStaticScale(p, false));
  });
});

describe('equalizerSimpleScale — общий драйвер упрощённого режима', () => {
  const p = equalizerBarParams(1, 7);

  it('масштаб всегда внутри [minScale, maxScale]', () => {
    for (let t = 0; t < 1; t += 0.05) {
      const s = equalizerSimpleScale(p, t);
      expect(s).toBeGreaterThanOrEqual(p.minScale - 1e-9);
      expect(s).toBeLessThanOrEqual(p.maxScale + 1e-9);
    }
  });

  it('период замкнут: t и t+1 дают одно значение', () => {
    expect(equalizerSimpleScale(p, 0.3)).toBeCloseTo(equalizerSimpleScale(p, 1.3), 6);
  });

  it('полосы расходятся по фазе при одном и том же t', () => {
    const bars = equalizerBars(7);
    const at = bars.map((b) => equalizerSimpleScale(b, 0.25));
    expect(new Set(at.map((v) => v.toFixed(4))).size).toBe(bars.length);
  });

  it('мусорный t не даёт NaN', () => {
    expect(Number.isFinite(equalizerSimpleScale(p, NaN))).toBe(true);
    expect(Number.isFinite(equalizerSimpleScale(p, -0.7))).toBe(true);
  });
});
