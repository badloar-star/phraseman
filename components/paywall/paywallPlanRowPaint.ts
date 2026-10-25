import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { flattenOver, legibleOn } from '../../constants/liquidGlassSurfaceRoles';
import { paywallPlateBg } from './paywall_surfaces';

const alpha = (hex: string, value: number): string => `${hex.slice(0, 7)}${Math.round(value * 255).toString(16).padStart(2, '0')}`;

export function planRowSelectedPaint(g: GlassTokens) {
  const plate = paywallPlateBg(g);
  const gradient: readonly [string, string] = [alpha(g.accent, 0.3), alpha(plate, 0.9)];
  const backgrounds = [plate, ...gradient.map((stop) => flattenOver(stop, plate))];
  // зачем (Ревизор 25.10, paywall_plan_rows_contrast): у «Оливковой» в тёмном текст коллекции #FFF9F6 на оливковой подложке выбранного плана — 4,4;
  // доводить к самому тексту темы уже некуда, поэтому в тёмном оформлении подписи доводятся к чистому белому (4,59), в светлом — к тексту, как было
  const toward = g.isLight ? g.text : '#FFFFFF'; // theme-exempt: крайняя точка доводки подписи в тёмном
  return {
    gradient,
    backgrounds,
    edge: g.accentGraphic,
    glow: alpha(g.accent, 0.18),
    ink: legibleOn(g.text, toward, backgrounds, 4.55),
    trialInk: legibleOn(g.accentTextSafe, toward, backgrounds, 4.55),
    secondaryInk: legibleOn(g.secondary, toward, backgrounds, 4.55),
    mutedInk: legibleOn(g.mutedText, toward, backgrounds, 4.55),
  };
}
