import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { DARK, NEON, GOLD, LIGHT_OCEAN, LIGHT_SAKURA, MINIMAL_DARK, MINIMAL_LIGHT, Theme, ThemeMode } from '../constants/theme';
import { computeUiScale } from '../constants/layout-scale';
import { DEV_MODE } from '../app/config';

// ─── ШКАЛА ШРИФТОВ ──────────────────────────────────────────────────────────
// Duolingo использует ~16px для основного текста, ~14px для вторичного
// Мы делаем 4 уровня с множителями

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SCALE: Record<FontSize, number> = {
  small:  1.0,   // маленький
  medium: 1.15,  // стандарт
  large:  1.30,  // большой
};

export const FONT_SIZE_LABELS: Record<FontSize, { ru: string; uk: string; es: string }> = {
  small:  { ru: 'Маленький', uk: 'Маленький', es: 'Pequeño' },
  medium: { ru: 'Средний',   uk: 'Середній',  es: 'Mediano' },
  large:  { ru: 'Большой',   uk: 'Великий',   es: 'Grande' },
};

// Базовые размеры шрифтов (при scale=1.0)
// Умножаем на FONT_SCALE[fontSize] чтобы получить реальный размер
export const BASE_FONTS = {
  // Заголовки
  h1:       22,   // имя пользователя, крупные заголовки
  h2:       18,   // заголовки экранов
  h3:       16,   // подзаголовки, названия уроков
  // Тело
  body:     14,   // основной текст (Duolingo ~16px, у нас 14 * 1.15 = 16.1)
  bodyLg:   16,   // крупный текст кнопок
  // Вторичный
  sub:      14,   // подписи, мета-инфо
  caption:  13,   // мелкие пометки
  // Лейблы
  label:    12,   // uppercase лейблы
  // Числа
  numLg:    28,   // streak, крупные числа
  numMd:    20,   // статистика
};

// Функция создания типографики с масштабированием
export const createFonts = (scale: number) => ({
  h1:      Math.round(BASE_FONTS.h1      * scale),
  h2:      Math.round(BASE_FONTS.h2      * scale),
  h3:      Math.round(BASE_FONTS.h3      * scale),
  body:    Math.round(BASE_FONTS.body    * scale),
  bodyLg:  Math.round(BASE_FONTS.bodyLg  * scale),
  sub:     Math.round(BASE_FONTS.sub     * scale),
  caption: Math.round(BASE_FONTS.caption * scale),
  label:   Math.round(BASE_FONTS.label   * scale),
  numLg:   Math.round(BASE_FONTS.numLg   * scale),
  numMd:   Math.round(BASE_FONTS.numMd   * scale),
});

export type Fonts = ReturnType<typeof createFonts>;

// ─── КОНТЕКСТ ────────────────────────────────────────────────────────────────

// ─── ОБЪЁМНЫЕ ТЕНИ (Volumetric / Neumorphic-style) ──────────────────────────
// Чистые направленные чёрные тени — без цветного свечения
// level 1 = лёгкий подъём   | level 2 = стандартный | level 3 = максимальный
//
export const getVolumetricShadow = (
  themeMode: ThemeMode,
  theme: Theme,
  level: 1 | 2 | 3 = 2,
) => {
  return {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: level === 1 ? 2 : level === 2 ? 3 : 5 },
    shadowOpacity: level === 1 ? 0.20 : level === 2 ? 0.32 : 0.45,
    shadowRadius:  level === 1 ? 4  : level === 2 ? 8  : 14,
    elevation:     level === 1 ? 3  : level === 2 ? 6  : 10,
  };
};

// Backward-compat обёртка (используется в legacy-коде через getCardShadow)
export const getCardShadow = (themeMode: ThemeMode, _shadowColor: string, theme?: Theme) => {
  if (theme) return getVolumetricShadow(themeMode, theme, 2);
  return {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius:  8,
    elevation:     6,
  };
};

interface ThemeCtx {
  theme:        Theme;
  isDark:       boolean;   // true when dark or neon (backward compat)
  /** Светлые иконки в status bar: тёмные темы + «глубокий» океан/сакура */
  statusBarLight: boolean;
  themeMode:    ThemeMode;
  toggle:       () => void;  // cycles dark → neon → gold → ocean → sakura
  setThemeMode: (m: ThemeMode) => void;
  fontSize:     FontSize;
  setFontSize:  (s: FontSize) => void;
  /** Множник розміру інтерфейсу від вікна (~0.82–1.22); шрифти f і ds вже помножені */
  uiScale:      number;
  f:            Fonts;   // готовые размеры шрифтов, использовать везде как f.body, f.h2 и тд
  ds: {
    spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
    radius: { md: number; lg: number; xl: number; xxl: number };
    inputHeight: number;
    buttonHeight: number;
    fontFamily: string;
    shadow: {
      soft: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
      medium: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number; elevation: number };
    };
  };
}

