import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, NEON, GOLD, Theme, ThemeMode } from '../constants/theme';

// ─── ШКАЛА ШРИФТОВ ──────────────────────────────────────────────────────────
// Duolingo использует ~16px для основного текста, ~14px для вторичного
// Мы делаем 4 уровня с множителями

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SCALE: Record<FontSize, number> = {
  small:  1.0,   // маленький
  medium: 1.15,  // стандарт
  large:  1.30,  // большой
};

export const FONT_SIZE_LABELS: Record<FontSize, { ru: string; uk: string }> = {
  small:  { ru: 'Маленький', uk: 'Маленький' },
  medium: { ru: 'Средний',   uk: 'Середній'  },
  large:  { ru: 'Большой',   uk: 'Великий'   },
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
  themeMode:    ThemeMode;
  toggle:       () => void;  // cycles dark → light → neon → dark
  setThemeMode: (m: ThemeMode) => void;
  fontSize:     FontSize;
  setFontSize:  (s: FontSize) => void;
  f:            Fonts;   // готовые размеры шрифтов, использовать везде как f.body, f.h2 и тд
}

const ThemeContext = createContext<ThemeCtx>({
  theme:        DARK,
  isDark:       true,
  themeMode:    'dark',
  toggle:       () => {},
  setThemeMode: () => {},
  fontSize:     'medium',
  setFontSize:  () => {},
  f:            createFonts(FONT_SCALE.medium),
});

const THEME_MAP: Record<ThemeMode, Theme> = { dark: DARK, neon: NEON, gold: GOLD };
const CYCLE: ThemeMode[] = ['dark', 'neon', 'gold'];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('neon');
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('app_theme'),
      AsyncStorage.getItem('app_font_size'),
    ]).then(([themeVal, fontVal]) => {
      if (themeVal === 'neon' || themeVal === 'dark' || themeVal === 'gold') {
        setThemeModeState(themeVal as ThemeMode);
      }
      if (fontVal && fontVal in FONT_SCALE) setFontSizeState(fontVal as FontSize);
    });
  }, []);

  const setThemeMode = (m: ThemeMode) => {
    setThemeModeState(m);
    AsyncStorage.setItem('app_theme', m);
  };

  const toggle = () => {
    const next = CYCLE[(CYCLE.indexOf(themeMode) + 1) % CYCLE.length];
    setThemeMode(next);
  };

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    AsyncStorage.setItem('app_font_size', s);
  };

  const f = createFonts(FONT_SCALE[fontSize]);

  return (
    <ThemeContext.Provider value={{
      theme: THEME_MAP[themeMode],
      isDark: true,
      themeMode,
      toggle,
      setThemeMode,
      fontSize,
      setFontSize,
      f,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
