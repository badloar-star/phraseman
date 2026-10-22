// зачем (владелец 22.10, вопрос №17 «Да, затемнённое»): в светлых темах кольцо Plus темнее и набирает ≥ 3:1 (порог для графики) к фону экрана и к карточке
// во ВСЕХ светлых темах; тёмная палитра и порядок цветов не тронуты. Фоны — настоящие токены тем (liquidGlassTokens, светлое оформление).
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import {
  PLUS_FLAT_COLOR,
  PLUS_FLAT_COLOR_LIGHT,
  PLUS_RING_COLORS,
  PLUS_RING_COLORS_LIGHT,
  plusRingArcs,
  plusRingColors,
  plusRingSpec,
} from '../components/plus/plus_ring_spec';

const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const lum = (c: readonly number[]): number => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
const ratio = (a: string, b: string): number => { const x = lum(rgb(a)); const y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const LIGHT = { intensity: 0.5, appearance: 'light' } as never;
const lightThemes = LIQUID_GLASS_THEME_IDS.map((id) => ({ id, g: liquidGlassTokens(id, LIGHT) })).filter((t) => t.g.isLight);

describe('палитра кольца Plus для светлых тем', () => {
  it('значения утверждены владельцем', () => {
    expect([...PLUS_RING_COLORS_LIGHT]).toEqual(['#7A6BDB', '#527CBD', '#4B847F', '#8D6EB5', '#7A6BDB']);
    expect(PLUS_FLAT_COLOR_LIGHT).toBe('#7A6FC9');
  });

  it('тёмная палитра и плоский цвет тёмных тем не тронуты', () => {
    expect([...PLUS_RING_COLORS]).toEqual(['#8E7CFF', '#6FA8FF', '#7FE0D8', '#C69BFF', '#8E7CFF']);
    expect(PLUS_FLAT_COLOR).toBe('#9B8CFF');
    expect(plusRingColors(false)).toBe(PLUS_RING_COLORS);
    expect(plusRingColors(true)).toBe(PLUS_RING_COLORS_LIGHT);
  });

  it('есть что проверять: найдено светлых тем', () => {
    expect(lightThemes.length).toBeGreaterThanOrEqual(20);
  });

  it.each(lightThemes.map((t) => [t.id, t.g] as const))('%s: каждый цвет кольца ≥ 3:1 к фону экрана и к карточке', (_id, g) => {
    for (const color of [...PLUS_RING_COLORS_LIGHT, PLUS_FLAT_COLOR_LIGHT]) {
      expect(ratio(color, g.bg.slice(0, 7))).toBeGreaterThanOrEqual(3);
      expect(ratio(color, g.opaqueCard.slice(0, 7))).toBeGreaterThanOrEqual(3);
    }
  });

  it('спецификация: светлый вариант плоского кольца Пика и дуги на светлых цветах; тёмные по умолчанию', () => {
    expect(plusRingSpec(30, 'flat', true).flatColor).toBe(PLUS_FLAT_COLOR_LIGHT);
    expect(plusRingSpec(30, 'flat').flatColor).toBe(PLUS_FLAT_COLOR);
    expect(plusRingArcs(60, 2.5, 0.9, PLUS_RING_COLORS_LIGHT)[0]!.from).toBe('#7A6BDB');
    expect(plusRingArcs(60, 2.5)[0]!.from).toBe('#8E7CFF');
  });
});
