import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWindowDimensions } from 'react-native';
import { DARK, Theme, ThemeMode } from '../constants/theme';
import { sagePorcelainShadow } from '../constants/sagePorcelainChrome';
import { goldShadow } from '../constants/goldTheme';
import { oliveShadow } from '../constants/oliveTheme';
import { cinemaShadow, isCinemaMode } from '../constants/cinemaThemes';
import { computeUiScale } from '../constants/layout-scale';
import { DebugLogger } from '../app/debug-logger';
import { setOskolokThemeMode } from '../app/oskolok';
import { APP_FONT_FAMILY } from '../app/typography';
import {
  LIQUID_GLASS_THEME_IDS,
  getActiveLiquidGlassVariant,
  intensityForLiquidGlassLevel,
  liquidGlassLevelForIntensity,
  makeLiquidGlassTheme,
  migrateStoredLiquidGlassIntensity,
  quantizeLiquidGlassIntensity,
  resolveLiquidGlassAppearance,
  resolveLiquidGlassColorLevel,
  resolveLiquidGlassTheme,
  setActiveLiquidGlassVariant,
  type LiquidGlassAppearance,
  type LiquidGlassColorLevel,
  type LiquidGlassThemeId,
} from '../constants/liquidGlassThemePalette';
import { noteSwallowedHandler } from '../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  /** Approved Liquid Glass selection. Legacy ThemeMode stays graphite for asset-safe consumers. */
  liquidGlassThemeId: LiquidGlassThemeId;
  appliedLiquidGlassThemeId: LiquidGlassThemeId;
  previewLiquidGlassThemeId: LiquidGlassThemeId | null;
  setPreviewLiquidGlassThemeId: (id: LiquidGlassThemeId | null) => void;
  setLiquidGlassThemeId: (id: LiquidGlassThemeId) => void;
  isLiquidGlassThemeAvailable: (id: LiquidGlassThemeId) => boolean;
  /**
   * Темы 2.0: корзина интенсивности для экранов, ветвящихся по уровню
   * (0 → calm, до 0.75 → accent, дальше → max). Выбирается ползунком, не кнопками.
   */
  liquidGlassColorLevel: LiquidGlassColorLevel;
  /** Совместимость: ставит интенсивность в опорную точку уровня (0 / 0.5 / 1) и сохраняет. */
  setLiquidGlassColorLevel: (level: LiquidGlassColorLevel) => void;
  /** Ползунок интенсивности 0…1 (шаг 0.05), с учётом перетаскивания. По умолчанию 0. */
  liquidGlassIntensity: number;
  /** Отпустил ползунок: применить и сохранить на диск (одна запись). */
  setLiquidGlassIntensity: (intensity: number) => void;
  /** Тянет ползунок: перекрасить без записи на диск; null — закончить превью. */
  setPreviewLiquidGlassIntensity: (intensity: number | null) => void;
  /** Темы 2.0: тёмное / светлое оформление. По умолчанию dark. */
  liquidGlassAppearance: LiquidGlassAppearance;
  setLiquidGlassAppearance: (appearance: LiquidGlassAppearance) => void;
  /** Выбор темы/уровня/оформления прочитан из хранилища (или истёк потолок). Сплеш ждёт его. */
  liquidGlassChoiceReady: boolean;
  isGoldThemeUnlocked: boolean;
  /** «Дедушка»: юзер жил на бесплатной «Полночи» до её ухода в премиум — тема остаётся ему доступной. */
  isMidnightGrandfathered: boolean;
  /** Темы, купленные за жемчуг (2026-08-24). Подписка их не открывает. */
  ownedThemeModes: ReadonlySet<ThemeMode>;
  /**
   * Единственная проверка «тема доступна этому человеку» для всех экранов:
   * учитывает бесплатные полки, подписку («Олива»), покупку за жемчуг,
   * награду лиги («Золото») и сохранённые темы «дедушек».
   */
  isThemeAvailable: (mode: ThemeMode) => boolean;
  /**
   * Отметить тему купленной. Мгновенно (optimistic) открывает её в UI,
   * запись на диск догоняет фоном — покупка не ждёт ни диска, ни сети.
   */
  markThemePurchased: (mode: ThemeMode) => void;
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
  liquidGlassThemeId: 'graphite',
  appliedLiquidGlassThemeId: 'graphite',
  previewLiquidGlassThemeId: null,
  setPreviewLiquidGlassThemeId: () => {},
  setLiquidGlassThemeId: () => {},
  isLiquidGlassThemeAvailable: (id) => id === 'graphite',
  liquidGlassColorLevel: 'calm',
  setLiquidGlassColorLevel: () => {},
  liquidGlassIntensity: 0,
  setLiquidGlassIntensity: () => {},
  setPreviewLiquidGlassIntensity: () => {},
  liquidGlassAppearance: 'dark',
  setLiquidGlassAppearance: () => {},
  liquidGlassChoiceReady: true,
  isGoldThemeUnlocked: false,
  isMidnightGrandfathered: false,
  ownedThemeModes: new Set<ThemeMode>(),
  isThemeAvailable: () => false,
  markThemePurchased: () => {},
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

