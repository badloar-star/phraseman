// use_streak_colors.ts — цвета графики моментов серии из токенов текущей темы: акцент для графики (на светлом — тёмный, ≥ 3 : 1), второй цвет темы, золото.
// зачем (гейт паритета, круг 1, 14.10): кольцо года на светлой теме обязано быть тёмно-зелёным, а три кольца «Сегодня» — разных цветов (мятный, фиолетовый, золотой); всё из токенов темы.
import { useMemo } from 'react';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { streakSecondColor } from './streak_stage_colors';

export type StreakColors = Readonly<{ accent: string; second: string; gold: string; text: string }>;

/** Цвета колец = цвета отметок строк: акцент темы, второй цвет, золото темы (образец: --acc, --r2, --r3). Чистая функция — живёт здесь, чтобы Главная не тянула тяжёлый TodayRings ради неё. */
export function todayRingColors(c: Readonly<{ accent: string; second: string; gold: string }>): readonly [string, string, string] {
  return [c.accent, c.second, c.gold];
}

/** `enabled=false` (флаг moments_v3 выключен): ничего не считаем — холодный старт и рендеры Главной не платят за цвета колец. */
export function useStreakColors(): StreakColors;
export function useStreakColors(enabled: boolean): StreakColors | null;
export function useStreakColors(enabled: boolean = true): StreakColors | null {
  const { liquidGlassThemeId } = useTheme();
  const p = useSpirePalette();
  return useMemo(() => {
    if (!enabled) return null;
    const g = liquidGlassTokens(liquidGlassThemeId);
    const accent = g.accentGraphic ?? g.accent;
    return { accent, second: streakSecondColor({ themeId: liquidGlassThemeId, accent, text: g.text, bg: g.bg, gold: p.gold }), gold: p.gold, text: g.text };
  }, [enabled, liquidGlassThemeId, p.gold]);
}
