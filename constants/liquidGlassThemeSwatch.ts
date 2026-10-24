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
  // Особые темы должны читаться по своему акценту уже в списке. Два тёмных
  // фоновых stop-а делали аметист, титан и сингулярность почти одинаковыми.
  const premiumStops: Readonly<Record<string, ThemeSwatchStops>> = Object.freeze({
    grad_full_olive: [[0, '#E0EAA8'], [0.46, '#778624'], [1, '#151E10']],
    grad_full_ref_signal_lime: [[0, '#D6FF72'], [0.42, '#638E18'], [1, '#020406']],
    grad_full_ref_storm_violet: [[0, '#E3B0FF'], [0.45, '#742FA5'], [1, '#07050B']],
    grad_full_titanium: [[0, '#FF766C'], [0.45, '#5D636B'], [1, '#0A0C0F']],
    grad_full_horizon: [[0, '#FFC487'], [0.43, '#225F8E'], [1, '#060E1A']],
    grad_full_ref_gravity_blue: [[0, '#9BE7FF'], [0.42, '#155D74'], [1, '#020406']],
  });
  const premium = premiumStops[id];
  if (premium) return { kind: 'linear', stops: premium };
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
