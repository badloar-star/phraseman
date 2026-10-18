import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../../constants/liquidGlassSurfaceRoles';
import { paywallPlateBg } from './paywall_surfaces';

const alpha = (hex: string, value: number): string => `${hex.slice(0, 7)}${Math.round(value * 255).toString(16).padStart(2, '0')}`;

export function planRowSelectedPaint(g: GlassTokens) {
  const plate = paywallPlateBg(g);
  const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];
  const backgrounds = [plate, ...gradient.map((stop) => flattenOver(stop, plate))];
  return {
    gradient,
    backgrounds,
    edge: g.accentGraphic,
    glow: alpha(g.accent, 0.18),
    ink: legibleOn(g.text, g.text, backgrounds, 4.55),
    trialInk: legibleOn(g.accentTextSafe, g.text, backgrounds, 4.55),
    secondaryInk: legibleOn(g.secondary, g.text, backgrounds, 4.55),
    mutedInk: legibleOn(g.mutedText, g.text, backgrounds, 4.55),
  };
}
