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
  it('16 gradient themes (10 + 6 premium) are ADDED to the 13 tinted ones, from one config list', () => {
    // зачем (координатор 25.10): премиум-темы видимые (выбор тем, награды за достижения) — в реестре 23 + 6 = 29
    expect(LIQUID_GLASS_GRADIENT_THEME_IDS).toHaveLength(16);
    expect(LIQUID_GLASS_THEME_IDS).toHaveLength(29);
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

  it('light = variant B «Пастель»: two-colour wash, white cards, ink button turns pastel', () => {
    const at0 = liquidGlassTokens(def.id, { level: 'calm', appearance: 'light', intensity: 0 });
    const at1 = liquidGlassTokens(def.id, { level: 'calm', appearance: 'light', intensity: 1 });
    expect(at0.isLight).toBe(true);
    expect(at0.bgTop).toBe('#F6F6F8');
    expect(at0.accent).toBe('#1C1C1F');
    expect(at0.accentInk).toBe('#FFFFFF');
    expect(at1.bgTop).toBe(mixLiquidGlassColor('#F6F6F8', def.glowA, 0.22));
    expect(at1.bgBottom).toBe(mixLiquidGlassColor('#F6F6F8', def.glowB, 0.20));
    expect(at1.accent).toBe(def.accent);
    expect(at1.accentInk).toBe(def.onAccent);
    expect(at1.opaqueCard).toBe('#FFFFFF');
    expect(at1.bgGlow.every(c => c.endsWith('00'))).toBe(true);
  });
});

describe('renamed tinted themes (owner 04.10)', () => {
  it('«Сирень» and «Орхидея» belong to the gradient themes now', () => {
    expect(THEME_DISPLAY_NAMES.lavender?.ru).toBe('Туманность');
    expect(THEME_DISPLAY_NAMES.iris?.ru).toBe('Комета');
    expect(THEME_DISPLAY_NAMES.grad_lilac?.ru).toBe('Сирень');
    expect(THEME_DISPLAY_NAMES.grad_orchid?.ru).toBe('Орхидея');
    const ru = Object.values(THEME_DISPLAY_NAMES).map(n => n.ru);
    expect(ru.filter(n => n === 'Сирень')).toHaveLength(1);
    expect(ru.filter(n => n === 'Орхидея')).toHaveLength(1);
  });
});

describe('contrast ≥ 4.5:1 on every slider step — light «Пастель»', () => {
  it.each(LIQUID_GLASS_GRADIENT_THEMES.map(t => [t.id]))('%s', (id) => {
    for (const k of STEPS) {
      const t = liquidGlassTokens(id, { level: 'calm', appearance: 'light', intensity: k });
      const checks: [string, number][] = [
        ['text on button', contrast(t.accentInk, t.accent)],
        ['text on card', contrast(t.text, t.opaqueCard)],
        ['secondary on card', contrast(t.secondary, t.opaqueCard)],
        ['muted on card', contrast(t.mutedText, t.opaqueCard)],
        ['text on background (top)', contrast(t.text, t.bgTop)],
        ['accent text on background', contrast(t.accentText, t.bgTop)],
        ['accent text on background (bottom)', contrast(t.accentText, t.bgBottom)],
      ];
      for (const [what, ratio] of checks) {
        if (ratio < 4.5) throw new Error(`${id} light @ ${k}: ${what} = ${ratio.toFixed(2)} < 4.5`);
      }
    }
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
