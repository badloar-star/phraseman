import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { isPremiumThemeId } from '../app/premium_theme_catalog';
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
          // зачем (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2»: пигменты коллекции Codex — замок 24.10 + слово владельца 25.10 «как у Кодекса»): тон меряется на 23 обычных темах, премиум-темы — контрактом tests/premium_themes_contrast.test.ts; текст и валидность токенов — во всех 29
          if (isPremiumThemeId(id)) { /* тон премиум-коллекции не меряется здесь */ } else if (appearance === 'dark') {
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

  // зачем (координатор 14.10: «тень видна на светлом фоне и не грязнит тёмный»): считаем цвет тени, смешанный с фоном по её альфе, и
  // сравниваем с самим фоном. Светлая — видна на всех шагах (по замеру ≥ 1,65, порог 1,5); тёмная — нейтральный чёрный без цветного
  // оттенка (не грязнит), её малая видимость на почти чёрном фоне — решение спеки: плашку там отделяет тон (проверено выше).
  it('тень видна на светлом фоне и не грязнит тёмный', () => {
    const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    const parse = (c: string): [string, number] => {
      if (c.startsWith('#')) return [c.slice(0, 7), c.length === 9 ? parseInt(c.slice(7, 9), 16) / 255 : 1];
      const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/)!;
      return [`#${[m[1]!, m[2]!, m[3]!].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}`, m[4] ? Number(m[4]) : 1];
    };
    const over = (shadow: string, bg: string) => {
      const [color, alpha] = parse(shadow);
      const out = [0, 1, 2].map((i) => Math.round(channel(color, i) * alpha + channel(bg, i) * (1 - alpha)).toString(16).padStart(2, '0'));
      return `#${out.join('')}`;
    };
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of LEVELS) {
        for (const intensity of STEPS) {
          const where = `${id}|${level}|${intensity}`;
          const light = liquidGlassTokens(id, { level, appearance: 'light', intensity });
          for (const key of ['plateShadow', 'nestedShadow', 'raisedShadow'] as const) {
            const r = paletteContrast(over(light[key], solid(light.bg)), solid(light.bg));
            if (r < 1.5) bad.push(`светлая ${key} невидима ${where}=${r.toFixed(3)}<1.5`);
          }
          const dark = liquidGlassTokens(id, { level, appearance: 'dark', intensity });
          for (const key of ['plateShadow', 'nestedShadow', 'raisedShadow'] as const) {
            if (parse(dark[key])[0] !== '#000000') bad.push(`тёмная ${key} не нейтральный чёрный ${where}: ${dark[key]}`);
          }
        }
      }
    }
    expect(bad.length).toBe(0);
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('ползунок: светлая тень берёт тон темы — на «Максимуме» она отличается от «Спокойно» хотя бы у тонированных тем', () => {
    const calm = liquidGlassTokens('sage', { level: 'calm', appearance: 'light', intensity: 0 });
    const max = liquidGlassTokens('sage', { level: 'max', appearance: 'light', intensity: 1 });
    expect(max.plateShadow).not.toBe(calm.plateShadow);
  });
});