const LEGACY_GRAPHITE_THEME_MODE: ThemeMode = 'dark';
const EMPTY_OWNED_THEME_MODES: ReadonlySet<ThemeMode> = new Set<ThemeMode>();
// зачем (темы 2.0): выбор темы, уровня цвета и оформления — локальный (в облако не
// уходит, чтений Firestore ноль). Три ключа читаются ОДНИМ multiGet при старте.
// зачем: в части тестовых окружений глобального __DEV__ нет — лог [THEME-INTENSITY] не должен ронять гидратацию.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const THEME_STORAGE_KEY = 'liquid_glass_theme';
// зачем (ползунок 2026-10-04): уровень пишется рядом с интенсивностью — прошлая сборка
// при откате прочитает ближайший уровень и не сбросит человека в «Спокойно».
const COLOR_LEVEL_STORAGE_KEY = 'liquid_glass_color_level';
const INTENSITY_STORAGE_KEY = 'liquid_glass_intensity';
const APPEARANCE_STORAGE_KEY = 'liquid_glass_appearance';
// Модульный peek: повторный маунт провайдера в той же сессии (Fast Refresh, ремаунт
// дерева) сразу рисует последнюю выбранную тему, без кадра графита.
let peekLiquidGlassThemeId: LiquidGlassThemeId = 'graphite';
// Выбор уже прочитан в этом процессе — ремаунт провайдера не ждёт хранилище повторно.
let themeHydratedInProcess = false;
// Чтение трёх ключей занимает единицы мс; 400 мс — страховка от зависшего хранилища.
const THEME_HYDRATION_CEILING_MS = 400;

