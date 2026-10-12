import { glassTone } from '../components/dialogs/glass/glassTone';
import type { GlassTokens } from './liquidGlassThemePalette';

// зачем (координатор 12.10, R1_THEMEMODE_LEGACY_MAP): statsThemeChrome.ts выбирает цвет по прежнему themeMode (в приложении он всегда 'dark' → зелёный
// #47C870 на любой теме). Здесь те же роли (акцент, поле страницы, мягкая подложка, линия, свечение) строятся из токенов Liquid Glass.
// Таблицы statsThemeChrome.ts не тронуты (запись «БЫЛО»); подключение в ActivityHeatmap365.tsx — владельцу экрана.

type Strength = 'quiet' | 'normal' | 'strong';

const SOFT_ALPHA: Record<Strength, number> = { quiet: 0.08, normal: 0.13, strong: 0.18 };
const BORDER_ALPHA = { soft: 0.35, medium: 0.48, strong: 0.72 } as const;

/** Акцент статистики: заливка/линия — accent, а не текстовый accentText. */
export function statsAccentFromTokens(t: GlassTokens): string {
  // зачем (светлый акцент 13.10): заливка/линия статистики — графика, accentGraphic (в тёмном и там, где accent виден, равен accent)
  return t.accentGraphic;
}

/** Фон страницы статистики: на тон отличается от общего фона, чтобы карточки без обводок читались. */
export function statsPageFieldFromTokens(t: GlassTokens): string {
  return t.opaqueSheet;
}

export function statsSoftBgFromTokens(t: GlassTokens, strength: Strength = 'normal'): string {
  return glassTone(t.accent, SOFT_ALPHA[strength]);
}

export function statsBorderFromTokens(t: GlassTokens, strength: keyof typeof BORDER_ALPHA = 'medium'): string {
  return glassTone(t.accent, BORDER_ALPHA[strength]);
}

export function statsHairlineFromTokens(t: GlassTokens): string {
  return glassTone(t.accent, 0.24);
}

export function statsGlowStyleFromTokens(t: GlassTokens, strength: 'soft' | 'medium' = 'soft') {
  return {
    shadowColor: t.isLight ? t.shadowTint : t.accent,
    shadowOpacity: strength === 'medium' ? 0.22 : 0.14,
    shadowRadius: strength === 'medium' ? 12 : 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: strength === 'medium' ? 5 : 3,
  };
}
