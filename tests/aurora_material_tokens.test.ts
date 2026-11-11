// Материал «Аврора» ВКЛЮЧЁН: что получают экраны через общие токены темы и общий расчёт сцены (слово владельца 11.11: «точно как на макетах, 1 в 1»).
// Сторож читаемости: на посветлевших плашках текст, «верно/неверно» и цвет темы обязаны читаться при ЛЮБЫХ оттенке и насыщенности.
import { auroraMaterial } from '../constants/aurora_material';
import { plateGradient, plateShadowStyle } from '../constants/liquidGlassShadowStyle';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { isRassvetPalette, sceneBottomHex, sceneFrameToneHex, scenePalette, sceneTextZoneWhiteContrast, sceneTopHex } from '../components/scene/scene_palette';

jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));
jest.mock('../constants/aurora_material_flag', () => ({ AURORA_MATERIAL_ENABLED: true }));

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string): number => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const SATS = [0, 35, 100];
const APPEARANCES = ['dark', 'light'] as const;

describe('«Аврора» в токенах темы', () => {
  it('поверхности темы-ползунка = поверхности материала (фон, плашка, вложенная плашка, градиент и тень плашки)', () => {
    for (const ap of APPEARANCES) {
      const m = auroraMaterial(250, 35, ap);
      const t = liquidGlassTokens('tune:250:35', { appearance: ap, intensity: 1 });
      expect(t.aurora).toBeTruthy();
      expect([t.bg, t.bgTop, t.bgBottom]).toEqual([m.bg, m.bgTop, m.bgBottom]);
      expect([t.opaqueCard, t.opaqueControl, t.plateFillFrom, t.plateFillTo]).toEqual([m.cardTo, m.control, m.cardFrom, m.cardTo]);
      expect(t.plateShadow).toBe(m.shadow);
      expect(plateGradient(t)).toEqual({ colors: [m.cardFrom, m.cardTo], start: { x: 0, y: 0 }, end: { x: 0.4, y: 0.62 } });
      expect(plateShadowStyle(t).length).toBe(ap === 'dark' ? 1 : 2);
    }
  });
  it('ползунок яркости темы поверхности «Авроры» не меняет', () => {
    const a = liquidGlassTokens('tune:120:60', { appearance: 'dark', intensity: 0 });
    const b = liquidGlassTokens('tune:120:60', { appearance: 'dark', intensity: 1 });
    expect([a.bg, a.opaqueCard, a.opaqueControl]).toEqual([b.bg, b.opaqueCard, b.opaqueControl]);
  });
  it('именные темы материал не получают — их токены прежние', () => {
    const t = liquidGlassTokens('graphite', { appearance: 'dark', intensity: 1 });
    expect(t.aurora ?? null).toBeNull();
    expect(plateGradient(t).start).toEqual({ x: 0.5, y: 0 });
  });
  it('читаемость на плашке при любых оттенке и насыщенности: текст, вторичный текст, цвет темы, «верно», «неверно» ≥ 4,5', () => {
    for (const H of HUES) for (const S of SATS) for (const ap of APPEARANCES) for (const intensity of [0, 0.5, 1]) {
      const t = liquidGlassTokens(`tune:${H}:${S}`, { appearance: ap, intensity });
      const where = `${ap} tune:${H}:${S} @${intensity}`;
      for (const [name, color] of [['text', t.text], ['secondary', t.secondary], ['mutedText', t.mutedText], ['accentText', t.accentText], ['good', t.good], ['bad', t.bad]] as const) {
        const v = contrast(color, t.opaqueCard);
        if (v < 4.5) throw new Error(`${where}: ${name} ${color} на плашке ${t.opaqueCard} = ${v.toFixed(2)}`);
      }
      if (contrast(t.accentGraphic, t.opaqueCard) < 3) throw new Error(`${where}: графика цвета темы на плашке ниже 3`);
      if (contrast(t.ctaFillInk, t.ctaFill) < 4.5) throw new Error(`${where}: чернила главной кнопки ниже 4,5`);
    }
  });
  it('известное отступление (утверждённые тона макета, контраст плашек 100 %): крупный текст на вложенной плашке в тёмном ≥ 4,2 — не падает ниже', () => {
    for (const H of HUES) for (const S of SATS) expect(contrast(liquidGlassTokens(`tune:${H}:${S}`, { appearance: 'dark', intensity: 1 }).text, liquidGlassTokens(`tune:${H}:${S}`, { appearance: 'dark', intensity: 1 }).opaqueControl)).toBeGreaterThanOrEqual(4.2);
  });
});

describe('сцена «Рассвет» в общем расчёте сцены', () => {
  it('у темы-ползунка сцена — «Рассвет» на всех экранах и в обоих оформлениях; верх, середина и низ — из материала', () => {
    for (const screen of ['home', 'dialogs', 'peak', 'season'] as const) for (const ap of APPEARANCES) {
      const m = auroraMaterial(300, 70, ap);
      const p = scenePalette('tune:300:70', ap, screen, 1080, 1082, { dp: 2.625 });
      expect(isRassvetPalette(p)).toBe(true);
      if (!isRassvetPalette(p)) continue;
      expect([sceneTopHex(p), p.gradient.mid.hex, sceneBottomHex(p)]).toEqual([m.scene.top.toUpperCase(), m.scene.mid.toUpperCase(), m.scene.bottom.toUpperCase()]);
      expect(sceneFrameToneHex(p)).toBe(m.scene.bottom.toUpperCase());
      expect(p.scrim).toBeNull();
    }
  });
  it('белый текст в зоне подписей ≥ 4,6 при любых оттенке и насыщенности', () => {
    for (const H of HUES) for (const S of SATS) for (const ap of APPEARANCES) expect(sceneTextZoneWhiteContrast(scenePalette(`tune:${H}:${S}`, ap, 'home', 1080, 1082, { dp: 2.625 }))).toBeGreaterThanOrEqual(4.6);
  });
  it('именная тема — прежняя сцена, не «Рассвет»', () => {
    expect(scenePalette('graphite', 'dark', 'home', 1080, 1082, { dp: 2.625 }).mode).toBe('dark-sky');
    expect(scenePalette('ink', 'light', 'home', 1080, 1082, { dp: 2.625 }).mode).toBe('light-A');
  });
});
