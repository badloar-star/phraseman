import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { DARK, GOLD, OLIVE, MIDNIGHT, EMBER, AURORA, VOLT, INDIGO, SAGE_PORCELAIN, Theme, ThemeMode, isLightThemeMode } from '../constants/theme';
import { sagePorcelainShadow } from '../constants/sagePorcelainChrome';
import { goldShadow } from '../constants/goldTheme';
import { oliveShadow } from '../constants/oliveTheme';
import { cinemaShadow, isCinemaMode } from '../constants/cinemaThemes';
import { computeUiScale } from '../constants/layout-scale';
import { DEV_MODE, ENABLE_DEV_TOOLS } from '../app/config';
import { getVerifiedPremiumStatus } from '../app/premium_guard';
import {
  isSelectableThemeMode,
  isThemePlusOnly,
  SELECTABLE_THEME_MODES,
} from '../app/theme_access_policy';
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
  if (themeMode === 'olive') return oliveShadow(level);
  if (themeMode === 'sagePorcelain') return sagePorcelainShadow(level);
  if (isCinemaMode(themeMode)) return cinemaShadow(level);
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
  /**
   * «Примерочная» (экран «Темы»): применённая тема без учёта примерки.
   * `themeMode` выше — эффективная (примеряемая ?? применённая): её читают все
   * потребители, поэтому тап по теме мгновенно перекрашивает весь экран.
   */
  appliedThemeMode: ThemeMode;
  /** Примеряемая тема; null — примерка выключена. НЕ персистится и не проходит премиум-замок применения. */
  previewThemeMode: ThemeMode | null;
  setPreviewThemeMode: (m: ThemeMode | null) => void;
  isGoldThemeUnlocked: boolean;
  /** «Дедушка»: юзер жил на бесплатной «Полночи» до её ухода в премиум — тема остаётся ему доступной. */
  isMidnightGrandfathered: boolean;
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
  appliedThemeMode: 'dark',
  previewThemeMode: null,
  setPreviewThemeMode: () => {},
  isGoldThemeUnlocked: false,
  isMidnightGrandfathered: false,
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
  gold: GOLD,
  olive: OLIVE,
  midnight: MIDNIGHT,
  ember: EMBER,
  aurora: AURORA,
  volt: VOLT,
  indigo: INDIGO,
  sagePorcelain: SAGE_PORCELAIN,
};
const CYCLE: ThemeMode[] = [...SELECTABLE_THEME_MODES];
/** Standard access comes from theme_access_policy; `gold` is unlocked only by reward. */
// зачем: бесплатные темы-витрины — «Индиго» и «Нефрит» (выбор владельца);
// «Полночь» ушла в премиум, но у старых бесплатных юзеров не отбирается —
// см. флаг-«дедушка» MIDNIGHT_GRANDFATHER_KEY.
const DEV_THEME_UNLOCKS = DEV_MODE || ENABLE_DEV_TOOLS;
const DEFAULT_THEME_MODE: ThemeMode = 'indigo';
const MIDNIGHT_GRANDFATHER_KEY = 'app_theme_midnight_grandfather';
// business/businessLight удалены из выбора (2026-07-02): пользователю не зашли.
// vanilla удалена полностью (2026-07-25): владелец решил снять светлую тему из выбора.
const REMOVED_THEME_MODES = new Set(['neon', 'minimalLight', 'compass', 'business', 'businessLight', 'vanilla', 'minimalDark', 'candyBlue', 'coral']);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { width: layoutW, height: layoutH } = useWindowDimensions();
  const windowUiScale = useMemo(() => computeUiScale(layoutW, layoutH), [layoutW, layoutH]);

  const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  // зачем: «Примерочная» на экране «Тем» — фри-юзер по тапу видит ЛЮБУЮ тему вживую,
  // применение остаётся под замком setThemeMode. Не персистится, сбрасывается при
  // выходе с экрана тем (cleanup на unmount экрана).
  const [previewThemeMode, setPreviewThemeMode] = useState<ThemeMode | null>(null);
  const effectiveThemeMode = previewThemeMode ?? themeMode;
  const uiScale = windowUiScale;
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');
  const [goldThemeUnlocked, setGoldThemeUnlocked] = useState(false);
  const [premiumThemeAccess, setPremiumThemeAccess] = useState(false);
  const [midnightGrandfathered, setMidnightGrandfathered] = useState(false);

  useEffect(() => {
    // зачем: осколки-виджет красится эффективной темой — примерка честная везде,
    // при сбросе превью эффект вернёт применённую тему.
    setOskolokThemeMode(effectiveThemeMode);
  }, [effectiveThemeMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pairs = await AsyncStorage.multiGet(['app_theme', 'app_font_size', MIDNIGHT_GRANDFATHER_KEY]);
      const themeStr = pairs[0]?.[1] ?? null;
      const fontStr = pairs[1]?.[1] ?? null;
      // зачем: «Полночь» стала премиум, но кто уже жил на ней бесплатно —
      // получает пожизненный флаг-«дедушка» и не теряет тему после апдейта.
      const grandfathered = pairs[2]?.[1] === '1' || themeStr === 'midnight';
      if (grandfathered && pairs[2]?.[1] !== '1') {
        void AsyncStorage.setItem(MIDNIGHT_GRANDFATHER_KEY, '1');
      }
      // Тот же смысл, что PremiumProvider: не опираться только на raw premium_active (RC/грейс/оверрайды).
      const [isPremium, hasGoldReward] = await Promise.all([
        getVerifiedPremiumStatus(),
        hasLeagueGoldThemeReward(),
      ]);
      if (cancelled) return;
      setPremiumThemeAccess(isPremium);
      setGoldThemeUnlocked(hasGoldReward);
      setMidnightGrandfathered(grandfathered);
      // Миграция: ocean/sakura больше не поддерживаются → заменяем на dark
      let migrated = themeStr;
      if (themeStr === 'ocean' || themeStr === 'sakura') {
        migrated = 'dark';
        void AsyncStorage.setItem('app_theme', 'dark');
      }
      if (themeStr && REMOVED_THEME_MODES.has(themeStr)) {
        migrated = DEFAULT_THEME_MODE;
        void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);
      }
      if (themeStr === 'gold' && !hasGoldReward && !DEV_THEME_UNLOCKS) {
        migrated = DEFAULT_THEME_MODE;
        void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);
      }
      const valid = isSelectableThemeMode(migrated);
      if (valid) {
        const t = migrated as ThemeMode;
        const goldLocked = t === 'gold' && !hasGoldReward && !DEV_THEME_UNLOCKS;
        // «Полночь» у «дедушки» премиум-замком не считается.
        const premiumLocked = isThemePlusOnly(t) && !(t === 'midnight' && grandfathered);
        if ((!isPremium && !DEV_THEME_UNLOCKS && premiumLocked) || goldLocked) {
          setThemeModeState(DEFAULT_THEME_MODE);
          void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);
        } else {
          setThemeModeState(t);
        }
      } else {
        setThemeModeState(DEFAULT_THEME_MODE);
        void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);
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
    if (m === 'midnight' && midnightGrandfathered) {
      // «Дедушка»: старый бесплатный юзер «Полночи» может вернуться на неё всегда.
      setThemeModeState(m);
      void AsyncStorage.setItem('app_theme', m);
      return;
    }
    if (!DEV_THEME_UNLOCKS && isThemePlusOnly(m) && !premiumThemeAccess) {
      void getVerifiedPremiumStatus()
        .then((isPremium) => {
          setPremiumThemeAccess(isPremium);
          const next = isPremium ? m : DEFAULT_THEME_MODE;
          setThemeModeState(next);
          void AsyncStorage.setItem('app_theme', next);
        })
        .catch(() => {
          setThemeModeState(DEFAULT_THEME_MODE);
          void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);
        });
      return;
    }
    setThemeModeState(m);
    void AsyncStorage.setItem('app_theme', m);
  }, [goldThemeUnlocked, premiumThemeAccess, midnightGrandfathered]);

  const toggle = useCallback(() => {
    setThemeModeState(m => {
      const cycle = CYCLE.filter((mode) => {
        if (mode === 'gold') return goldThemeUnlocked || DEV_THEME_UNLOCKS;
        if (mode === 'midnight' && midnightGrandfathered) return true;
        if (isThemePlusOnly(mode)) return premiumThemeAccess || DEV_THEME_UNLOCKS;
        return true;
      });
      const next = cycle[(cycle.indexOf(m) + 1) % cycle.length] ?? DEFAULT_THEME_MODE;
      void AsyncStorage.setItem('app_theme', next);
      return next;
    });
  }, [goldThemeUnlocked, premiumThemeAccess, midnightGrandfathered]);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    void AsyncStorage.setItem('app_font_size', s);
  }, []);

  const f = useMemo(
    () => createFonts(FONT_SCALE[fontSize] * uiScale),
    [fontSize, uiScale],
  );
  const theme = useMemo(() => THEME_MAP[effectiveThemeMode], [effectiveThemeMode]);
  const isDark = !isLightThemeMode(effectiveThemeMode);
  const statusBarLight = isDark;
  const ds = useMemo(() => {
    const px = (n: number) => Math.max(2, Math.round(n * uiScale));
    const isLuxuryTheme = effectiveThemeMode === 'gold';
    const radiusBase = isLuxuryTheme
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
          shadowOffset: { width: 0, height: Math.max(1, px(isLuxuryTheme ? 4 : 2)) },
          shadowOpacity: isLuxuryTheme ? 0.42 : isDark ? 0.22 : 0.1,
          shadowRadius: isLuxuryTheme ? Math.max(8, px(12)) : Math.max(4, px(8)),
          elevation: Math.max(1, px(isLuxuryTheme ? 5 : 2)),
        },
        medium: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(2, px(isLuxuryTheme ? 8 : 6)) },
          shadowOpacity: isLuxuryTheme ? 0.56 : isDark ? 0.28 : 0.14,
          shadowRadius: isLuxuryTheme ? Math.max(14, px(22)) : Math.max(8, px(16)),
          elevation: Math.max(2, px(isLuxuryTheme ? 10 : 6)),
        },
      },
    };
  }, [uiScale, isDark, effectiveThemeMode]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      isDark,
      statusBarLight,
      // зачем: наружу уходит эффективная тема (примерка ?? применённая) — так весь
      // экран перекрашивается мгновенно; применённая доступна как appliedThemeMode.
      themeMode: effectiveThemeMode,
      appliedThemeMode: themeMode,
      previewThemeMode,
      setPreviewThemeMode,
      isGoldThemeUnlocked: goldThemeUnlocked,
      isMidnightGrandfathered: midnightGrandfathered,
      toggle,
      setThemeMode,
      fontSize,
      setFontSize,
      uiScale,
      f,
      ds,
    }),
    [theme, isDark, statusBarLight, effectiveThemeMode, themeMode, previewThemeMode, goldThemeUnlocked, midnightGrandfathered, toggle, setThemeMode, fontSize, setFontSize, uiScale, f, ds],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
