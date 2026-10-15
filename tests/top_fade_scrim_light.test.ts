// зачем (кадр HOME_light.png, координатор 14.10): в светлой теме под статус-баром была тёмно-серая полоса (RGB 131,133,135) — скрим TopFadeMask по умолчанию
// чёрный. Теперь без явного tone светлая тема берёт цвет фона темы (bgTop), тёмная — как раньше; в логе [HOME-PLATE] значение цвета скрима.

/* eslint-disable import/first */
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_GRADIENT_THEME_IDS } from '../constants/liquidGlassGradientThemes';
import { topFadeScrim } from '../components/topFadeScrim';

const IDS = [...new Set([...(LIQUID_GLASS_THEME_IDS as readonly string[]), ...(LIQUID_GLASS_GRADIENT_THEME_IDS as readonly string[])])];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c: number[]) => 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);

describe('скрим под статус-баром (TopFadeMask)', () => {
  it('тёмная тема — как раньше: чёрный, strength×0.62 (0.72 → 0.446)', () => {
    const s = topFadeScrim(false, '#101216', 0.72);
    expect(s.rgb).toBe('0,0,0');
    expect(s.alpha).toBeCloseTo(0.72 * 0.62, 5);
  });

  it('явный tone работает как раньше в любой теме', () => {
    expect(topFadeScrim(true, '#FFFFFF', 0.72, 'dark')).toMatchObject({ rgb: '0,0,0' });
    expect(topFadeScrim(true, '#FFFFFF', 0.72, 'light')).toMatchObject({ rgb: '255,255,255' });
    expect(topFadeScrim(false, '#000000', 0.72, 'light')).toMatchObject({ rgb: '255,255,255' });
  });

  it('все светлые темы × уровни × насыщенность 0/0.5/1: скрим — цвет фона темы, поверх фона не темнее него (никакой серой полосы)', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const level of ['calm', 'accent', 'max'] as const) for (const intensity of [0, 0.5, 1]) {
      const g = liquidGlassTokens(id as never, { level, appearance: 'light', intensity });
      const s = topFadeScrim(g.isLight, g.bgTop, 0.72);
      const bg = rgb(g.bgTop.slice(0, 7));
      const scr = s.rgb.split(',').map(Number);
      if (scr.join(',') !== bg.join(',')) bad.push(`${id}/${level}/${intensity}: скрим ${s.rgb} ≠ фон ${bg.join(',')}`);
      const composite = bg.map((v, i) => scr[i]! * s.alpha + v * (1 - s.alpha));
      if (lum(composite) < lum(bg) - 1e-6) bad.push(`${id}/${level}/${intensity}: полоса темнее фона`);
    }
    expect(bad).toEqual([]);
  });

  it('кадр «Затмение» светлая, насыщенность 0: на фоне темы полоса не серая', () => {
    const g = liquidGlassTokens('graphite' as never, { level: 'calm', appearance: 'light', intensity: 0 });
    const s = topFadeScrim(g.isLight, g.bgTop, 0.72);
    const bg = rgb(g.bgTop.slice(0, 7));
    const scr = s.rgb.split(',').map(Number);
    const composite = bg.map((v, i) => Math.round(scr[i]! * s.alpha + v * (1 - s.alpha)));
    expect(Math.min(...composite)).toBeGreaterThan(200);
  });

  it('компонент берёт цвет через topFadeScrim и пишет [HOME-PLATE] topscrim со значением скрима', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'TopFadeMask.tsx'), 'utf8');
    expect(src).toMatch(/topFadeScrim\(glass\.isLight, glass\.bgTop, maxOpacity, tone\)/);
    expect(src).toMatch(/\[HOME-PLATE\] topscrim theme=\$\{liquidGlassThemeId\} isLight=.*scrim=\$\{useCanvas \? 'canvas-copy' : scrim\}/);
    expect(src).not.toMatch(/const resolvedTone = tone \?\? 'dark'/);
  });
});
