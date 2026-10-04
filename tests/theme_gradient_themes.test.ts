// зачем (владелец 2026-10-04, макет docs/design/v2-app/themes-gradient.html): 10 градиентных тем
// ДОБАВЛЕНЫ к 13 тонированным. Сторожим: формулы макета, контраст текста ≥ 4.5:1 на КАЖДОМ шаге
// ползунка, имена на 9 языках, набор из одного списка-конфига, светлое — без выдумок (Графит).
import {
  LIQUID_GLASS_GRADIENT_THEMES,
  LIQUID_GLASS_GRADIENT_THEME_IDS,
} from '../constants/liquidGlassGradientThemes';
import {
  LIQUID_GLASS_THEME_IDS,
  liquidGlassTokens,
  resolveLiquidGlassTheme,
} from '../constants/liquidGlassThemePalette';
import { mixLiquidGlassColor } from '../constants/liquidGlassThemeIntensity';
import { themeSwatchSpec } from '../constants/liquidGlassThemeSwatch';
import { THEME_DISPLAY_NAMES } from '../app/theme_display_names';

const STEPS = Array.from({ length: 21 }, (_, i) => Math.round(i * 5) / 100);
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function rgb(hex: string): [number, number, number, number] {
  const h = hex.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
}
/** Полупрозрачный цвет поверх подложки. */
function over(top: string, under: string): string {
  const [r1, g1, b1, a] = rgb(top);
  const [r2, g2, b2] = rgb(under);
  const c = (x: number, y: number) => Math.round(x * a + y * (1 - a)).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(v => v / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

describe('gradient themes registry', () => {
  it('10 gradient themes are ADDED to the 13 tinted ones, from one config list', () => {
    expect(LIQUID_GLASS_GRADIENT_THEME_IDS).toHaveLength(10);
    expect(LIQUID_GLASS_THEME_IDS).toHaveLength(23);
    expect(LIQUID_GLASS_THEME_IDS.slice(0, 13)).toContain('graphite');
    for (const id of LIQUID_GLASS_GRADIENT_THEME_IDS) {
      expect(LIQUID_GLASS_THEME_IDS).toContain(id);
      expect(resolveLiquidGlassTheme(id)).toBe(id);
    }
  });

  it('ids never reuse retired names (a stored "aurora"/"midnight" must not suddenly become a gradient)', () => {
    for (const id of LIQUID_GLASS_GRADIENT_THEME_IDS) expect(id.startsWith('grad_')).toBe(true);
    expect(resolveLiquidGlassTheme('aurora')).toBe('graphite');
  });

  it('every gradient theme has a name in all 9 interface languages', () => {
    for (const id of LIQUID_GLASS_GRADIENT_THEME_IDS) {
      const names = THEME_DISPLAY_NAMES[id];
      expect(names).toBeDefined();
      for (const lang of LANGS) expect((names as Record<string, string | undefined>)[lang]?.trim()).toBeTruthy();
    }
  });

  it('swatch = the two glow colours diagonally, like the mockup chip', () => {
    const def = LIQUID_GLASS_GRADIENT_THEMES[0]!;
    expect(themeSwatchSpec(def.id, false)).toEqual({ kind: 'linear', stops: [[0, def.glowA], [1, def.glowB]] });
  });
});

describe('gradient formulas from themes-gradient.html', () => {
  const def = LIQUID_GLASS_GRADIENT_THEMES.find(t => t.id === 'grad_aurora')!;
  const at = (intensity: number) => liquidGlassTokens(def.id, { level: 'calm', appearance: 'dark', intensity });

  it('at 0 the button is the white mockup CTA and glow is a faint 8 %', () => {
    const t = at(0);
    expect(t.accent).toBe('#F2F1F6');
    expect(t.accentInk).toBe(def.onAccent);
    expect(t.bgGlow[0]).toBe(`${def.glowA}14`); // 0.08 · 255 ≈ 20 = 0x14
  });

  it('at 1 the button is the theme accent and glow reaches 70 %', () => {
    const t = at(1);
    expect(t.accent).toBe(def.accent);
    expect(t.bgGlow[1]).toBe(`${def.glowB}B3`); // 0.70 · 255 ≈ 179 = 0xB3
    expect(t.accentTile).toBe(mixLiquidGlassColor('#2A2A2C', def.accent, 0.16));
    expect(t.progressGradient[0]).toBe(def.accent);
  });

  it('light appearance shows the light Graphite palette (no invented light gradient yet)', () => {
    const g = liquidGlassTokens(def.id, { level: 'calm', appearance: 'light', intensity: 0.6 });
    const graphite = liquidGlassTokens('graphite', { level: 'calm', appearance: 'light', intensity: 0.6 });
    expect(g).toEqual(graphite);
  });
});

describe('contrast ≥ 4.5:1 on every slider step', () => {
  it.each(LIQUID_GLASS_GRADIENT_THEMES.map(t => [t.id]))('%s', (id) => {
    for (const k of STEPS) {
      const t = liquidGlassTokens(id, { level: 'calm', appearance: 'dark', intensity: k });
      const card = t.opaqueCard;
      const glassCard = over(t.card, t.bg);
      const checks: [string, number][] = [
        ['text on button', contrast(t.accentInk, t.accent)],
        ['text on card', contrast(t.text, card)],
        ['text on glass card', contrast(t.text, glassCard)],
        ['secondary on card', contrast(t.secondary, card)],
        ['accent text on background', contrast(t.accentText, t.bg)],
      ];
      for (const [what, ratio] of checks) {
        if (ratio < 4.5) throw new Error(`${id} @ ${k}: ${what} = ${ratio.toFixed(2)} < 4.5`);
      }
    }
  });
});
