import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PREMIUM_THEME_VISUAL_SPECS, premiumSceneTop } from '../constants/premiumThemeVisualSpecs';
import { homeSceneOklchOf, homeSceneTokensForTheme, whiteContrastOn } from '../components/home/v2/scene/home_scene_tokens';

const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

describe('approved premium theme visual specs', () => {
  it('keeps six distinct exact collections', () => {
    expect(PREMIUM_THEME_VISUAL_SPECS).toHaveLength(6);
    expect(new Set(PREMIUM_THEME_VISUAL_SPECS.map((s) => s.id)).size).toBe(6);
    expect(new Set(PREMIUM_THEME_VISUAL_SPECS.map((s) => s.dark.join('|'))).size).toBe(6);
  });

  it.each(PREMIUM_THEME_VISUAL_SPECS)('$id transfers every approved dark and light surface pigment', (spec) => {
    for (const appearance of ['dark', 'light'] as const) {
      const [bg, from, to, dock] = spec[appearance];
      const tokens = liquidGlassTokens(spec.id, { level: 'max', appearance });
      expect(tokens.bg).toBe(bg);
      expect(tokens.opaqueControl).toBe(from);
      expect(tokens.opaqueCard).toBe(to);
      expect(tokens.plateFillFrom).toBe(from);
      expect(tokens.plateFillTo).toBe(to);
      expect(tokens.premiumDock).toBe(dock);
      expect(tokens.text).toBe(appearance === 'dark' ? '#fff9f6' : '#181a20');
      expect(tokens.accent).toBe(appearance === 'dark' ? spec.accent : spec.ink);
    }
    const scene = homeSceneTokensForTheme(spec.id, 'dark');
    // зачем (4 · ТЕМЫ 24.10, замок «цвета/контраст» сильнее точного пигмента): верх сцены — оттенок и насыщенность коллекции; светлота может быть
    // углублена ровно настолько, чтобы белые подписи на сцене читались (у olive тёмного утверждённый верх давал 3,94 < 4,5)
    const [, cTop, hTop] = homeSceneOklchOf(rgbOf(scene.sceneTop));
    const [, cSpec, hSpec] = homeSceneOklchOf(rgbOf(premiumSceneTop(spec)));
    expect(Math.abs(hTop - hSpec) < 4 || cSpec < 0.02).toBe(true);
    expect(Math.abs(cTop - cSpec)).toBeLessThan(0.03);
    expect(whiteContrastOn(scene.sceneTop)).toBeGreaterThanOrEqual(Math.min(whiteContrastOn(premiumSceneTop(spec)), 6.2) - 0.01);
    expect(scene.sceneBottom.toLowerCase()).toBe(spec.sceneBottom.toLowerCase());
    expect(scene.sceneGlow.toLowerCase()).toBe(`${spec.edge}25`.toLowerCase());
  });
});
