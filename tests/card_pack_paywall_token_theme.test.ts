import { cardPackPaywallShellFromTokens } from '../app/flashcards/cardPackPaywallTokenTheme';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';

// зачем: вариант темы требует level; берём его из интенсивности, как ThemeContext
const variant = (appearance: 'dark' | 'light', intensity: number) => ({ appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });

// зачем (координатор 12.10): окно покупки набора следует цвету темы на любом оформлении и оттенке ползунка.
const IDS = ['graphite', 'ocean', 'sunset', 'mint'];
const INTENSITIES = [0, 0.5, 1];
const APPEARANCES = ['dark', 'light'] as const;

describe('cardPackPaywallShellFromTokens', () => {
  for (const id of IDS) {
    for (const appearance of APPEARANCES) {
      for (const intensity of INTENSITIES) {
        it(`${id}/${appearance}/${intensity}: все поля заданы, CTA и текст берутся из токенов`, () => {
          const t = liquidGlassTokens(id, variant(appearance, intensity));
          const s = cardPackPaywallShellFromTokens(t);
          // Дизайн 12.10 (cb7586152): если accentInk на accentBright < 4,5:1, обе половины градиента — accent.
          expect([[t.accentBright, t.accent], [t.accent, t.accent]]).toContainEqual(s.ctaColors);
          expect(s.ctaForeground).toBe(t.accentInk);
          expect(s.goShopForeground).toBe(t.accentInk);
          expect(s.iconBg).toEqual([t.opaqueControl, t.opaqueCard]);
          for (const v of [s.backdropBase, s.borderAccent, s.handleColorLight, s.handleColorDark, s.iconBorder, s.priceBorder, s.ctaGlowTop]) {
            expect(typeof v).toBe('string');
            expect(v.length).toBeGreaterThan(0);
          }
        });
      }
    }
  }

  it('больше не зелёная оболочка прежнего режима dark', () => {
    const s = cardPackPaywallShellFromTokens(liquidGlassTokens('ocean', variant('light', 1)));
    expect(s.ctaColors).not.toEqual(['#47C870', '#164422']);
  });

  it('светлое оформление: подложка мягче тёмной', () => {
    const alpha = (c: string) => parseFloat(c.replace(/^.*,\s*([\d.]+)\)$/, '$1'));
    const light = cardPackPaywallShellFromTokens(liquidGlassTokens('graphite', variant('light', 0)));
    const dark = cardPackPaywallShellFromTokens(liquidGlassTokens('graphite', variant('dark', 0)));
    expect(alpha(light.backdropBase)).toBeLessThan(alpha(dark.backdropBase));
  });
});