const ThemeContext = createContext<ThemeCtx>({
  theme:        DARK,
  isDark:       true,
  statusBarLight: true,
  themeMode:    'dark',
  toggle:       () => {},
  setThemeMode: () => {},
  fontSize:     'medium',
  setFontSize:  () => {},
  uiScale:      1,
  f:            createFonts(FONT_SCALE.medium),
  ds: {
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { md: 12, lg: 16, xl: 20, xxl: 24 },
    inputHeight: 52,
    buttonHeight: 52,
    fontFamily: 'System',
    shadow: {
      soft: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
      medium: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 6 },
    },
  },
});

const THEME_MAP: Record<ThemeMode, Theme> = {
  dark: DARK,
  neon: NEON,
  gold: GOLD,
  ocean: LIGHT_OCEAN,
  sakura: LIGHT_SAKURA,
  minimalLight: MINIMAL_LIGHT,
  minimalDark: MINIMAL_DARK,
};
const CYCLE: ThemeMode[] = ['minimalLight', 'minimalDark', 'dark', 'neon', 'gold', 'ocean', 'sakura'];
/** Темы только с Premium; бесплатные: `minimalDark` и `minimalLight`. */
const PREMIUM_ONLY_THEMES: ThemeMode[] = ['dark', 'neon', 'gold', 'ocean', 'sakura'];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { width: layoutW, height: layoutH } = useWindowDimensions();
  const uiScale = useMemo(() => computeUiScale(layoutW, layoutH), [layoutW, layoutH]);

  const [themeMode, setThemeModeState] = useState<ThemeMode>('minimalDark');
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('app_theme'),
      AsyncStorage.getItem('app_font_size'),
      AsyncStorage.getItem('premium_active'),
    ]).then(([themeVal, fontVal, premiumVal]) => {
      const isPremium = premiumVal === 'true';
      const valid =
        themeVal === 'neon' || themeVal === 'dark' || themeVal === 'gold' || themeVal === 'ocean' || themeVal === 'sakura' || themeVal === 'minimalLight' || themeVal === 'minimalDark';
      if (valid) {
        const t = themeVal as ThemeMode;
        if (!isPremium && !DEV_MODE && PREMIUM_ONLY_THEMES.includes(t)) {
          setThemeModeState('minimalDark');
          void AsyncStorage.setItem('app_theme', 'minimalDark');
        } else {
          setThemeModeState(t);
        }
      } else {
        const fallback: ThemeMode = 'minimalDark';
        setThemeModeState(fallback);
        void AsyncStorage.setItem('app_theme', fallback);
      }
      if (fontVal && fontVal in FONT_SCALE) setFontSizeState(fontVal as FontSize);
    });
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    void AsyncStorage.setItem('app_theme', m);
  }, []);

  const toggle = useCallback(() => {
    setThemeModeState(m => {
      const next = CYCLE[(CYCLE.indexOf(m) + 1) % CYCLE.length];
      void AsyncStorage.setItem('app_theme', next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    void AsyncStorage.setItem('app_font_size', s);
  }, []);

  const f = useMemo(
    () => createFonts(FONT_SCALE[fontSize] * uiScale),
    [fontSize, uiScale],
  );
  const theme = useMemo(() => THEME_MAP[themeMode], [themeMode]);
  const isDark = themeMode === 'dark' || themeMode === 'neon' || themeMode === 'gold' || themeMode === 'minimalDark';
  const statusBarLight = isDark || themeMode === 'ocean' || themeMode === 'sakura';
  const ds = useMemo(() => {
    const px = (n: number) => Math.max(2, Math.round(n * uiScale));
    return {
      spacing: { xs: px(4), sm: px(8), md: px(12), lg: px(16), xl: px(24), xxl: px(32) },
      radius: { md: px(12), lg: px(16), xl: px(20), xxl: px(24) },
      inputHeight: Math.max(44, px(52)),
      buttonHeight: Math.max(44, px(52)),
      fontFamily: 'System',
      shadow: {
        soft: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(1, px(2)) },
          shadowOpacity: isDark ? 0.22 : 0.1,
          shadowRadius: Math.max(4, px(8)),
          elevation: Math.max(1, px(2)),
        },
        medium: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(2, px(6)) },
          shadowOpacity: isDark ? 0.28 : 0.14,
          shadowRadius: Math.max(8, px(16)),
          elevation: Math.max(2, px(6)),
        },
      },
    };
  }, [uiScale, isDark]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      isDark,
      statusBarLight,
      themeMode,
      toggle,
      setThemeMode,
      fontSize,
      setFontSize,
      uiScale,
      f,
      ds,
    }),
    [theme, isDark, statusBarLight, themeMode, toggle, setThemeMode, fontSize, setFontSize, uiScale, f, ds],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
