import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_PALETTE_ROLE_KEYS, paletteContrast } from '../constants/liquidGlassPaletteRoles';

// зачем (релизный пол, координатор 10.10): палитры ролей (good/bad/warn/info, скрим, плитки настроек, категории достижений, медали,
// уровни A1–B2) есть у КАЖДОЙ темы — тёмной и светлой, на каждом шаге ползунка — и читаются по WCAG на основных экранах.
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const COLOR = /^(#[0-9A-F]{6}([0-9A-F]{2})?|rgba?\([0-9., ]+\))$/i;
const solid = (hex: string) => hex.slice(0, 7);

function forEachToken(fn: (id: string, appearance: string, intensity: number, g: GlassTokens) => void) {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of STEPS) {
        fn(id, appearance, intensity, liquidGlassTokens(id, { level: 'calm', appearance, intensity }));
      }
    }
  }
}

describe('theme palette role tokens', () => {
  it('declares 56 role tokens', () => {
    expect(LIQUID_GLASS_PALETTE_ROLE_KEYS.length).toBe(56);
    expect(new Set(LIQUID_GLASS_PALETTE_ROLE_KEYS).size).toBe(56);
  });

  it('exist in every theme, appearance and slider step with valid colors', () => {
    let checked = 0;
    forEachToken((id, appearance, intensity, g) => {
      for (const key of LIQUID_GLASS_PALETTE_ROLE_KEYS) {
        expect([id, appearance, intensity, key, COLOR.test(String(g[key]))]).toEqual([id, appearance, intensity, key, true]);
      }
      checked += 1;
    });
    expect(checked).toBe(LIQUID_GLASS_THEME_IDS.length * 2 * 21);
  });

  it('keeps existing tokens untouched (additive only)', () => {
    const g = liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark', intensity: 0 });
    expect(g.cta).toBe('#F2F1F6');
    expect(g.opaqueCard).toBe('#151517');
  });

  it('semantic good/bad/warn/info read on card, background and control of every theme (WCAG >= 4.5)', () => {
    const bad: string[] = [];
    forEachToken((id, appearance, intensity, g) => {
      for (const name of ['good', 'bad', 'warn', 'info'] as const) {
        for (const [on, surface] of [['card', g.opaqueCard], ['bg', g.bg], ['control', g.opaqueControl]] as const) {
          const ratio = paletteContrast(solid(g[name]), solid(surface));
          if (ratio < 4.5) bad.push(`${id}|${appearance}|${intensity}|${name}/${on}=${ratio.toFixed(2)}`);
        }
      }
    });
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('white icon reads on the deep tone of every tile, category and medal (>= 4.5), top tone is >= 3', () => {
    const bad: string[] = [];
    const names = ['tileBlue', 'tileGreen', 'tileOrange', 'tileRed', 'tilePink', 'tilePurple', 'tileIndigo', 'tileTeal', 'tileGold', 'tileGray',
      'achStreak', 'achLessons', 'achCombo', 'achSpecial', 'achMedal', 'medalBronze', 'medalSilver', 'medalGold', 'medalPlatinum'] as const;
    forEachToken((id, appearance, intensity, g) => {
      for (const name of names) {
        const deep = paletteContrast('#FFFFFF', solid(g[`${name}Deep` as keyof GlassTokens] as string));
        const top = paletteContrast('#FFFFFF', solid(g[name] as string));
        if (deep < 4.5) bad.push(`${id}|${appearance}|${intensity}|${name}Deep=${deep.toFixed(2)}`);
        if (top < 3) bad.push(`${id}|${appearance}|${intensity}|${name}=${top.toFixed(2)}`);
      }
    });
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('level ink reads on its plate for A1–B2 in every theme (WCAG >= 4.5)', () => {
    const bad: string[] = [];
    forEachToken((id, appearance, intensity, g) => {
      for (const level of ['A1', 'A2', 'B1', 'B2'] as const) {
        const ratio = paletteContrast(solid(g[`level${level}` as keyof GlassTokens] as string), solid(g[`level${level}Bg` as keyof GlassTokens] as string));
        if (ratio < 4.5) bad.push(`${id}|${appearance}|${intensity}|${level}=${ratio.toFixed(2)}`);
      }
    });
    expect(bad.slice(0, 30)).toEqual([]);
  });

  it('levels are distinguishable steps, not one repeated color', () => {
    forEachToken((_id, _appearance, _intensity, g) => {
      expect(new Set([g.levelA1, g.levelA2, g.levelB1, g.levelB2]).size).toBeGreaterThanOrEqual(3);
    });
  });
  it('main screens: buttons, sheets and text on every surface of every theme read (WCAG)', () => {
    const bad: string[] = [];
    forEachToken((id, appearance, intensity, g) => {
      for (const [name, fg, bgc, min] of [
        ['ctaInk/cta', g.ctaInk, g.cta, 4.5],
        ['accentInk/accent', g.accentInk, g.accent, 4.5],
        ['text/sheet', g.text, g.opaqueSheet, 4.5],
        ['secondary/sheet', g.secondary, g.opaqueSheet, 4.5],
        ['text/control', g.text, g.opaqueControl, 4.5],
        ['secondary/bg', g.secondary, g.bg, 4.5],
        ['accentText/bg', g.accentText, g.bg, 3],
        ['accentText/control', g.accentText, g.opaqueControl, 3],
      ] as const) {
        const ratio = paletteContrast(solid(fg), solid(bgc));
        if (ratio < min) bad.push(`${id}|${appearance}|${intensity}|${name}=${ratio.toFixed(2)}<${min}`);
      }
    });
    expect(bad.slice(0, 40)).toEqual([]);
  });
});
