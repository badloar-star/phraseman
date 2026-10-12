import { accentFillGradient, ACCENT_FILL_MIN_CONTRAST } from '../constants/accentFill';
import { colorContrast } from '../constants/color_contrast';
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { liquidGlassLevelForIntensity } from '../constants/liquidGlassThemeIntensity';

// зачем (Дизайн 12.10): заливка под accentInk обязана держать контраст ≥ 4,5 на каждой теме, в обоих оформлениях и на опорных оттенках ползунка.
const variant = (appearance: 'dark' | 'light', intensity: number) => ({ appearance, intensity, level: liquidGlassLevelForIntensity(intensity) });
const APPEARANCES = ['dark', 'light'] as const;
const INTENSITIES = [0, 0.25, 0.5, 0.75, 1];

describe('заливка под accentInk (accentFillGradient)', () => {
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of APPEARANCES) {
      for (const intensity of INTENSITIES) {
        it(`${id}/${appearance}/${intensity}: обе половины ≥ ${ACCENT_FILL_MIN_CONTRAST}:1`, () => {
          const t = liquidGlassTokens(id, variant(appearance, intensity));
          const [top, bottom] = accentFillGradient(t);
          const a = colorContrast(t.accentInk, top);
          const b = colorContrast(t.accentInk, bottom);
          expect(a).toBeGreaterThanOrEqual(ACCENT_FILL_MIN_CONTRAST);
          expect(b).toBeGreaterThanOrEqual(ACCENT_FILL_MIN_CONTRAST);
        });
      }
    }
  }
});
