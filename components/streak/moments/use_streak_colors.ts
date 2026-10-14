// use_streak_colors.ts — цвета графики моментов серии из токенов текущей темы: акцент для графики (на светлом — тёмный, ≥ 3 : 1), второй цвет темы, золото.
// зачем (гейт паритета, круг 1, 14.10): кольцо года на светлой теме обязано быть тёмно-зелёным, а три кольца «Сегодня» — разных цветов (мятный, фиолетовый, золотой); всё из токенов темы.
import { useMemo } from 'react';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { useSpirePalette } from '../../spire/useSpirePalette';
import { streakSecondColor } from './streak_stage_colors';

export type StreakColors = Readonly<{ accent: string; second: string; gold: string; text: string }>;

export function useStreakColors(): StreakColors {
  const { liquidGlassThemeId } = useTheme();
  const p = useSpirePalette();
  return useMemo(() => {
    const g = liquidGlassTokens(liquidGlassThemeId);
    const accent = g.accentGraphic ?? g.accent;
    return { accent, second: streakSecondColor({ themeId: liquidGlassThemeId, accent, text: g.text, bg: g.bg, gold: p.gold }), gold: p.gold, text: g.text };
  }, [liquidGlassThemeId, p.gold]);
}
