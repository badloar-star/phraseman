// зачем (приказ владельца 11.10 19:2x + 14.10 через координатора): Главная — «Сегодня» без фона, остальные плашки с фоном 50 % (альфа цвета, не opacity
// элемента), текст/значки 100 %; в светлых темах на белой плашке нет ничего темнее неё (причина пятен — чёрная дымка градиентных тем в «Максимуме»).
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { DARK } from '../constants/theme';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_GRADIENT_THEME_IDS } from '../constants/liquidGlassGradientThemes';
import { getV2Palette } from '../constants/v2Style';
import { HOME_PLATE_ALPHA, homeAlpha, homePlateFill } from '../components/home/v2/homePlate';
import { colorWithAlpha } from '../components/v2/plateAlpha';

const root = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8');
const IDS = [...new Set([...(LIQUID_GLASS_THEME_IDS as readonly string[]), ...(LIQUID_GLASS_GRADIENT_THEME_IDS as readonly string[])])];
const LEVELS = ['calm', 'accent', 'max'] as const;
const APPEARANCES = ['dark', 'light'] as const;
const INTENSITIES = [0, 0.5, 1] as const;

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
const ratio = (a: number[], b: number[]) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blend = (fg: number[], a: number, bg: number[]) => fg.map((v, i) => v * a + bg[i]! * (1 - a));

