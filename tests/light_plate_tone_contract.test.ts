// зачем (приказ владельца 14.10 через координатора: «тёмные пятна в светлых темах проявляются на белом»): во всех светлых темах × насыщенность 0 / 0.5 / 1
// (× три уровня) блик и дымка плашки не темнее её заливки; тёмные темы без изменений; лог [PLATE-TONE] — один раз на сочетание.
import { readFileSync } from 'fs';
import { join } from 'path';
import { DARK } from '../constants/theme';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_GRADIENT_THEME_IDS } from '../constants/liquidGlassGradientThemes';
import { getV2Palette } from '../constants/v2Style';
import { logPlateToneOnce, plateToneFor } from '../components/v2/plateTone';

const IDS = [...new Set([...(LIQUID_GLASS_THEME_IDS as readonly string[]), ...(LIQUID_GLASS_GRADIENT_THEME_IDS as readonly string[])])];
const LEVELS = ['calm', 'accent', 'max'] as const;
const INTENSITIES = [0, 0.5, 1] as const;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);

type Pal = { smoke: string; smokeBoost: number; sheenFrom: string; sheenTo: string };
const paletteOf = (id: string, appearance: 'dark' | 'light', level: 'calm' | 'accent' | 'max', intensity: number): Pal => {
  const variant = { level, appearance, intensity };
  return getV2Palette(makeLiquidGlassTheme(id as never, DARK as never, variant as never) as never, 'dark' as never) as unknown as Pal;
};

describe('светлые темы: блик и дымка плашки не темнее её заливки', () => {
  it('для каждой светлой темы × уровня × насыщенности 0/0.5/1 нарисованная дымка не темнее плашки, усиление ×1, блик — белый', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const level of LEVELS) for (const intensity of INTENSITIES) {
      const g = liquidGlassTokens(id as never, { level, appearance: 'light', intensity });
      const pal = paletteOf(id, 'light', level, intensity);
      const tone = plateToneFor(g, pal);
      const plate = rgb(g.plateFillFrom.slice(0, 7));
      if (lum(rgb(tone.smoke.slice(0, 7))) < lum(plate) - 1e-6) bad.push(`${id}/${level}/${intensity}: дымка ${tone.smoke} темнее плашки ${g.plateFillFrom}`);
      if (tone.smokeBoost !== 1) bad.push(`${id}/${level}/${intensity}: усиление ${tone.smokeBoost}`);
      for (const sheen of [pal.sheenFrom, pal.sheenTo]) {
        const m = /^rgba\((\d+),(\d+),(\d+)/.exec(sheen);
        if (!m || Number(m[1]) < 255 || Number(m[2]) < 255 || Number(m[3]) < 255) bad.push(`${id}/${level}/${intensity}: блик ${sheen}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('даже если палитра светлой темы попросит тёмную дымку — компонент нарисует белую (защита от регрессии)', () => {
    const g = liquidGlassTokens('polar' as never, { level: 'max', appearance: 'light', intensity: 1 });
    expect(plateToneFor(g, { smoke: '#000000', smokeBoost: 4 })).toEqual({ smoke: '#FFFFFF', smokeBoost: 1, clamped: true });
    expect(plateToneFor(g, { smoke: '#FFFFFF', smokeBoost: 1 }).clamped).toBe(false);
  });

  it('тёмные темы без изменений: дымка и усиление — как в палитре', () => {
    for (const id of ['polar', 'graphite', 'grad_aurora']) for (const level of LEVELS) {
      const g = liquidGlassTokens(id as never, { level, appearance: 'dark', intensity: 1 });
      const pal = paletteOf(id, 'dark', level, 1);
      expect(plateToneFor(g, pal)).toEqual({ smoke: pal.smoke, smokeBoost: pal.smokeBoost, clamped: false });
    }
  });

  it('ThemeGlassSmoke (дымка «Максимума» в Настройках, Друзьях, Уроках) в светлом оформлении не рисуется', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'v2', 'ThemeGlassSmoke.tsx'), 'utf8');
    expect(src).toMatch(/if \(glass\.isLight\) return null;/);
    expect(src).toMatch(/'level' \| 'cardSmoke' \| 'isLight'/);
  });

  it('V2GlassSheen берёт тон через plateToneFor и логирует [PLATE-TONE]', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'v2', 'V2Glass.tsx'), 'utf8');
    expect(src).toMatch(/plateToneFor\(shadowGlass, p\)/);
    expect(src).toMatch(/stopColor=\{tone\.smoke\}/);
    expect(src).not.toMatch(/stopColor=\{p\.smoke\}/);
  });

  it('[PLATE-TONE]: один раз на сочетание, с тем, что просила палитра и что нарисовано', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const g = liquidGlassTokens('marine' as never, { level: 'max', appearance: 'light', intensity: 0.5 });
    const pal = { smoke: '#78DBF4', smokeBoost: 4, sheenFrom: 'rgba(255,255,255,0.65)', sheenTo: 'rgba(255,255,255,0)' };
    const tone = plateToneFor(g, pal);
    logPlateToneOnce('marine-test', g, pal, tone);
    logPlateToneOnce('marine-test', g, pal, tone);
    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0]?.[0]);
    expect(line).toContain('[PLATE-TONE] theme=marine-test isLight=true');
    expect(line).toContain('smokeAsked=#78DBF4×4');
    expect(line).toContain('smokeDrawn=#FFFFFF×1');
    expect(line).toContain('clamped=true');
    logPlateToneOnce('marine-test-2', g, pal, tone);
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
