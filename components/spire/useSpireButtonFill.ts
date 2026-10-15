import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

/**
 * зачем (координатор 15.10, аудит кнопок, правило владельца 13.10 «кнопки не сливаются»):
 * заливка вторичной плашки-кнопки окон моментов — buttonFill активной темы (прежний control = opaqueControl давал 1,00–1,28 : 1 к шторке).
 */
export function useSpireButtonFill(): string {
  const { liquidGlassThemeId } = useTheme();
  return useMemo(() => liquidGlassTokens(liquidGlassThemeId).buttonFill, [liquidGlassThemeId]);
}