describe('Главная: плашки с фоном 50 %', () => {
  it('colorWithAlpha / homeAlpha: все форматы цвета → rgba с абсолютной альфой', () => {
    expect(colorWithAlpha('#FFFFFF', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(colorWithAlpha('#FFF', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(colorWithAlpha('#11223344', 0.5)).toBe('rgba(17,34,51,0.5)');
    expect(colorWithAlpha('rgba(10,20,30,0.9)', 0.5)).toBe('rgba(10,20,30,0.5)');
    expect(homeAlpha('#000000')).toBe(`rgba(0,0,0,${HOME_PLATE_ALPHA})`);
    expect(HOME_PLATE_ALPHA).toBe(0.5);
  });

  it('фон плашки и приподнятой строки — альфа 0.5 на всех 23 темах × оформление × уровень × насыщенность', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const appearance of APPEARANCES) for (const level of LEVELS) for (const intensity of INTENSITIES) {
      const g = liquidGlassTokens(id as never, { level, appearance, intensity });
      for (const raised of [false, true]) {
        const fill = homePlateFill(g, raised);
        const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(fill);
        if (!m || Number(m[4]) !== 0.5) bad.push(`${id}/${appearance}/${level}/${intensity}/${raised}: ${fill}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('«Сегодня»: у внешней карточки нет фона, тени и блика; остальные компоненты Главной без V2GlassSheen и общего useV2GlassStyle', () => {
    const today = read('components', 'home', 'v2', 'HomeV2TodayCard.tsx');
    // зачем (17.10): та же карточка без заголовка внутри экрана «Сегодня» — только убирает верхний отступ (cardBare), фона/тени по-прежнему нет
    expect(today).toMatch(/testID="home-v2-today" style=\{\[s\.card, title === null \? s\.cardBare : null\]\}/);
    expect(/cardBare: \{[^}]*\}/s.exec(today)?.[0] ?? '').not.toMatch(/backgroundColor|boxShadow|shadow/);
    expect(today).not.toMatch(/V2GlassSheen|useV2GlassStyle/);
    const card = /card: \{[^}]*\}/s.exec(today)?.[0] ?? '';
    expect(card).not.toMatch(/backgroundColor|boxShadow|shadow/);
    const dir = join(root, 'components', 'home', 'v2');
    for (const name of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(join(dir, name), 'utf8');
      expect({ name, sheen: /V2GlassSheen|useV2GlassStyle/.test(src) }).toEqual({ name, sheen: false });
    }
    expect(read('components', 'DailyPhraseCard.tsx')).not.toMatch(/V2GlassSheen|useV2GlassStyle/);
  });

  it('прозрачность — через альфу цвета фона, а не opacity плашки; общий useV2GlassStyle не тронут', () => {
    const plate = read('components', 'home', 'v2', 'homePlate.ts');
    expect(plate).toMatch(/backgroundColor: homePlateFill\(g, raised\)/);
    expect(plate).not.toMatch(/opacity:/);
    const glass = read('components', 'v2', 'V2Glass.tsx');
    expect(glass).toMatch(/backgroundColor: raised \? g\.raisedFillFrom : g\.plateFillFrom/);
  });

  it('читаемость: текст на плашке 50 % поверх фона темы ≥ 4.5:1, заголовок «СЕГОДНЯ» на фоне ≥ 4.5:1 — все темы, оформления, уровни, насыщенности', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const appearance of APPEARANCES) for (const level of LEVELS) for (const intensity of INTENSITIES) {
      const variant = { level, appearance, intensity };
      const g = liquidGlassTokens(id as never, variant);
      const p = getV2Palette(makeLiquidGlassTheme(id as never, DARK as never, variant as never) as never, 'dark' as never) as unknown as { text: string; textSecondary: string };
      for (const bgHex of [g.bg, g.bgTop, g.bgBottom]) {
        const bg = rgb(bgHex.slice(0, 7));
        const checks: Array<[string, number]> = [
          ['text/plate', ratio(rgb(p.text.slice(0, 7)), blend(rgb(g.plateFillFrom.slice(0, 7)), 0.5, bg))],
          ['text/raised', ratio(rgb(p.text.slice(0, 7)), blend(rgb(g.raisedFillFrom.slice(0, 7)), 0.5, bg))],
          ['second/plate', ratio(rgb(p.textSecondary.slice(0, 7)), blend(rgb(g.plateFillFrom.slice(0, 7)), 0.5, bg))],
          ['second/raised', ratio(rgb(p.textSecondary.slice(0, 7)), blend(rgb(g.raisedFillFrom.slice(0, 7)), 0.5, bg))],
          ['second/bg', ratio(rgb(p.textSecondary.slice(0, 7)), bg)],
        ];
        for (const [name, r] of checks) if (r < 4.5) bad.push(`${id}/${appearance}/${level}/${intensity} ${name}: ${r.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('светлые темы: внутри белой плашки ничего темнее неё', () => {
  it('дымка и блик светлых тем — белые на всех темах × уровнях × насыщенностях (причина пятен: чёрная дымка градиентных тем в «Максимуме»)', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const level of LEVELS) for (const intensity of INTENSITIES) {
      const variant = { level, appearance: 'light' as const, intensity };
      const g = liquidGlassTokens(id as never, variant);
      const p = getV2Palette(makeLiquidGlassTheme(id as never, DARK as never, variant as never) as never, 'dark' as never) as unknown as { smoke: string; smokeBoost: number; sheenFrom: string; sheenTo: string };
      const plate = rgb(g.plateFillFrom.slice(0, 7));
      const smoke = rgb(p.smoke.slice(0, 7));
      if (lum(smoke) < lum(plate) - 1e-6) bad.push(`${id}/${level}/${intensity} smoke ${p.smoke} темнее плашки ${g.plateFillFrom}`);
      if (p.smokeBoost !== 1) bad.push(`${id}/${level}/${intensity} smokeBoost=${p.smokeBoost}`);
      for (const sheen of [p.sheenFrom, p.sheenTo]) {
        const m = /^rgba\((\d+),(\d+),(\d+)/.exec(sheen);
        if (!m || Number(m[1]) < 255 || Number(m[2]) < 255 || Number(m[3]) < 255) bad.push(`${id}/${level}/${intensity} sheen ${sheen}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('тёмные темы дымку не меняют: «Максимум» по-прежнему тоном темы', () => {
    const variant = { level: 'max' as const, appearance: 'dark' as const, intensity: 1 };
    const p = getV2Palette(makeLiquidGlassTheme('polar' as never, DARK as never, variant as never) as never, 'dark' as never) as unknown as { smokeBoost: number };
    expect(p.smokeBoost).toBe(3);
  });

  it('фон плашки Главной — один цвет (без градиента): ни одна точка не темнее заливки плашки', () => {
    const plate = read('components', 'home', 'v2', 'homePlate.ts');
    expect(plate).not.toMatch(/LinearGradient|plateGradient|raisedGradient/);
  });
});
