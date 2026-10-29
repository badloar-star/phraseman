// ═══════════════════════════════════════════════════════════════════════════
// story_theme_sphere.ts — цвета круга темы в кадре «Новая тема» (макет stories-templates-v1.html, .swatch .core).
//
// зачем (координатор 29.10, вариант «а», макет утверждён строго): в макете «Титан» — серебряный круг #DDE1E8 → #5E6570, а кадр брал акцент
// темы (у титана коралловый #FF665B). Круг показывает «материал» темы: светлая поверхность (premiumThemeVisualSpecs.light[0]) → середина
// её кружка на экране «Темы». Титан выходит #E0E3E5 → #5D636B — как в макете. Цвета — только из каталогов тем, без «жёстких» значений.
// ═══════════════════════════════════════════════════════════════════════════
import { themeSwatchSpec } from '../../../constants/liquidGlassThemeSwatch';
import { premiumThemeVisualSpec } from '../../../constants/premiumThemeVisualSpecs';

export type ThemeSphereColors = Readonly<{ a: string; b: string }>;

/** Цвета круга для особой темы; null — не особая тема (кадр берёт запасные цвета). */
export function themeSphereColors(themeId: string): ThemeSphereColors | null {
  const spec = premiumThemeVisualSpec(themeId);
  if (!spec) return null;
  const stops = themeSwatchSpec(themeId, true).stops;
  const mid = stops[Math.floor(stops.length / 2)]?.[1];
  return mid ? { a: spec.light[0], b: mid } : null;
}
