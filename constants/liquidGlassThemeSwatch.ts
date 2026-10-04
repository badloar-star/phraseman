import { oklchToHex } from './liquidGlassColor';
import { LIQUID_GLASS_VIVID } from './liquidGlassThemeVariants';
import { liquidGlassGradientTheme } from './liquidGlassGradientThemes';

export type ThemeSwatchStops = ReadonlyArray<readonly [number, string]>;
export type ThemeSwatchSpec = Readonly<{ kind: 'linear'; stops: ThemeSwatchStops } | { kind: 'radial'; cx: string; cy: string; stops: ThemeSwatchStops }>;

/**
 * Кружок темы на экране «Темы» — формулы `swatch()` / `calmSwatch()` из макета
 * themes-v2-proposals.js. зачем (владелец 30.09): в «Спокойно» кружки приглушённые,
 * но узнаваемые (иначе 13 тем не различить); в «Акценте/Максимуме» — фактура семейства.
 */
export function themeSwatchSpec(id: string, vivid: boolean): ThemeSwatchSpec {
  // зачем (владелец 04.10, themes-gradient.html): кружок градиентной темы — два её пятна
  // по диагонали (как фишка темы в макете), при любой насыщенности.
  const gradient = liquidGlassGradientTheme(id);
  if (gradient) return { kind: 'linear', stops: [[0, gradient.glowA], [1, gradient.glowB]] };
  const v = LIQUID_GLASS_VIVID[id] ?? LIQUID_GLASS_VIVID.graphite!;
  const { fam, h, h2, c } = v;
  const ok = (l: number, ch: number, hue = h) => oklchToHex(l, ch, hue);
  if (!vivid) return { kind: 'radial', cx: '35%', cy: '30%', stops: [[0, ok(0.84, c * 0.45 + 0.01)], [1, ok(0.62, c * 0.6 + 0.01)]] };
  if (fam === 'nature') return { kind: 'linear', stops: [[0, ok(0.80, c)], [1, ok(0.79, c, h2)]] };
  if (fam === 'metal') {
    return { kind: 'linear', stops: [[0, ok(0.93, c * 0.55)], [0.45, ok(0.74, c)], [0.7, ok(0.90, c * 0.6, h2)], [1, ok(0.70, c)]] };
  }
  if (fam === 'night') return { kind: 'radial', cx: '35%', cy: '30%', stops: [[0, ok(0.90, c * 0.6)], [0.7, ok(0.72, c)], [1, ok(0.72, c)]] };
  return { kind: 'radial', cx: '35%', cy: '28%', stops: [[0, ok(0.90, c * 0.7)], [0.62, ok(0.66, c)], [1, ok(0.45, c)]] };
}
