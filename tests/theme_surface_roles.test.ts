import { liquidGlassContrast } from '../constants/liquidGlassGradientThemes';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { deriveLiquidGlassSurfaceRoles, mixSurfaceHex } from '../constants/liquidGlassSurfaceRoles';

// зачем (замечание владельца 10.10): токены поверхностей есть у КАЖДОЙ темы — тёмной и светлой, на каждом шаге ползунка;
// и тексты на карточках темы читаются (≥ 4.5 основной, ≥ 3 приглушённый) — на экранах Карточек, Ошибок, Видео, Монет, Результатов.
const ROLE_KEYS = ['deepBase', 'deepBaseAlt', 'mediaScrim', 'mediaInk', 'mediaInkSoft', 'bevelHi', 'bevelLo', 'dropShadow', 'hairlineSoft'] as const;
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
// зачем (Ревизор 25.10): пигменты премиум-коллекции Codex записаны hex строчными (#333d20) и сверяются пакетом буква в букву — регистр цвет не меняет
const COLOR = /^(#[0-9A-F]{6}([0-9A-F]{2})?|rgba?\([0-9., ]+\))$/i;
const solid = (hex: string) => hex.slice(0, 7);

describe('theme surface role tokens', () => {
  it('exist in every theme, appearance and slider step with valid colors', () => {
    let checked = 0;
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          for (const key of ROLE_KEYS) {
            expect([id, appearance, intensity, key, COLOR.test(String(g[key]))]).toEqual([id, appearance, intensity, key, true]);
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBe(LIQUID_GLASS_THEME_IDS.length * 2 * 21);
  });

  it('keeps existing tokens untouched (additive only)', () => {
    const g = liquidGlassTokens('graphite', { level: 'calm', appearance: 'dark', intensity: 0 });
    expect(g.cta).toBe('#F2F1F6');
    expect(g.opaqueCard).toBe('#151517');
    expect(g.card).toBe('#151517E6');
  });

  it('media ink stays readable on the media scrim and deep bases in every theme', () => {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          const scrim = appearance === 'dark' ? solid(g.deepBase) : '#000000';
          expect([id, appearance, intensity, liquidGlassContrast(g.mediaInk, scrim) >= 7]).toEqual([id, appearance, intensity, true]);
        }
      }
    }
  });

  it('text roles read on the cards and background of every theme (Cards, Mistakes, Video, Coins, Results)', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of STEPS) {
          const g = liquidGlassTokens(id, { level: 'calm', appearance, intensity });
          for (const [name, fg, bgc, min] of [
            ['text/card', g.text, g.opaqueCard, 4.5],
            ['text/bg', g.text, g.bg, 4.5],
            ['secondary/card', g.secondary, g.opaqueCard, 4.5],
            ['secondary/control', g.secondary, g.opaqueControl, 4.5],
            ['muted/card', g.mutedText, g.opaqueCard, 3],
            ['accentText/card', g.accentText, g.opaqueCard, 3],
          ] as const) {
            const ratio = liquidGlassContrast(solid(fg), solid(bgc));
            if (ratio < min) bad.push(`${id}|${appearance}|${intensity}|${name}=${ratio.toFixed(2)}<${min}`);
          }
        }
      }
    }
    expect(bad.slice(0, 40)).toEqual([]);
  });

  it('derives from the final theme fields and mixes colors correctly', () => {
    expect(mixSurfaceHex('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    const r = deriveLiquidGlassSurfaceRoles({ bg: '#0C0D10', opaqueCard: '#151517', opaqueControl: '#222429', text: '#FFFFFF', isLight: false, shadowTint: '#000000' });
    expect(r.dropShadow).toBe('rgba(0,0,0,0.85)');
    expect(r.hairlineSoft).toBe('#FFFFFF14');
  });
});
