import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import {
  RAISED_LIFT,
  actionShadowStyle,
  nestedShadowStyle,
  plateGradient,
  plateShadowStyle,
  raisedGradient,
  raisedShadowStyle,
} from '../constants/liquidGlassShadowStyle';

// зачем (владелец 12.10, вариант 2 «Тень»; docs/design/v2-app/SHADOW_STYLE_SPEC.md): контейнеры без обводок — границу заменяют тон
// плашки и тень. Тест держит числа спеки в обоих оформлениях и то, что плашка ОТЛИЧАЕТСЯ ТОНОМ от фона без всякой кромки на всех
// 23 темах × calm/accent/max × 21 шаг ползунка, а текст на плашке читается. Пороги тонового отличия — по замеру с запасом:
// у светлых тем низ плашки (`#F3F3F8` по спеке) почти совпадает с фоном — там разделяет тень (проверяется по числам слоя).
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const LEVELS = ['calm', 'accent', 'max'] as const;
const solid = (hex: string) => hex.slice(0, 7);
const HEX_OR_RGBA = /^(#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?|rgba\([^)]+\))$/;

describe('стиль «Тень»: токены без обводок', () => {
  it.each(['dark', 'light'] as const)('%s: плашка отличается тоном от фона, текст читается, токены валидны на всех шагах', (appearance) => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level, appearance, intensity });
          const where = `${id}|${level}|${intensity}`;
          for (const key of ['plateFillFrom', 'plateFillTo', 'raisedFillFrom', 'raisedFillTo', 'plateShadow', 'plateShadowSoft', 'nestedShadow', 'raisedShadow', 'raisedShadowSoft', 'dividerTone'] as const) {
            if (!HEX_OR_RGBA.test(g[key])) bad.push(`токен ${key} невалиден ${where}: ${g[key]}`);
          }
          const top = paletteContrast(g.plateFillFrom, solid(g.bg));
          const bottom = paletteContrast(g.plateFillTo, solid(g.bg));
          if (appearance === 'dark') {
            if (top < 1.15) bad.push(`плашка/фон сверху ${where}=${top.toFixed(3)}<1.15`);
            if (bottom < 1.05) bad.push(`плашка/фон снизу ${where}=${bottom.toFixed(3)}<1.05`);
            const lift = paletteContrast(g.raisedFillFrom, g.plateFillFrom);
            if (lift < 1.2) bad.push(`выбранное/плашка ${where}=${lift.toFixed(3)}<1.2`);
          } else if (top < 1.07) {
            bad.push(`плашка/фон сверху ${where}=${top.toFixed(3)}<1.07`);
          }
          if (paletteContrast(solid(g.text), g.plateFillTo) < 7) bad.push(`text/плашка ${where}`);
          if (paletteContrast(solid(g.secondary), g.plateFillTo) < 4.5) bad.push(`secondary/плашка ${where}`);
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('числа спеки: тёмная — одна тень плашки, светлая — основная и мягкая; приподнятое сильнее плашки', () => {
    const dark = liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark', intensity: 0 });
    const light = liquidGlassTokens('graphite', { level: 'calm', appearance: 'light', intensity: 0 });
    expect(plateShadowStyle(dark)).toEqual([{ offsetX: 0, offsetY: 16, blurRadius: 28, spreadDistance: -14, color: 'rgba(0,0,0,0.75)' }]);
    expect(plateShadowStyle(light).map((s) => [s.offsetY, s.blurRadius, s.spreadDistance])).toEqual([[14, 26, -14], [1, 3, 0]]);
    expect(nestedShadowStyle(dark)[0]).toMatchObject({ offsetY: 6, blurRadius: 12, spreadDistance: -6, color: 'rgba(0,0,0,0.6)' });
    expect(nestedShadowStyle(light)[0]).toMatchObject({ offsetY: 5, blurRadius: 10, spreadDistance: -5 });
    expect(raisedShadowStyle(dark)).toEqual([{ offsetX: 0, offsetY: 26, blurRadius: 40, spreadDistance: -14, color: 'rgba(0,0,0,0.9)' }]);
    expect(raisedShadowStyle(light).map((s) => [s.offsetY, s.blurRadius, s.spreadDistance])).toEqual([[26, 40, -14], [2, 4, 0]]);
    expect(RAISED_LIFT).toBe(-3);
    expect(plateGradient(dark).start).toEqual({ x: 0.5, y: 0 });
    expect(plateGradient(dark).end).toEqual({ x: 0.5, y: 1 });
    expect(raisedGradient(dark).colors[0]).toBe(dark.raisedFillFrom);
    expect(actionShadowStyle(dark)[0]).toMatchObject({ offsetY: 14, blurRadius: 24, spreadDistance: -10 });
    expect(actionShadowStyle(dark)[0]!.color).toBe(`${dark.accent.slice(0, 7)}99`);
  });

  it('ползунок: светлая тень берёт тон темы — на «Максимуме» она отличается от «Спокойно» хотя бы у тонированных тем', () => {
    const calm = liquidGlassTokens('sage', { level: 'calm', appearance: 'light', intensity: 0 });
    const max = liquidGlassTokens('sage', { level: 'max', appearance: 'light', intensity: 1 });
    expect(max.plateShadow).not.toBe(calm.plateShadow);
  });
});
