import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { DARK, NEON, GOLD, CORAL, MINIMAL_DARK, MINIMAL_LIGHT, COMPASS, Theme, ThemeMode } from '../constants/theme';
import { goldShadow } from '../constants/goldTheme';
import { compassShadow } from '../constants/compassTheme';
import { computeUiScale } from '../constants/layout-scale';
import { DEV_MODE, ENABLE_DEV_TOOLS } from '../app/config';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { onAppEvent } from '../app/events';
import { hasLeagueGoldThemeReward } from '../app/services/league_chest_rewards';
import { setOskolokThemeMode } from '../app/oskolok';
import { APP_FONT_FAMILY } from '../app/typography';

// ─── ШКАЛА ШРИФТОВ ──────────────────────────────────────────────────────────
// Duolingo использует ~16px для основного текста, ~14px для вторичного
// Мы делаем 4 уровня с множителями

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SCALE: Record<FontSize, number> = {
  small:  1.0,   // маленький
  medium: 1.15,  // стандарт
  large:  1.30,  // большой
};

export const FONT_SIZE_LABELS: Record<FontSize, {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}> = {
  small: {
    ru: 'Маленький',
    uk: 'Маленький',
    es: 'Pequeño',
    'pt-BR': 'Pequeno',
    vi: 'Nhỏ',
    id: 'Kecil',
    tr: 'Küçük',
    pl: 'Mały',
  },
  medium: {
    ru: 'Средний',
    uk: 'Середній',
    es: 'Mediano',
    'pt-BR': 'Médio',
    vi: 'Vừa',
    id: 'Sedang',
    tr: 'Orta',
    pl: 'Średni',
  },
  large: {
    ru: 'Большой',
    uk: 'Великий',
    es: 'Grande',
    'pt-BR': 'Grande',
    vi: 'Lớn',
    id: 'Besar',
    tr: 'Büyük',
    pl: 'Duży',
  },
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
  if (themeMode === 'gold') return goldShadow(level);
  if (themeMode === 'compass') return compassShadow(level);
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
  isGoldThemeUnlocked: boolean;
  toggle:       () => void;  // cycles available app themes
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
  isGoldThemeUnlocked: false,
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
    fontFamily: APP_FONT_FAMILY,
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
  coral: CORAL,
  minimalLight: MINIMAL_LIGHT,
  minimalDark: MINIMAL_DARK,
  compass: COMPASS,
};
const CYCLE: ThemeMode[] = ['minimalLight', 'minimalDark', 'compass', 'dark', 'neon', 'coral', 'gold'];
/** Темы только с Premium; бесплатные: `minimalDark`, `minimalLight` и `compass`. */
const PREMIUM_ONLY_THEMES: ThemeMode[] = ['dark', 'neon', 'coral'];
const DEV_THEME_UNLOCKS = DEV_MODE || ENABLE_DEV_TOOLS;

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { width: layoutW, height: layoutH } = useWindowDimensions();
  const uiScale = useMemo(() => computeUiScale(layoutW, layoutH), [layoutW, layoutH]);

  const [themeMode, setThemeModeState] = useState<ThemeMode>('minimalDark');
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');
  const [goldThemeUnlocked, setGoldThemeUnlocked] = useState(false);
  setOskolokThemeMode(themeMode);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pairs = await AsyncStorage.multiGet(['app_theme', 'app_font_size']);
      const themeStr = pairs[0]?.[1] ?? null;
      const fontStr = pairs[1]?.[1] ?? null;
      // Тот же смысл, что PremiumProvider: не опираться только на raw premium_active (RC/грейс/оверрайды).
      const [isPremium, hasGoldReward] = await Promise.all([
        getVerifiedPremiumStatus(),
        hasLeagueGoldThemeReward(),
      ]);
      if (cancelled) return;
      setGoldThemeUnlocked(hasGoldReward);
      // Миграция: ocean/sakura больше не поддерживаются → заменяем на dark
      let migrated = themeStr;
      if (themeStr === 'ocean' || themeStr === 'sakura') {
        migrated = 'dark';
        void AsyncStorage.setItem('app_theme', 'dark');
      }
      if (themeStr === 'gold' && !hasGoldReward && !DEV_THEME_UNLOCKS) {
        migrated = 'coral';
        void AsyncStorage.setItem('app_theme', 'coral');
      }
      const valid =
        migrated === 'neon' || migrated === 'dark' || migrated === 'gold' || migrated === 'coral' || migrated === 'minimalLight' || migrated === 'minimalDark' || migrated === 'compass';
      if (valid) {
        const t = migrated as ThemeMode;
        const goldLocked = t === 'gold' && !hasGoldReward && !DEV_THEME_UNLOCKS;
        if ((!isPremium && !DEV_THEME_UNLOCKS && PREMIUM_ONLY_THEMES.includes(t)) || goldLocked) {
          setThemeModeState('minimalDark');
          void AsyncStorage.setItem('app_theme', 'minimalDark');
        } else {
          setThemeModeState(t);
        }
      } else {
        const defaultThemeMode: ThemeMode = 'minimalDark';
        setThemeModeState(defaultThemeMode);
        void AsyncStorage.setItem('app_theme', defaultThemeMode);
      }
      if (fontStr && fontStr in FONT_SCALE) setFontSizeState(fontStr as FontSize);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subGold = onAppEvent('gold_theme_unlocked', () => {
      setGoldThemeUnlocked(true);
    });
    const subCloud = onAppEvent('cloud_profile_hydrated', () => {
      void hasLeagueGoldThemeReward().then(setGoldThemeUnlocked).catch(() => {});
    });
    return () => {
      subGold.remove();
      subCloud.remove();
    };
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    if (m === 'gold' && !goldThemeUnlocked && !DEV_THEME_UNLOCKS) return;
    setThemeModeState(m);
    void AsyncStorage.setItem('app_theme', m);
  }, [goldThemeUnlocked]);

  const toggle = useCallback(() => {
    setThemeModeState(m => {
      const cycle = CYCLE.filter(mode => mode !== 'gold' || goldThemeUnlocked || DEV_THEME_UNLOCKS);
      const next = cycle[(cycle.indexOf(m) + 1) % cycle.length] ?? 'minimalDark';
      void AsyncStorage.setItem('app_theme', next);
      return next;
    });
  }, [goldThemeUnlocked]);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    void AsyncStorage.setItem('app_font_size', s);
  }, []);

  const f = useMemo(
    () => createFonts(FONT_SCALE[fontSize] * uiScale),
    [fontSize, uiScale],
  );
  const theme = useMemo(() => THEME_MAP[themeMode], [themeMode]);
  const isDark = themeMode === 'dark' || themeMode === 'neon' || themeMode === 'gold' || themeMode === 'coral' || themeMode === 'minimalDark' || themeMode === 'compass';
  const statusBarLight = isDark;
  const ds = useMemo(() => {
    const px = (n: number) => Math.max(2, Math.round(n * uiScale));
    const isLuxuryTheme = themeMode === 'gold';
    const isCompassTheme = themeMode === 'compass';
    const radiusBase = isLuxuryTheme || isCompassTheme
      ? { md: 10, lg: 12, xl: 14, xxl: 18 }
      : { md: 12, lg: 16, xl: 20, xxl: 24 };
    return {
      spacing: { xs: px(4), sm: px(8), md: px(12), lg: px(16), xl: px(24), xxl: px(32) },
      radius: { md: px(radiusBase.md), lg: px(radiusBase.lg), xl: px(radiusBase.xl), xxl: px(radiusBase.xxl) },
      inputHeight: Math.max(44, px(52)),
      buttonHeight: Math.max(44, px(52)),
      fontFamily: APP_FONT_FAMILY,
      shadow: {
        soft: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(1, px(isLuxuryTheme ? 4 : isCompassTheme ? 3 : 2)) },
          shadowOpacity: isLuxuryTheme ? 0.42 : isCompassTheme ? 0.30 : isDark ? 0.22 : 0.1,
          shadowRadius: isLuxuryTheme ? Math.max(8, px(12)) : isCompassTheme ? Math.max(6, px(9)) : Math.max(4, px(8)),
          elevation: Math.max(1, px(isLuxuryTheme ? 5 : isCompassTheme ? 3 : 2)),
        },
        medium: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(2, px(isLuxuryTheme ? 8 : 6)) },
          shadowOpacity: isLuxuryTheme ? 0.56 : isCompassTheme ? 0.36 : isDark ? 0.28 : 0.14,
          shadowRadius: isLuxuryTheme ? Math.max(14, px(22)) : isCompassTheme ? Math.max(10, px(16)) : Math.max(8, px(16)),
          elevation: Math.max(2, px(isLuxuryTheme ? 10 : isCompassTheme ? 7 : 6)),
        },
      },
    };
  }, [uiScale, isDark, themeMode]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      isDark,
      statusBarLight,
      themeMode,
      isGoldThemeUnlocked: goldThemeUnlocked,
      toggle,
      setThemeMode,
      fontSize,
      setFontSize,
      uiScale,
      f,
      ds,
    }),
    [theme, isDark, statusBarLight, themeMode, goldThemeUnlocked, toggle, setThemeMode, fontSize, setFontSize, uiScale, f, ds],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
