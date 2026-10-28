// use_aha_theme.ts — палитра онбординга «ага» текущей темы (см. aha_theme.ts). Перекрашивается сразу, как только выбрана другая тема.
import { useEffect, useMemo } from 'react';

import { logSceneTheme } from '../home/v2/scene/scene_theme_log';
import { useTheme } from '../ThemeContext';
import { ahaThemeFor, type AhaTheme } from './aha_theme';

export function useAhaTheme(): AhaTheme {
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const theme = useMemo(() => ahaThemeFor(liquidGlassThemeId, liquidGlassAppearance), [liquidGlassThemeId, liquidGlassAppearance]);
  // зачем (владелец 28.10, закон «сперва логи»): какими цветами и откуда нарисован онбординг «ага» — один поиск [SCENE-THEME]
  useEffect(() => {
    logSceneTheme('onboarding_aha', liquidGlassThemeId, liquidGlassAppearance, 'ahaThemeFor(homeSceneTokensForTheme)', { top: theme.bgGradient[0], bottom: theme.bgGradient[1], accent: theme.chipSelectedBorder, cta: theme.ctaGradient[1] });
  }, [theme, liquidGlassThemeId, liquidGlassAppearance]);
  return theme;
}

/**
 * Кэш стилей по объекту палитры: StyleSheet считается один раз на тему, а не на каждый экземпляр компонента (чипы, слова, точки).
 * Палитра `ahaThemeFor` — один замороженный объект на (тема, оформление), поэтому ключ WeakMap стабилен.
 */
export function ahaStylesCache<S>(make: (T: AhaTheme) => S): (T: AhaTheme) => S {
  const cache = new WeakMap<AhaTheme, S>();
  return (T) => {
    const hit = cache.get(T);
    if (hit) return hit;
    const next = make(T);
    cache.set(T, next);
    return next;
  };
}
