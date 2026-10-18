import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { faceContrast } from '../components/cards-grid/galleryFaceColors';
import { planRowSelectedPaint } from '../components/paywall/paywallPlanRowPaint';

it('plan text remains readable throughout selection across every theme', () => {
  const failures: string[] = [];
  for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const appearance of ['dark', 'light'] as const) {
      for (const intensity of [0, 0.5, 1]) {
        const paint = planRowSelectedPaint(liquidGlassTokens(id, { appearance, intensity }));
        for (const ink of [paint.ink, paint.trialInk, paint.secondaryInk, paint.mutedInk]) {
          for (const bg of paint.backgrounds) {
            if (faceContrast(ink, bg) < 4.5) failures.push(`${id}/${appearance}/${intensity}: ${ink} on ${bg}`);
          }
        }
      }
    }
  }
  expect(failures).toEqual([]);
});
