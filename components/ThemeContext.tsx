import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, useColorScheme, useWindowDimensions } from 'react-native';
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
import { createThemePersister, type ThemePersister } from '../app/theme_persist';
import { getDevAppearance, getDevThemeChoice, subscribeDevAppearance, subscribeDevThemeChoice } from '../app/dev_appearance_override';
import { actionToastTri, emitAppEvent } from '../app/events';
import { FOLLOW_SYSTEM_MARKER_KEY, decideFirstRunTheme, pickSystemDefaultTheme } from '../app/theme_first_run_default';
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

// зачем (владелец 15.10): выбор размера шрифта убран из Настроек — все на «среднем»; вернуть выбор = true здесь и строку в Настройках.
export const FONT_SIZE_USER_CHOICE_ENABLED = false;

export const FONT_SIZE_LABELS: Record<FontSize, {
  ru: string;
  uk: string;
  en: string;
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
    en: 'Small',
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
    en: 'Medium',
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
    en: 'Large',
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
// зачем (оптимизация тем, координатор 15.10; [THEMES-PERF]): сколько подписчиков useTheme перерисовалось после смены значения контекста.
// Считаем ВЫЗОВЫ useTheme (один вызов = один рендер подписчика); только в dev, в боевой сборке счётчик не растёт.
let themePerfConsumerCalls = 0;
// зачем ([THEMES-PERF], поручение координатора 13.10): сколько записей в хранилище ушло за шаг ползунка/смену темы; на шагах превью должно быть 0, на отпускании — 1.
let themePerfWrites = 0;
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
// зачем (владелец 13.10, тема новичка «как на телефоне»): пара «Сумерки/Океан» следует за системным режимом, пока человек сам ничего не выбрал.
// Модульный флаг — чтобы ремаунт провайдера в том же процессе не мигал графитом и не ждал хранилище. Логи [DEFAULT-THEME].
let followSystemInProcess = false;
// Чтение трёх ключей занимает единицы мс; 400 мс — страховка от зависшего хранилища.
const THEME_HYDRATION_CEILING_MS = 400;
// зачем ([THEME-BOOT] 18.10): лог первых кадров загрузки темы — не больше 12 строк за запуск, чтобы не шуметь в боевой сборке.
const THEME_BOOT_LOG_FRAMES = 12;
const THEME_BOOT_T0 = Date.now();

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
  // зачем (Сверка chain7 12.10): dev_state?theme=&level= — тема и оттенок ТОЛЬКО в памяти (app/dev_appearance_override.ts); сохранённый выбор и запись на диск не меняются
  const [devThemeChoice, setDevThemeChoiceState] = useState(() => getDevThemeChoice());
  useEffect(() => subscribeDevThemeChoice(setDevThemeChoiceState), []);
  const liquidGlassIntensity = previewLiquidGlassIntensity ?? devThemeChoice?.intensity ?? appliedLiquidGlassIntensity;
  const liquidGlassColorLevel = liquidGlassLevelForIntensity(liquidGlassIntensity);
  const [savedLiquidGlassAppearance, setAppearanceState] = useState<LiquidGlassAppearance>(() => getActiveLiquidGlassVariant().appearance);
  // зачем (Макеты 15.10): dev_state?appearance=light|dark — оформление ТОЛЬКО в памяти (app/dev_appearance_override.ts); хранилище и сохранённый выбор не меняются. Без оверрайда — прежнее значение.
  const [devAppearance, setDevAppearanceState] = useState<LiquidGlassAppearance | null>(() => getDevAppearance());
  useEffect(() => subscribeDevAppearance(setDevAppearanceState), []);
  const systemScheme = useColorScheme();
  const [followSystem, setFollowSystem] = useState<boolean>(() => followSystemInProcess);
  const systemDefault = pickSystemDefaultTheme(systemScheme);
  const liquidGlassAppearance: LiquidGlassAppearance = devAppearance ?? (followSystem ? systemDefault.appearance : savedLiquidGlassAppearance);
  // зачем: запоздалое чтение хранилища при старте не должно затереть выбор, который
  // человек успел сделать раньше (last-write-guard, как с осколками).
  const touchedRef = useRef({ theme: false, level: false, appearance: false });
  // зачем (аудит Optimistic UI экрана тем, координатор 15.10): выбор применяется мгновенно, диск догоняет фоном; при сбое записи — один повтор, затем откат к сохранённому
  // значению + понятное сообщение, а поздний сбой старой записи не откатывает более новый выбор (app/theme_persist.ts). Лог [THEMES-SWITCH].
  const currentChoiceRef = useRef({ theme: peekLiquidGlassThemeId as string, appearance: '' as string, intensity: '' as string });
  const persisterRef = useRef<ThemePersister | null>(null);
  if (persisterRef.current === null) {
    persisterRef.current = createThemePersister({
      write: (kind, value) => {
        if (IS_DEV) themePerfWrites += 1; // guard-ok: счётчик [THEMES-PERF], в боевой сборке IS_DEV=false
        if (kind === 'theme') return AsyncStorage.setItem(THEME_STORAGE_KEY, value);
        if (kind === 'appearance') return AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, value);
        return AsyncStorage.multiSet([[INTENSITY_STORAGE_KEY, value], [COLOR_LEVEL_STORAGE_KEY, liquidGlassLevelForIntensity(Number(value))]]);
      },
      rollback: (kind, value) => {
        if (kind === 'theme') { peekLiquidGlassThemeId = value as LiquidGlassThemeId; setAppliedLiquidGlassThemeId(value as LiquidGlassThemeId); }
        else if (kind === 'appearance') setAppearanceState(resolveLiquidGlassAppearance(value));
        else setIntensityState(Number(value));
      },
      notifyFailure: (kind) => {
        const what = kind === 'theme' ? { ru: 'тему', uk: 'тему', es: 'el tema', en: 'the theme', ptBr: 'o tema', vi: 'chủ đề', id: 'tema', tr: 'temayı', pl: 'motyw' }
          : kind === 'appearance' ? { ru: 'оформление', uk: 'оформлення', es: 'la apariencia', en: 'the appearance', ptBr: 'a aparência', vi: 'giao diện', id: 'tampilan', tr: 'görünümü', pl: 'wygląd' }
            : { ru: 'насыщенность', uk: 'насиченість', es: 'la intensidad', en: 'the intensity', ptBr: 'a intensidade', vi: 'độ đậm', id: 'intensitas', tr: 'yoğunluğu', pl: 'intensywność' };
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: `Не удалось сохранить ${what.ru}. Вернули прежнюю`, uk: `Не вдалося зберегти ${what.uk}. Повернули попередню`,
          es: `No se pudo guardar ${what.es}. Volvimos a la anterior`, en: `Couldn't save ${what.en}. Reverted`,
          'pt-BR': `Não foi possível salvar ${what.ptBr}. Revertido`, vi: `Không lưu được ${what.vi}. Đã hoàn lại`,
          id: `Gagal menyimpan ${what.id}. Dikembalikan`, tr: `${what.tr} kaydedemedik. Geri alındı`, pl: `Nie udało się zapisać: ${what.pl}. Przywrócono poprzedni`,
        }));
      },
      log: (message, data) => {
        const failure = message.startsWith('write_failed');
        if (failure) console.warn('[THEMES-SWITCH]', message, JSON.stringify(data)); // guard-ok: сбой записи выбора темы всегда виден в журнале
        else if (IS_DEV) console.log('[THEMES-SWITCH]', message, JSON.stringify(data)); // guard-ok: dev-трассировка смены темы
      },
    });
  }
  const [liquidGlassChoiceReady, setLiquidGlassChoiceReady] = useState<boolean>(() => themeHydratedInProcess);
  const [previewLiquidGlassThemeId, setPreviewLiquidGlassThemeId] = useState<LiquidGlassThemeId | null>(null);
  const liquidGlassThemeId = previewLiquidGlassThemeId ?? (devThemeChoice?.themeId ? resolveLiquidGlassTheme(devThemeChoice.themeId) : null) ?? (followSystem ? resolveLiquidGlassTheme(systemDefault.themeId) : appliedLiquidGlassThemeId);
  currentChoiceRef.current = { theme: appliedLiquidGlassThemeId, appearance: liquidGlassAppearance, intensity: String(appliedLiquidGlassIntensity) };
  // зачем (координатор 18.10, первый запуск: «первый экран, онбординг и первая Главная — правильная тема с первого кадра, без вспышки другой темы»; правило «сперва логи»):
  // какая пара реально отрисована в каждом из первых кадров и ПОЧЕМУ: системная схема, следование системе, сохранённая/применённая тема (peek или хранилище),
  // выбранная для кадра, оформление, готов ли выбор (пока нет — стартовая заставка закрывает экран). Кадр = номер рендера провайдера с монтирования. Префикс [THEME-BOOT].
  const bootFrameRef = useRef(0);
  bootFrameRef.current += 1;
  useEffect(() => {
    if (bootFrameRef.current > THEME_BOOT_LOG_FRAMES) return;
    console.log(`[THEME-BOOT] frame ${JSON.stringify({ frame: bootFrameRef.current, msSinceBoot: Date.now() - THEME_BOOT_T0, systemScheme: String(systemScheme), followSystem, savedTheme: appliedLiquidGlassThemeId, savedAppearance: savedLiquidGlassAppearance, chosenTheme: liquidGlassThemeId, chosenAppearance: liquidGlassAppearance, choiceReady: liquidGlassChoiceReady, hydratedInProcess: themeHydratedInProcess, covered: !liquidGlassChoiceReady })}`); // guard-ok: строка на первые кадры загрузки
  }, [systemScheme, followSystem, appliedLiquidGlassThemeId, savedLiquidGlassAppearance, liquidGlassThemeId, liquidGlassAppearance, liquidGlassChoiceReady]);
  const uiScale = windowUiScale;
  const [fontSize,  setFontSizeState]  = useState<FontSize>('medium');
  const fontSizeRef = useRef<FontSize>('medium');
  fontSizeRef.current = fontSize;

  useEffect(() => {
    setOskolokThemeMode(LEGACY_GRAPHITE_THEME_MODE);
  }, []);

  // зачем (владелец 2026-09-30): «ТЕМЫ ВСЕ ФРИ» — любая тема из реестра доступна без Plus.
  const isLiquidGlassThemeAvailable = useCallback((id: LiquidGlassThemeId) => (
    LIQUID_GLASS_THEME_IDS.includes(id)
  ), []);

  // зачем (владелец 13.10): пока человек ничего не выбирал, пара тема/оформление/насыщенность следует за системным режимом и НЕ лежит в хранилище.
  // Первый же его выбор (тема, оформление или насыщенность) замораживает ту пару, которую он сейчас видит, и записывает её целиком — дальше это
  // обычный выбор навсегда. Вызывается первым делом в каждом из трёх commit-ов.
  const followRef = useRef({ on: followSystem, themeId: systemDefault.themeId, appearance: systemDefault.appearance, intensity: systemDefault.intensity });
  followRef.current = { on: followRef.current.on, themeId: systemDefault.themeId, appearance: systemDefault.appearance, intensity: systemDefault.intensity };
  const freezeFollowSystem = useCallback((trigger: string) => {
    const cur = followRef.current;
    if (!cur.on) return;
    followRef.current = { ...cur, on: false };
    followSystemInProcess = false;
    const id = resolveLiquidGlassTheme(cur.themeId);
    console.log(`[DEFAULT-THEME] выбор человека (${trigger}) → пара заморожена: тема=${id} оформление=${cur.appearance} насыщенность=${cur.intensity} источник=выбор человека`); // guard-ok: переход «по умолчанию» → «выбор человека»
    peekLiquidGlassThemeId = id;
    setAppliedLiquidGlassThemeId(id);
    setAppearanceState(cur.appearance);
    setIntensityState(cur.intensity);
    setFollowSystem(false);
    currentChoiceRef.current = { theme: id, appearance: cur.appearance, intensity: String(cur.intensity) };
    persisterRef.current?.setPersisted('theme', id);
    persisterRef.current?.setPersisted('appearance', cur.appearance);
    persisterRef.current?.setPersisted('intensity', String(cur.intensity));
    AsyncStorage.multiSet([
      [THEME_STORAGE_KEY, id],
      [APPEARANCE_STORAGE_KEY, cur.appearance],
      [INTENSITY_STORAGE_KEY, String(cur.intensity)],
      [COLOR_LEVEL_STORAGE_KEY, liquidGlassLevelForIntensity(cur.intensity)],
      [FOLLOW_SYSTEM_MARKER_KEY, '0'],
    ]).catch((e: unknown) => {
      console.warn(`[DEFAULT-THEME] запись замороженной пары не удалась: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: причина в журнале
      logThemeWriteError(THEME_STORAGE_KEY)(e);
    });
  }, []);
  useEffect(() => {
    if (!followSystem) return;
    console.log(`[DEFAULT-THEME] системный режим=${String(systemScheme)} → тема=${systemDefault.themeId} оформление=${systemDefault.appearance} насыщенность=${systemDefault.intensity} источник=по умолчанию`); // guard-ok: смена пары вслед за системой
  }, [followSystem, systemScheme, systemDefault.themeId, systemDefault.appearance, systemDefault.intensity]);

  const commitLiquidGlassThemeId = useCallback((id: LiquidGlassThemeId) => {
    freezeFollowSystem('theme');
    const previous = currentChoiceRef.current.theme;
    touchedRef.current.theme = true;
    peekLiquidGlassThemeId = id;
    setAppliedLiquidGlassThemeId(id);
    persisterRef.current?.commit('theme', id, previous);
  }, []);

  // зачем (темы 2.0): уровень и оформление меняются мгновенно (локальный state), запись
  // на диск догоняет фоном; ошибка записи только логируется — выбор на экране остаётся.
  // зачем (владелец 2026-10-04, ползунок): на диск — ТОЛЬКО при отпускании, одной записью,
  // а не на каждый кадр перетаскивания. State меняется сразу (optimistic), диск догоняет.
  const setLiquidGlassIntensity = useCallback((intensity: number) => {
    freezeFollowSystem('intensity');
    const next = quantizeLiquidGlassIntensity(intensity);
    const level = liquidGlassLevelForIntensity(next);
    const previous = currentChoiceRef.current.intensity;
    touchedRef.current.level = true;
    setIntensityState(next);
    setPreviewIntensityState(null);
    if (IS_DEV) console.log('[THEME-INTENSITY] commit', { requested: intensity, saved: next, level });
    persisterRef.current?.commit('intensity', String(next), previous);
  }, []);

  const setPreviewLiquidGlassIntensity = useCallback((intensity: number | null) => {
    setPreviewIntensityState(intensity === null ? null : quantizeLiquidGlassIntensity(intensity));
  }, []);

  const setLiquidGlassColorLevel = useCallback((level: LiquidGlassColorLevel) => {
    setLiquidGlassIntensity(intensityForLiquidGlassLevel(resolveLiquidGlassColorLevel(level)));
  }, [setLiquidGlassIntensity]);

  const setLiquidGlassAppearance = useCallback((appearance: LiquidGlassAppearance) => {
    freezeFollowSystem('appearance');
    const resolved = resolveLiquidGlassAppearance(appearance);
    const previous = currentChoiceRef.current.appearance;
    touchedRef.current.appearance = true;
    setAppearanceState(resolved);
    persisterRef.current?.commit('appearance', resolved, previous);
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
      // зачем ([THEME-BOOT]): потолок сработал раньше хранилища — заставка снимется с ТЕМОЙ ПО УМОЛЧАНИЮ, это и есть возможная вспышка; в журнал причина и время
      console.warn(`[THEME-BOOT] ceiling ${JSON.stringify({ ceilingMs: THEME_HYDRATION_CEILING_MS, msSinceBoot: Date.now() - THEME_BOOT_T0, reason: 'storage_read_slower_than_ceiling' })}`); // guard-ok: потолок чтения темы
      themeHydratedInProcess = true;
      setLiquidGlassChoiceReady(true);
    }, THEME_HYDRATION_CEILING_MS);
    const markHydrated = () => {
      clearTimeout(ceiling);
      themeHydratedInProcess = true;
      if (!cancelled) setLiquidGlassChoiceReady(true);
    };
    void (async () => {
      // зачем (DEFAULT_THEME_OPTIONS_R1): onboarding_done — в ТОМ ЖЕ чтении (без лишнего await до кадра), чтобы отличить новичка от старого
      const pairs = await AsyncStorage.multiGet([THEME_STORAGE_KEY, COLOR_LEVEL_STORAGE_KEY, APPEARANCE_STORAGE_KEY, INTENSITY_STORAGE_KEY, 'onboarding_done', FOLLOW_SYSTEM_MARKER_KEY]);
      if (cancelled) return;
      const storedId = pairs[0]?.[1] ?? null;
      const firstRun = decideFirstRunTheme({
        storedThemeId: storedId,
        storedLevel: pairs[1]?.[1] ?? null,
        storedIntensity: pairs[3]?.[1] ?? null,
        onboardingDone: pairs[4]?.[1] ?? null,
        followSystemMarker: pairs[5]?.[1] ?? null,
      });
      console.log(`[THEME-BOOT] hydrate ${JSON.stringify({ msSinceBoot: Date.now() - THEME_BOOT_T0, storedTheme: storedId, storedAppearance: pairs[2]?.[1] ?? null, storedIntensity: pairs[3]?.[1] ?? null, onboardingDone: pairs[4]?.[1] ?? null, followMarker: pairs[5]?.[1] ?? null, bootScheme: String(Appearance.getColorScheme()), decision: `${firstRun.kind}/${firstRun.reason}` })}`); // guard-ok: одна строка на старт
      console.log(`[THEME-DEFAULT] ${firstRun.kind} ${JSON.stringify({ reason: firstRun.reason, apply: firstRun.apply, ...(firstRun.kind === 'new_user' ? { themeId: firstRun.themeId, intensity: firstRun.intensity } : {}) })}`);
      const newUserApply = firstRun.kind === 'new_user' && firstRun.apply ? firstRun : null;
      const storedResolved = resolveLiquidGlassTheme(storedId);
      // зачем (владелец 13.10): новичку тема не пишется в хранилище — пара «Сумерки/Океан» следует за системным режимом, пока он ничего не выбрал.
      // В хранилище лежит только метка; первый выбор замораживает пару (freezeFollowSystem). Старые пользователи сюда не попадают.
      const bootScheme = Appearance.getColorScheme();
      const newUserPair = newUserApply ? pickSystemDefaultTheme(bootScheme) : null;
      const resolved = newUserPair ? resolveLiquidGlassTheme(newUserPair.themeId) : storedResolved;
      console.log(`[DEFAULT-THEME] первый запуск=${String(firstRun.kind === 'new_user')} решение=${firstRun.kind}/${firstRun.reason} системный режим=${String(bootScheme)} → тема=${resolved} источник=${newUserPair ? 'по умолчанию (следует за системой)' : 'выбор человека / прежнее'}`); // guard-ok: итог выбора стартовой темы
      if (newUserPair) {
        followSystemInProcess = true;
        followRef.current = { ...followRef.current, on: true };
        setFollowSystem(true);
        if (pairs[5]?.[1] !== '1') {
          AsyncStorage.setItem(FOLLOW_SYSTEM_MARKER_KEY, '1').catch((e: unknown) => {
            console.warn(`[DEFAULT-THEME] метка новичка не записана: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: причина в журнале
            logThemeWriteError(FOLLOW_SYSTEM_MARKER_KEY)(e);
          });
        }
      }
      persisterRef.current?.setPersisted('theme', resolved);
      persisterRef.current?.setPersisted('appearance', resolveLiquidGlassAppearance(pairs[2]?.[1] ?? null));
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
      const storedIntensity = newUserApply ? String(newUserApply.intensity) : (pairs[3]?.[1] ?? null);
      const migration = migrateStoredLiquidGlassIntensity(storedIntensity, storedLevel);
      persisterRef.current?.setPersisted('intensity', String(migration.intensity));
      if (IS_DEV) {
        // зачем (паритет Learn 05.10: «кнопка “Начать” лавандовая»): у Графита cta белая на любой
        // насыщенности — лавандовая бывает только у другой темы. Лог показывает, КАКАЯ тема реально
        // применена и откуда (хранилище / уже выбранная в этом процессе), чтобы не чинить наугад.
        console.log('[THEME-INTENSITY] hydrate', {
          storedThemeId: storedId, appliedThemeId: touchedRef.current.theme ? 'kept_user_choice' : resolved,
          storedAppearance: pairs[2]?.[1] ?? null,
          storedIntensity, storedLevel, source: migration.source, intensity: migration.intensity,
          skippedBecauseTouched: touchedRef.current.level,
        });
      }
      if (!touchedRef.current.level) {
        setIntensityState(migration.intensity);
        if (migration.needsWrite && !newUserApply) {
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
      // зачем (владелец 15.10, Ревизор a5702f09b): «Размер шрифта» убран из Настроек — всем «средний» уже на старте, а не только
      // после открытия Настроек; сохранённый крупный/мелкий один раз переписываем на medium (без перерисовки: состояние и так medium).
      if (!FONT_SIZE_USER_CHOICE_ENABLED) {
        if (fontStr && fontStr !== 'medium') {
          console.log('[SETTINGS-FONT] reset', JSON.stringify({ from: fontStr, to: 'medium', reason: 'picker_removed', at: 'hydrate' }));
          AsyncStorage.setItem('app_font_size', 'medium').catch(noteSwallowedHandler('ThemeContext:font_size_reset'));
        }
        return;
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

  // зачем (аудит Optimistic UI Дизайна 15.10, №2): размер шрифта меняется сразу, запись на диск догоняет; при ошибке диска — запись в журнал и откат к прежнему размеру
  // (только если пользователь за это время не выбрал другой — поздний сбой не затирает свежий выбор).
  const setFontSize = useCallback((s: FontSize) => {
    const previous = fontSizeRef.current;
    setFontSizeState(s);
    AsyncStorage.setItem('app_font_size', s).catch((error: unknown) => {
      DebugLogger.error('ThemeContext:font_size_persist_failed', error instanceof Error ? error : new Error(String(error)), 'warning');
      setFontSizeState((current) => (current === s ? previous : current));
    });
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
  const themeBuildMsRef = useRef(0);
  const theme = useMemo(() => {
    const startedAt = IS_DEV ? Date.now() : 0;
    const built = makeLiquidGlassTheme(liquidGlassThemeId, DARK, variant);
    if (IS_DEV) themeBuildMsRef.current = Date.now() - startedAt;
    return built;
  }, [liquidGlassThemeId, variant]);
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

  // зачем ([THEMES-PERF], dev): причина смены значения контекста, цена сборки темы и число перерисованных подписчиков за 250 мс после неё.
  const perfPrevRef = useRef<{ id: string; level: string; appearance: string; intensity: number; fontSize: string } | null>(null);
  useEffect(() => {
    if (!IS_DEV) return undefined;
    const now = { id: String(liquidGlassThemeId), level: String(liquidGlassColorLevel), appearance: String(liquidGlassAppearance), intensity: liquidGlassIntensity, fontSize: String(fontSize) };
    const prev = perfPrevRef.current;
    perfPrevRef.current = now;
    if (prev === null) {
      console.log('[THEMES-PERF] first', JSON.stringify({ ...now, buildMs: themeBuildMsRef.current })); // guard-ok: dev-замер первого значения
      return undefined;
    }
    const changed = (Object.keys(now) as Array<keyof typeof now>).filter((key) => now[key] !== prev[key]);
    const callsAtChange = themePerfConsumerCalls;
    const writesAtChange = themePerfWrites;
    const changedAt = Date.now();
    setTimeout(() => {
      console.log('[THEMES-PERF] change', JSON.stringify({ changed, from: changed.map((key) => prev[key]), to: changed.map((key) => now[key]), buildMs: themeBuildMsRef.current, consumersRendered: themePerfConsumerCalls - callsAtChange, writes: themePerfWrites - writesAtChange, settleMs: Date.now() - changedAt })); // guard-ok: dev-замер смены темы/шага ползунка
    }, 250);
    return undefined; // зачем: таймер не отменяем — на жесте ползунка нужна строка на КАЖДЫЙ шаг, а не только последний
  }, [liquidGlassThemeId, liquidGlassColorLevel, liquidGlassAppearance, liquidGlassIntensity, fontSize]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  if (IS_DEV) themePerfConsumerCalls += 1; // guard-ok: счётчик [THEMES-PERF], в боевой сборке IS_DEV=false
  return useContext(ThemeContext);
};
