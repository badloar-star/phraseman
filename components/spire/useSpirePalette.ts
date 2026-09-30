import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { getV2Palette, type V2Palette } from '../../constants/v2Style';

// зачем (владелец 2026-09-30, community.html «Шпиль»): экраны Шпиля переносятся 1 в 1 на Liquid Glass.
// Оставляем прежние имена полей палитры (p.text, p.card…), чтобы разметка не менялась, но значения
// берём из токенов стекла активной темы: плоские непрозрачные плиты, светлый текст, кромка — line.
// Цвета «верно/неверно» (correct/wrong) остаются из V2-палитры — это смысловые цвета, не тон темы.
export function useSpirePalette(): V2Palette {
  const { theme, themeMode, liquidGlassThemeId } = useTheme();
  return useMemo(() => {
    const base = getV2Palette(theme, themeMode);
    const g = liquidGlassTokens(liquidGlassThemeId);
    return {
      ...base,
      bg: g.bg,
      bgTop: g.bgTop,
      card: g.opaqueCard,
      cardRaised: g.opaqueControl,
      control: g.opaqueControl,
      hairline: g.line,
      divider: g.line,
      text: g.text,
      textSecondary: g.secondary,
      textMuted: g.mutedText,
      cta: g.cta,
      ctaText: g.ctaInk,
    };
  }, [theme, themeMode, liquidGlassThemeId]);
}