const logThemeWriteError = (key: string) => (e: unknown) => {
  DebugLogger.error(`ThemeContext:${key}:write`, e instanceof Error ? e : new Error(String(e)), 'warning');
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { width: layoutW, height: layoutH } = useWindowDimensions();
  const windowUiScale = useMemo(() => computeUiScale(layoutW, layoutH), [layoutW, layoutH]);

  const [appliedLiquidGlassThemeId, setAppliedLiquidGlassThemeId] = useState<LiquidGlassThemeId>(() => peekLiquidGlassThemeId);
  const [appliedLiquidGlassIntensity, setIntensityState] = useState<number>(() => getActiveLiquidGlassVariant().intensity);
  // зачем: пока палец на ползунке — перекраска без записи на диск; отпустил — null.
  const [previewLiquidGlassIntensity, setPreviewIntensityState] = useState<number | null>(null);
  const liquidGlassIntensity = previewLiquidGlassIntensity ?? appliedLiquidGlassIntensity;
  const liquidGlassColorLevel = liquidGlassLevelForIntensity(liquidGlassIntensity);
  const [liquidGlassAppearance, setAppearanceState] = useState<LiquidGlassAppearance>(() => getActiveLiquidGlassVariant().appearance);
  // зачем: запоздалое чтение хранилища при старте не должно затереть выбор, который
  // человек успел сделать раньше (last-write-guard, как с осколками).
  const touchedRef = useRef({ theme: false, level: false, appearance: false });
  const [liquidGlassChoiceReady, setLiquidGlassChoiceReady] = useState<boolean>(() => themeHydratedInProcess);
  const [previewLiquidGlassThemeId, setPreviewLiquidGlassThemeId] = useState<LiquidGlassThemeId | null>(null);
  const liquidGlassThemeId = previewLiquidGlassThemeId ?? appliedLiquidGlassThemeId;
  const uiScale = windowUiScale;
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');

  useEffect(() => {
    setOskolokThemeMode(LEGACY_GRAPHITE_THEME_MODE);
  }, []);

  // зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ» — любая тема из реестра доступна без Plus.
  const isLiquidGlassThemeAvailable = useCallback((id: LiquidGlassThemeId) => (
    LIQUID_GLASS_THEME_IDS.includes(id)
  ), []);

  const commitLiquidGlassThemeId = useCallback((id: LiquidGlassThemeId) => {
    touchedRef.current.theme = true;
    peekLiquidGlassThemeId = id;
    setAppliedLiquidGlassThemeId(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(logThemeWriteError(THEME_STORAGE_KEY));
  }, []);

  // зачем (темы 2.0): уровень и оформление меняются мгновенно (локальный state), запись
  // на диск догоняет фоном; ошибка записи только логируется — выбор на экране остаётся.
  // зачем (владелец 2026-10-04, ползунок): на диск — ТОЛЬКО при отпускании, одной записью,
  // а не на каждый кадр перетаскивания. State меняется сразу (optimistic), диск догоняет.
  const setLiquidGlassIntensity = useCallback((intensity: number) => {
    const next = quantizeLiquidGlassIntensity(intensity);
    const level = liquidGlassLevelForIntensity(next);
    touchedRef.current.level = true;
    setIntensityState(next);
    setPreviewIntensityState(null);
    if (IS_DEV) console.log('[THEME-INTENSITY] commit', { requested: intensity, saved: next, level });
    AsyncStorage.multiSet([
      [INTENSITY_STORAGE_KEY, String(next)],
      [COLOR_LEVEL_STORAGE_KEY, level],
    ]).catch(logThemeWriteError(INTENSITY_STORAGE_KEY));
  }, []);

  const setPreviewLiquidGlassIntensity = useCallback((intensity: number | null) => {
    setPreviewIntensityState(intensity === null ? null : quantizeLiquidGlassIntensity(intensity));
  }, []);

  const setLiquidGlassColorLevel = useCallback((level: LiquidGlassColorLevel) => {
    setLiquidGlassIntensity(intensityForLiquidGlassLevel(resolveLiquidGlassColorLevel(level)));
  }, [setLiquidGlassIntensity]);

  const setLiquidGlassAppearance = useCallback((appearance: LiquidGlassAppearance) => {
    const resolved = resolveLiquidGlassAppearance(appearance);
    touchedRef.current.appearance = true;
    setAppearanceState(resolved);
    AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, resolved).catch(logThemeWriteError(APPEARANCE_STORAGE_KEY));
  }, []);

  const setLiquidGlassThemeId = useCallback((id: LiquidGlassThemeId) => {
    if (!isLiquidGlassThemeAvailable(id)) return;
    commitLiquidGlassThemeId(id);
  }, [commitLiquidGlassThemeId, isLiquidGlassThemeAvailable]);

  // зачем (владелец 2026-09-30): темы бесплатны — сохранённая тема читается ОДИН раз
  // при старте и больше не ждёт проверки Plus (раньше эффект перечитывал хранилище
  // при каждой смене доступа и сбрасывал тему в graphite после окончания Plus).
  useEffect(() => {
    let cancelled = false;
    // зачем (темы 2.0): сплеш ждёт этот флаг, иначе у выбравших светлое мог мелькнуть
    // тёмный кадр. Потолок — чтобы сбой хранилища никогда не держал сплеш.
    const ceiling = setTimeout(() => {
      if (cancelled || themeHydratedInProcess) return;
      DebugLogger.error('ThemeContext:hydration_ceiling', new Error(`theme read exceeded ${THEME_HYDRATION_CEILING_MS}ms`), 'warning');
      themeHydratedInProcess = true;
      setLiquidGlassChoiceReady(true);
    }, THEME_HYDRATION_CEILING_MS);
    const markHydrated = () => {
      clearTimeout(ceiling);
      themeHydratedInProcess = true;
      if (!cancelled) setLiquidGlassChoiceReady(true);
    };
    void (async () => {
      const pairs = await AsyncStorage.multiGet([THEME_STORAGE_KEY, COLOR_LEVEL_STORAGE_KEY, APPEARANCE_STORAGE_KEY, INTENSITY_STORAGE_KEY]);
      if (cancelled) return;
      const storedId = pairs[0]?.[1] ?? null;
      const resolved = resolveLiquidGlassTheme(storedId);
      if (!touchedRef.current.theme) {
        peekLiquidGlassThemeId = resolved;
        setAppliedLiquidGlassThemeId(resolved);
      }
      if (storedId !== null && storedId !== resolved) {
        AsyncStorage.setItem(THEME_STORAGE_KEY, resolved).catch(logThemeWriteError(THEME_STORAGE_KEY));
      }
      // зачем (ползунок 2026-10-04): «Спокойно / Акцент / Максимум» → 0 / 0.5 / 1, на этих
      // точках палитра прежняя байт-в-байт; новый ключ дописывается один раз.
      const storedLevel = pairs[1]?.[1] ?? null;
      const storedIntensity = pairs[3]?.[1] ?? null;
      const migration = migrateStoredLiquidGlassIntensity(storedIntensity, storedLevel);
      if (IS_DEV) {
        console.log('[THEME-INTENSITY] hydrate', {
          storedIntensity, storedLevel, source: migration.source, intensity: migration.intensity,
          skippedBecauseTouched: touchedRef.current.level,
        });
      }
      if (!touchedRef.current.level) {
        setIntensityState(migration.intensity);
        if (migration.needsWrite) {
          AsyncStorage.setItem(INTENSITY_STORAGE_KEY, String(migration.intensity)).catch(logThemeWriteError(INTENSITY_STORAGE_KEY));
        }
      }
      if (!touchedRef.current.appearance) setAppearanceState(resolveLiquidGlassAppearance(pairs[2]?.[1] ?? null));
      markHydrated();
    })().catch((e: unknown) => {
      DebugLogger.error('ThemeContext:liquid_glass_theme', e instanceof Error ? e : new Error(String(e)), 'warning');
      if (!cancelled && !touchedRef.current.theme) setAppliedLiquidGlassThemeId('graphite');
      markHydrated();
    });
    return () => { cancelled = true; clearTimeout(ceiling); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pairs = await AsyncStorage.multiGet(['app_theme', 'app_font_size']);
      if (cancelled) return;
      const themeStr = pairs[0]?.[1] ?? null;
      const fontStr = pairs[1]?.[1] ?? null;
      // All historical values collapse to the asset-safe Graphite alias. The
      // active visual selection is persisted independently as liquid_glass_theme.
      if (themeStr !== LEGACY_GRAPHITE_THEME_MODE) {
        void AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE);
      }
      if (fontStr && fontStr in FONT_SCALE) setFontSizeState(fontStr as FontSize);
    })().catch(noteSwallowedHandler('ThemeContext:promise_1')); // fail-soft: defaults are already Graphite + medium
    return () => {
      cancelled = true;
    };
  }, []);

  const commitLegacyGraphiteTheme = useCallback(() => {
    void AsyncStorage.setItem('app_theme', LEGACY_GRAPHITE_THEME_MODE);
  }, []);

  const setPreviewThemeMode = useCallback((_mode: ThemeMode | null) => {
    // Legacy previews are retired; Liquid Glass owns all visible previews.
  }, []);

  const setThemeMode = useCallback((_mode: ThemeMode) => commitLegacyGraphiteTheme(), [commitLegacyGraphiteTheme]);
  const toggle = useCallback(() => commitLegacyGraphiteTheme(), [commitLegacyGraphiteTheme]);
  const isThemeAvailable = useCallback((mode: ThemeMode) => mode === LEGACY_GRAPHITE_THEME_MODE, []);
  const markThemePurchased = useCallback((_mode: ThemeMode) => {
    // Retained as a no-op compatibility hook; legacy ownership cannot grant access.
  }, []);

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s);
    void AsyncStorage.setItem('app_font_size', s);
  }, []);

  const f = useMemo(
    () => createFonts(FONT_SCALE[fontSize] * uiScale),
    [fontSize, uiScale],
  );
  const variant = useMemo(
    () => ({ level: liquidGlassColorLevel, appearance: liquidGlassAppearance, intensity: liquidGlassIntensity }),
    [liquidGlassColorLevel, liquidGlassAppearance, liquidGlassIntensity],
  );
  // зачем: регистрируем вариант ДО рендера детей — экраны, читающие
  // liquidGlassTokens(id) без второго аргумента, в этом же кадре получают новый цвет
  // (без мигания старым). Вызов идемпотентен: тот же state → тот же вариант.
  setActiveLiquidGlassVariant(variant);
  const theme = useMemo(() => makeLiquidGlassTheme(liquidGlassThemeId, DARK, variant), [liquidGlassThemeId, variant]);
  const isDark = liquidGlassAppearance === 'dark';
  const statusBarLight = isDark;
  const ds = useMemo(() => {
    const px = (n: number) => Math.max(2, Math.round(n * uiScale));
    const radiusBase = { md: 12, lg: 16, xl: 20, xxl: 24 };
    return {
      spacing: { xs: px(4), sm: px(8), md: px(12), lg: px(16), xl: px(24), xxl: px(32) },
      radius: { md: px(radiusBase.md), lg: px(radiusBase.lg), xl: px(radiusBase.xl), xxl: px(radiusBase.xxl) },
      inputHeight: Math.max(44, px(52)),
      buttonHeight: Math.max(44, px(52)),
      fontFamily: APP_FONT_FAMILY,
      shadow: {
        soft: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(1, px(2)) },
          shadowOpacity: 0.22,
          shadowRadius: Math.max(4, px(8)),
          elevation: Math.max(1, px(2)),
        },
        medium: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: Math.max(2, px(6)) },
          shadowOpacity: 0.28,
          shadowRadius: Math.max(8, px(16)),
          elevation: Math.max(2, px(6)),
        },
      },
    };
  }, [uiScale]);

  const value = useMemo<ThemeCtx>(
    () => ({
      theme,
      isDark,
      statusBarLight,
      themeMode: LEGACY_GRAPHITE_THEME_MODE,
      appliedThemeMode: LEGACY_GRAPHITE_THEME_MODE,
      previewThemeMode: null,
      setPreviewThemeMode,
      liquidGlassThemeId,
      appliedLiquidGlassThemeId,
      previewLiquidGlassThemeId,
      setPreviewLiquidGlassThemeId,
      setLiquidGlassThemeId,
      isLiquidGlassThemeAvailable,
      liquidGlassColorLevel,
      setLiquidGlassColorLevel,
      liquidGlassIntensity,
      setLiquidGlassIntensity,
      setPreviewLiquidGlassIntensity,
      liquidGlassAppearance,
      setLiquidGlassAppearance,
      liquidGlassChoiceReady,
      isGoldThemeUnlocked: false,
      isMidnightGrandfathered: false,
      ownedThemeModes: EMPTY_OWNED_THEME_MODES,
      isThemeAvailable,
      markThemePurchased,
      toggle,
      setThemeMode,
      fontSize,
      setFontSize,
      uiScale,
      f,
      ds,
    }),
    [theme, isDark, statusBarLight, setPreviewThemeMode, liquidGlassThemeId, appliedLiquidGlassThemeId, previewLiquidGlassThemeId, setLiquidGlassThemeId, isLiquidGlassThemeAvailable, liquidGlassColorLevel, setLiquidGlassColorLevel, liquidGlassIntensity, setLiquidGlassIntensity, setPreviewLiquidGlassIntensity, liquidGlassAppearance, setLiquidGlassAppearance, liquidGlassChoiceReady, isThemeAvailable, markThemePurchased, toggle, setThemeMode, fontSize, setFontSize, uiScale, f, ds],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
