// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): числа кольца Plus живут в одном модуле components/plus/plus_ring_spec.ts.
// Тест фиксирует таблицу эталона: кольцо 2,5 + зазор 2, значок ◆ max(14; 0,4 × аватар) от аватара 26, визитка 6 + 5 со значком 46, Пик — плоское 3 + 2 без значка.
import {
  PLUS_FLAT_COLOR,
  PLUS_PIN_COLORS,
  PLUS_PIN_MIN_AVATAR,
  PLUS_RING_COLORS,
  PLUS_RING_START_DEG,
  plusRingArcs,
  plusRingSpec,
  plusTagColors,
} from '../components/plus/plus_ring_spec';

describe('plusRingSpec · таблица эталона', () => {
  it('список: аватар 44 — кольцо 2,5, зазор 2, внешний 53, значок 18 (ромб 10) со сдвигом от кольца', () => {
    const spec = plusRingSpec(44, 'list');
    expect(spec.ring).toBe(2.5);
    expect(spec.gap).toBe(2);
    expect(spec.inset).toBe(4.5);
    expect(spec.outer).toBe(53);
    expect(spec.flatColor).toBeNull();
    expect(spec.pin).toEqual({ size: 18, glyph: 10, outline: 2, overhang: 5.5 });
  });

  it('значок = max(14; 0,4 × аватар), ромб 58 %: «Настройки» 48 → 19/11, «Аккаунт» 102 → 41/24 (как в эталоне), 26 → минимум 14', () => {
    expect(plusRingSpec(48).pin).toMatchObject({ size: 19, glyph: 11 });
    expect(plusRingSpec(102).pin).toMatchObject({ size: 41, glyph: 24 });
    expect(plusRingSpec(26).pin).toMatchObject({ size: 14, glyph: 8 });
  });

  it('аватары меньше 26 — только кольцо, без значка (автор набора 18)', () => {
    expect(PLUS_PIN_MIN_AVATAR).toBe(26);
    expect(plusRingSpec(18).pin).toBeNull();
    expect(plusRingSpec(25).pin).toBeNull();
    expect(plusRingSpec(18).outer).toBe(27);
  });

  it('визитка: монета 165 — кольцо 6, зазор 5, внешний 187, значок 46 (ромб 24, обводка 4) внутри угла на 4', () => {
    const spec = plusRingSpec(165, 'card');
    expect(spec.ring).toBe(6);
    expect(spec.gap).toBe(5);
    expect(spec.outer).toBe(187);
    expect(spec.pin).toEqual({ size: 46, glyph: 24, outline: 4, overhang: 2 });
  });

  it('башня Пика: плоское кольцо 3 цвета #9B8CFF с зазором 2, без значка и без градиента', () => {
    const spec = plusRingSpec(30, 'flat');
    expect(spec.ring).toBe(3);
    expect(spec.gap).toBe(2);
    expect(spec.outer).toBe(40);
    expect(spec.flatColor).toBe(PLUS_FLAT_COLOR);
    expect(PLUS_FLAT_COLOR).toBe('#9B8CFF');
    expect(spec.pin).toBeNull();
  });

  it('мусорный размер не ломает геометрию (NaN, отрицательный): конечные числа', () => {
    for (const bad of [Number.NaN, -10, Number.POSITIVE_INFINITY]) {
      const spec = plusRingSpec(bad);
      expect(Number.isFinite(spec.outer)).toBe(true);
      expect(spec.pin).toBeNull();
    }
  });
});

describe('plusRingArcs · угловой градиент дугами', () => {
  it('цвета замкнуты и взяты из эталона: #8E7CFF → #6FA8FF → #7FE0D8 → #C69BFF → #8E7CFF от 200°', () => {
    expect([...PLUS_RING_COLORS]).toEqual(['#8E7CFF', '#6FA8FF', '#7FE0D8', '#C69BFF', '#8E7CFF']);
    expect(PLUS_RING_START_DEG).toBe(200);
    expect([...PLUS_PIN_COLORS]).toEqual(['#8E7CFF', '#6FA8FF']);
  });

  it('4 дуги по 90°, каждая переходит в цвет следующей, последняя замыкается на первый цвет', () => {
    const arcs = plusRingArcs(53, 2.5);
    expect(arcs).toHaveLength(4);
    arcs.forEach((arc, i) => {
      expect(arc.from).toBe(PLUS_RING_COLORS[i]);
      expect(arc.to).toBe(PLUS_RING_COLORS[i + 1]);
      expect(arc.d.startsWith('M ')).toBe(true);
      expect(arc.d).toContain(' A ');
    });
    expect(arcs[3]!.to).toBe(arcs[0]!.from);
  });

  it('первая дуга начинается под углом 200° от 12 часов по часовой, концы хорд лежат на окружности линии кольца внутри холста', () => {
    const outer = 53;
    const ring = 2.5;
    const arcs = plusRingArcs(outer, ring);
    const c = outer / 2;
    const r = outer / 2 - ring / 2;
    const rad = (PLUS_RING_START_DEG * Math.PI) / 180;
    expect(arcs[0]!.x1).toBeCloseTo(c + r * Math.sin(rad), 1);
    expect(arcs[0]!.y1).toBeCloseTo(c - r * Math.cos(rad), 1);
    for (const arc of arcs) {
      for (const [x, y] of [[arc.x1, arc.y1], [arc.x2, arc.y2]] as const) {
        expect(Math.hypot(x - c, y - c)).toBeCloseTo(r, 1);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(outer);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(outer);
      }
    }
  });

  it('конец одной дуги совпадает с началом следующей (нет щелей на стыках)', () => {
    const arcs = plusRingArcs(111, 2.5);
    for (let i = 0; i < arcs.length; i += 1) {
      const next = arcs[(i + 1) % arcs.length]!;
      expect(arcs[i]!.x2).toBeCloseTo(next.x1, 1);
      expect(arcs[i]!.y2).toBeCloseTo(next.y1, 1);
    }
  });
});

describe('plusTagColors · метка «◆ Plus»', () => {
  it('тёмная: фон rgba(142,124,255,.20), текст #C9C0FF; светлая: rgba(110,92,240,.12), #5442D8', () => {
    expect(plusTagColors(false)).toEqual({ bg: 'rgba(142,124,255,0.20)', ink: '#C9C0FF' });
    expect(plusTagColors(true)).toEqual({ bg: 'rgba(110,92,240,0.12)', ink: '#5442D8' });
  });
});
