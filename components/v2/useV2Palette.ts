import { useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { getV2Palette, type V2Palette } from '../../constants/v2Style';

/** Палитра нового стиля 2.0 для текущей темы (кэшируется в getV2Palette). */
export function useV2Palette(): V2Palette {
  const { theme, themeMode } = useTheme();
  return useMemo(() => getV2Palette(theme, themeMode), [theme, themeMode]);
}
