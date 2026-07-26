import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Freeze } from 'react-freeze';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, StatusBar, Animated, Easing, AppState, BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TopFadeMask from '../../components/TopFadeMask';
import { TopFadeScrollProvider, useTopFadeScroll } from '../../components/TopFadeScrollContext';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { HOME_ENTRANCE } from '../../constants/motion';
import { emitAppEvent, onAppEvent } from '../events';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import HomeScreen       from './home';
import TodayScreen from '../../components/today/TodayScreen';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import {
  setExamBestPctTabActivity,
} from '../exam_best_pct_overlay';
import { resetTodayRuntimeMemory } from '../../lib/today/runtime_reset';
import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
  type PhysicalPageIndex,
} from '../../lib/today/tab_page_model';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Возвращает цвет с заданной альфой. Поддерживает hex (#RGB/#RRGGBB/#RRGGBBAA);
 * для уже-rgba/прочих форматов возвращает исходник без изменений (безопасный фолбэк).
 */
function withAlpha(color: string, alpha: number): string {
  if (color[0] !== '#') return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

type TabScreenProps = { overlayIdentityEpoch?: number };
type TabScreenComponent = React.ComponentType<TabScreenProps>;
type DeferredTabModule = { default: TabScreenComponent };
type CancelableTask = { cancel?: () => void };

let deferredLessonsScreen: TabScreenComponent | null = null;
let deferredTournamentsScreen: TabScreenComponent | null = null;
let deferredFriendsScreen: TabScreenComponent | null = null;
let deferredSettingsScreen: TabScreenComponent | null = null;

function loadLessonsScreen(): TabScreenComponent {
  // зачем: таб 1 = «Журнал» (раздел статистики) по решению владельца; уроки
  // дня — на главной, полный список — /lesson_menu. Имя лоадера сохранено,
  // чтобы не трогать privacy-boundary вокруг таба.
  deferredLessonsScreen ??= (require('./journal') as DeferredTabModule).default;
  return deferredLessonsScreen;
}

function loadTournamentsScreen(): TabScreenComponent {
  deferredTournamentsScreen ??= (require('./tournaments') as DeferredTabModule).default;
  return deferredTournamentsScreen;
}

function loadFriendsScreen(): TabScreenComponent {
  deferredFriendsScreen ??= (require('./friends') as DeferredTabModule).default;
  return deferredFriendsScreen;
}

function loadSettingsScreen(): TabScreenComponent {
  deferredSettingsScreen ??= (require('./settings') as DeferredTabModule).default;
  return deferredSettingsScreen;
}

function loadDeferredTabScreenByIndex(idx: number): TabScreenComponent | null {
  switch (idx) {
    case 1: return loadLessonsScreen();
    case 2: return loadTournamentsScreen();
    case 3: return loadFriendsScreen();
    case 4: return loadSettingsScreen();
    default: return null;
  }
}

function prewarmDeferredTabScreen(idx: number): boolean {
  try {
    loadDeferredTabScreenByIndex(idx);
    return true;
  } catch {
    /* Route-level render will surface real module errors when the user opens that tab. */
    return false;
  }
}

function DeferredTabScreen({
  shouldLoad,
  loadScreen,
  screenProps,
}: {
  shouldLoad: boolean;
  loadScreen: () => TabScreenComponent;
  screenProps?: TabScreenProps;
}) {
  const { theme: t } = useTheme();
  const Screen = shouldLoad ? loadScreen() : null;
  if (!Screen) return <View style={[s.deferredTabPlaceholder, { backgroundColor: t.bgPrimary }]} collapsable={false} />;
  return <Screen {...screenProps} />;
}

/**
 * Панель таба с заморозкой невидимого содержимого.
 *
 * Freeze включается только ПОСЛЕ первого коммита (readyToFreeze): свежепремаунченный
 * таб успевает полностью смонтироваться и запустить свои начальные загрузки, и лишь
 * затем засыпает. Пока таб заморожен, его state продолжает обновляться (подписки/таймеры
 * живут по своим гардам), но рендеры не выполняются; при разморозке — один рендер
 * с актуальным состоянием. Таймеры/подписки Freeze НЕ останавливает — их по-прежнему
 * гейтят useIsScreenFocused/AppState-гарды внутри экранов.
 */
function TabPane({ freezeWanted, children }: { freezeWanted: boolean; children: React.ReactNode }) {
  const [readyToFreeze, setReadyToFreeze] = useState(false);
  useEffect(() => { setReadyToFreeze(true); }, []);
  return <Freeze freeze={ENABLE_TAB_FREEZE && freezeWanted && readyToFreeze}>{children}</Freeze>;
}

function todayClockScopeKey(): string {
  const now = new Date();
  let timeZone = 'UTC';
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { /* UTC fallback */ }
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}|${timeZone}`;
}

/**
 * This shell intentionally stays above react-freeze. A scope change replaces the
 * frozen subtree before an edge drag can expose copy from the previous account,
 * target, locale, calendar day, or timezone.
 */
function TodayPaneBoundary({ freezeWanted }: { freezeWanted: boolean }) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const [accountSafetyKey, setAccountSafetyKey] = useState(() => {
    const token = captureAccountGeneration();
    return `${token.generation}|${token.stableId ?? ''}|${token.phase}`;
  });
  const [clockSafetyKey, setClockSafetyKey] = useState(todayClockScopeKey);

  useEffect(() => subscribeAccountGeneration((token) => {
    resetTodayRuntimeMemory();
    setAccountSafetyKey(`${token.generation}|${token.stableId ?? ''}|${token.phase}`);
  }).remove, []);

  useEffect(() => {
    const refreshClockScope = () => setClockSafetyKey(todayClockScopeKey());
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1).getTime();
    const timer = setTimeout(refreshClockScope, Math.max(1_000, nextMidnight - now.getTime()));
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshClockScope();
    });
    return () => {
      clearTimeout(timer);
      appStateSub.remove();
    };
  }, [clockSafetyKey]);

  const scopeSafetyKey = `${accountSafetyKey}|${studyTarget}|${lang}|${clockSafetyKey}`;
  return <TabPane key={scopeSafetyKey} freezeWanted={freezeWanted}><TodayScreen /></TabPane>;
}

type LessonsPrivacyState = Readonly<{
  epoch: number;
  phase: AccountGenerationToken['phase'];
  failClosed: boolean;
}>;

function LessonsPaneBoundary({
  freezeWanted,
  shouldLoad,
  isActive,
}: {
  freezeWanted: boolean;
  shouldLoad: boolean;
  isActive: boolean;
}) {
  const { theme: t } = useTheme();
  const renderToken = useRef(captureAccountGeneration()).current;
  const previousTokenRef = useRef(renderToken);
  const activatedEpochRef = useRef(0);
  const [privacy, setPrivacy] = useState<LessonsPrivacyState>({
    epoch: 0,
    phase: renderToken.phase,
    failClosed: false,
  });

  useLayoutEffect(() => {
    const failClosed = () => setPrivacy((previous) => ({
      epoch: previous.epoch + 1,
      phase: 'transitioning',
      failClosed: true,
    }));
    const reconcile = (next: AccountGenerationToken) => {
      try {
        const previous = previousTokenRef.current;
        previousTokenRef.current = next;
        const initialAdoption = previous.phase === 'uninitialized' && next.phase === 'active';
        const sameActiveOwner = previous.phase === 'active'
          && next.phase === 'active'
          && previous.stableId === next.stableId;
        if (initialAdoption || sameActiveOwner) return;
        if (
          previous.generation === next.generation
          && previous.phase === next.phase
          && previous.stableId === next.stableId
        ) return;
        setPrivacy((current) => ({
          epoch: current.epoch + 1,
          phase: next.phase,
          failClosed: current.failClosed,
        }));
      } catch {
        failClosed();
      }
    };

    try {
      const subscription = subscribeAccountGeneration(reconcile);
      reconcile(captureAccountGeneration());
      return () => subscription.remove();
    } catch {
      failClosed();
      return undefined;
    }
  }, [renderToken]);

  if (isActive && privacy.phase === 'active' && !privacy.failClosed) {
    activatedEpochRef.current = privacy.epoch;
  }
  const coverLessons = privacy.failClosed
    || privacy.phase === 'transitioning'
    || activatedEpochRef.current < privacy.epoch;

  return (
    <View style={[s.lessonsPaneBoundary, { backgroundColor: t.bgPrimary }]} collapsable={false}>
      <View
        style={s.lessonsPaneContent}
        accessibilityElementsHidden={coverLessons}
        importantForAccessibility={coverLessons ? 'no-hide-descendants' : 'auto'}
        pointerEvents={coverLessons ? 'none' : 'auto'}
      >
        <TabPane freezeWanted={freezeWanted}>
          <DeferredTabScreen
            shouldLoad={shouldLoad}
            loadScreen={loadLessonsScreen}
            screenProps={{ overlayIdentityEpoch: privacy.epoch }}
          />
        </TabPane>
      </View>
      {coverLessons ? (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: t.bgPrimary }]}
          pointerEvents="auto"
          accessible={false}
        />
      ) : null}
    </View>
  );
}

function markExamBestPctTabActivity(idx: number): void {
  setExamBestPctTabActivity(idx === 0 ? 'safe_home' : 'unsafe');
}

type TabDef = {
  key: string;
  icon: IconName;
  active: IconName;
};

/** Суффиксы путей четырёх основных табов. Таб 1 — «Журнал» (статистика);
 *  legacy-суффикс `/lessons` оставлен в маппинге, чтобы старые диплинки не терялись. */
const TAB_PATH_SUFFIXES = ['/home', '/journal', '/lessons', '/tournaments', '/friends', '/settings'] as const;

const PATHNAME_TO_IDX: Record<(typeof TAB_PATH_SUFFIXES)[number], number> = {
  '/home': 0,
  '/journal': 1,
  '/lessons': 1,
  // зачем: кубок стоит ПО ЦЕНТРУ (макет 01) — это акцентная вкладка режима,
  // поэтому друзья и настройки сдвинулись на 3 и 4.
  '/tournaments': 2,
  '/friends': 3,
  '/settings': 4,
};
const IDX_TO_TAB_ROUTE: Record<number, string> = {
  0: '/(tabs)/home',
  1: '/(tabs)/journal',
  2: '/(tabs)/tournaments',
  3: '/(tabs)/friends',
  4: '/(tabs)/settings',
};

function addVisitedTab(prev: Set<number>, idx: number): Set<number> {
  if (idx < 0 || prev.has(idx)) return prev;
  const next = new Set(prev);
  next.add(idx);
  return next;
}

/** Доп. зазор между плавающей капсулой и зоной системных жестов снизу. */
const FLOATING_PILL_BOTTOM_GAP = 6;
const ENABLE_TAB_HIGHLIGHT_TRAVEL = true;
const ENABLE_TAB_PRESS_LIFT = true;
const TAB_ACTIVE_PILL_WIDTH = 48;
const TAB_ACTIVE_PILL_HEIGHT = 36;
/** Фоновый премаунт соседних табов в idle: первое открытие любого таба — мгновенное,
 *  без «плейсхолдер → полный маунт на глазах». Дёшев в связке с ENABLE_TAB_FREEZE:
 *  премаунченный таб делает первый коммит (модуль + первый рендер + старт загрузок)
 *  и тут же засыпает (Freeze), не потребляя рендеры до реального открытия. */
const ENABLE_BACKGROUND_TAB_PREMOUNT = true;
/** Заморозка (react-freeze) невидимых табов: посещённые табы живут вечно (кастомный
 *  свайпер не размонтирует их), и без freeze они продолжали рендериться в фоне —
 *  главный источник «греется через минуту». Активный таб и его соседи по свайпу
 *  не замораживаются (иначе при драге сосед был бы пустым). Kill-switch на случай
 *  регрессий на устройстве. Guardrail: tests/owner_direction_runtime_contract.test.ts. */
const ENABLE_TAB_FREEZE = true;
const TAB_FREEZE_MIN_DISTANCE = 2;
const BACKGROUND_TAB_PREMOUNT_FALLBACK_MS = 1600;
const BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS = 160;
const BACKGROUND_TAB_PREMOUNT_STEP_MS = 180;
const BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 1200;
const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 3, 2] as const;
// Guarded by tests/tabbar_scroll_chrome_contract.test.ts: keep this gesture-driven,
// native-driven mode so the tabbar can shrink/grow without per-pixel JS scaling.
// зачем: владелец попросил таббар РОВНО как у Bevel — прогресс схлопывания привязан
// к пальцу (медленно тянешь вниз — капсула медленно и частично ужимается), капсула
// ужимается по ширине в круглую кнопку («орб») активной вкладки СЛЕВА, а разворот
// происходит только когда страница вернулась наверх. Тап по орбу ТОЛЬКО разворачивает.
//
// Ширину не анимируем: layout-анимация уходит на JS-поток (перегрев и фризы уже были
// больной темой). Тот же визуальный эффект даёт scaleX с transform-origin слева +
// контр-scaleX на содержимом, чтобы иконки не сплющивались. Всё на нативном драйвере.
const TAB_COLLAPSED_ORB_ENTER_SCALE = 0.9;
/** Иконки неактивных вкладок гаснут раньше, чем капсула дожимается в круг: к моменту
 *  схлопывания в орбе должна остаться ОДНА иконка, а не стопка наложенных. */
const TAB_ICONS_FADE_OUT_END = 0.55;
/** Орб проявляется на второй половине жеста — ровно там, где сужающаяся капсула уже
 *  стала размером с круг, поэтому шва между двумя слоями глаз не ловит. */
const TAB_ORB_FADE_IN_START = 0.62;
/** Орб Ø=tabBarHeight (~58): hitSlop добирает цель до комфортных ≥44dp с запасом по краям. */
const TAB_ORB_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;
/** Путь пальца, за который капсула проходит весь путь от развёрнутой до орба.
 *  92 px ≈ треть большого пальца: медленная тяга читается как частичное сжатие,
 *  быстрый флик успевает дожать до конца ещё внутри жеста. */
const TAB_SCROLL_COLLAPSE_DISTANCE = 92;
/** Ниже этого офсета страница считается «в верхнем положении» — только тут возможен
 *  разворот. Владелец: «как только страница возвращается в верхнее положение, только
 *  тогда таббар разворачивается». */
const TAB_SCROLL_TOP_ZONE_Y = 10;
/** Порог довода после отпускания пальца: за половиной пути — дожимаем в орб, иначе
 *  возвращаем в капсулу. Ниже 0.5 нельзя — тогда лёгкое касание схлопывало бы бар. */
const TAB_SCROLL_SETTLE_THRESHOLD = 0.5;
/** Довод после отпускания. Схлопывание короче разворота: уход системный и быстрый,
 *  возврат чуть дольше — так возвращение «дороже» на ощупь. Обе кривые ease-out:
 *  ease-in на UI-элементе всегда читается как подтормаживание. */
const TAB_SCROLL_COLLAPSE_MS = 260;
const TAB_SCROLL_EXPAND_MS = 300;
/** Пауза без единого кадра скролла, после которой жест считается завершённым. */
const TAB_SCROLL_SETTLE_IDLE_MS = 90;
const TAB_UNDERLAY_DIM_ALPHA = 0.95;
const TAB_UNDERLAY_DIM_BG = `rgba(0,0,0,${TAB_UNDERLAY_DIM_ALPHA})`;
const TAB_DARK_CHROME_BORDER_ALPHA = 0.34;
const TAB_DARK_ICON_MUTED_ALPHA = 0.74;
const TAB_DARK_ACTIVE_BG_ALPHA = 0.18;
const TAB_DARK_ACTIVE_BORDER_ALPHA = 0.32;

/** Имена сегментов expo-router под `app/(tabs)/*.tsx` (без ведущих скобочных групп). */
const SEGMENT_TO_TAB_IDX: Record<string, number> = {
  home: 0,
  journal: 1,
  lessons: 1,
  tournaments: 2,
  friends: 3,
  settings: 4,
};

/**
 * При смене таба pathname иногда один кадр отстаёт от реального экрана; сегменты стабильнее.
 * Схлопнутый `/(tabs)` без дочернего сегмента = редирект из `app/(tabs)/index.tsx` на главную (0).
 *
 * Если URL — полноэкранный экран поверх группы табов (`/lesson_menu`, `/review`, …),
 * здесь возвращаем `null`: не переопределяем activeIdx таб-слайдера (иначе маппинг падал бы в «Главная»
 * и пользователь видел миганье вкладки «Главная» при переходе с «Уроки» в урок).
 */
function tabIdxFromRouter(pathnameRaw: string, segments: readonly string[]): number | null {
  const inTabsGroup = segments.some(s => s === '(tabs)');
  const nonGroup = segments.filter(s => Boolean(s) && !s.startsWith('('));

  for (let i = nonGroup.length - 1; i >= 0; i--) {
    const idx = SEGMENT_TO_TAB_IDX[nonGroup[i]!];
    if (idx !== undefined) return idx;
  }

  if (inTabsGroup && nonGroup.length === 0) {
    return PATHNAME_TO_IDX['/home'];
  }

  return tabIdxFromPathname(pathnameRaw);
}

/** Синхронно с URL — чтобы прямой вход в таб не давал кадр с activeIdx=0. */
function tabIdxFromPathname(pathnameRaw: string): number | null {
  const p = pathnameRaw.replace(/\/$/, '');
  if (p === '' || p === '/') return PATHNAME_TO_IDX['/home'];
  if (p === '/(tabs)' || p.endsWith('/(tabs)')) return PATHNAME_TO_IDX['/home'];
  for (const suf of TAB_PATH_SUFFIXES) {
    if (p === suf || p.endsWith(suf)) {
      const idx = PATHNAME_TO_IDX[suf];
      if (idx !== undefined) return idx;
    }
  }
  return null;
}

function routerShowsTab(pathnameRaw: string, segments: readonly string[], tabIdx: number): boolean {
  const idx = tabIdxFromRouter(pathnameRaw, segments);
  if (idx === null) return false;
  return idx === tabIdx;
}

// Иконки-капсулы (как в Instagram, без подписей). Порядок = индексам табов.
const TABS: TabDef[] = [
  { key: 'home',        icon: 'home-outline',        active: 'home' },
  { key: 'index',       icon: 'stats-chart-outline', active: 'stats-chart' },
  // Кубок — акцентная вкладка режима «Турниры», по центру (макет 01).
  { key: 'tournaments', icon: 'trophy-outline',      active: 'trophy' },
  { key: 'friends',     icon: 'people-outline',      active: 'people' },
  { key: 'settings',    icon: 'settings-outline',    active: 'settings' },
];


type TabScaffoldProps = { tabScreens: React.ReactNode[]; currentRouteIsTab: boolean; visualIdx: number; physicalPageIdx: PhysicalPageIndex };

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, currentRouteIsTab, visualIdx, physicalPageIdx }: TabScaffoldProps) {
  const { theme: t, ds, statusBarLight } = useTheme();
  const { tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useStableSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const topFadeScroll = useTopFadeScroll();
  /** Подложка плавающей капсулы: 95% затемнение контента под таббаром
   *  без runtime blur, с цветной обводкой/иконками от текущей темы. */
  const tabPillBorder = withAlpha(t.accent, TAB_DARK_CHROME_BORDER_ALPHA);
  const tabIconMuted = withAlpha(t.textSecond, TAB_DARK_ICON_MUTED_ALPHA);
  const tabActiveBg = withAlpha(t.accent, TAB_DARK_ACTIVE_BG_ALPHA);
  const tabActiveBorder = withAlpha(t.accent, TAB_DARK_ACTIVE_BORDER_ALPHA);
  const tabPillBottom = Math.max(PB, ds.spacing.sm) + FLOATING_PILL_BOTTOM_GAP;
  const tabOverlayHeight = tabBarHeight + tabPillBottom + ds.spacing.md;
  const [tabPillWidth, setTabPillWidth] = useState(0);
  const tabHighlightAnim = useRef(new Animated.Value(activeIdx)).current;
  const tabPressAnim = useRef(new Animated.Value(0)).current;
  const tabScrollProgress = useRef(new Animated.Value(0)).current;
  const tabScrollCollapsedRef = useRef(false);
  const tabScrollLastYRef = useRef(0);
  /** Верхняя точка, достигнутая с начала текущего движения вниз: от неё считается
   *  путь пальца, а значит и прогресс сжатия. */
  const tabScrollAnchorYRef = useRef(0);
  /** true, пока прогресс ведёт палец: в этот момент довод по таймеру ещё уместен,
   *  а после довода/фиксации — уже нет. */
  const tabScrollDrivenRef = useRef(false);
  const [pressedTabIdx, setPressedTabIdx] = useState<number | null>(null);
  /** Зеркало tabScrollCollapsedRef в state: pointerEvents и доступность слоёв капсула/орб. */
  const [tabChromeCollapsed, setTabChromeCollapsed] = useState(false);
  const orbPressAnim = useRef(new Animated.Value(0)).current;
  const firstContentReadyEmittedRef = useRef(false);
  // Press feedback must not drive selection; otherwise release can restart the highlight spring.
  const visualTabIdx = visualIdx;

  useEffect(() => {
    if (!ENABLE_TAB_HIGHLIGHT_TRAVEL) {
      tabHighlightAnim.setValue(visualTabIdx);
      return;
    }
    Animated.spring(tabHighlightAnim, {
      toValue: visualTabIdx,
      speed: 18,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, [tabHighlightAnim, visualTabIdx]);

  const endTabPress = useCallback(() => {
    if (!ENABLE_TAB_PRESS_LIFT) {
      setPressedTabIdx(null);
      return;
    }
    tabPressAnim.stopAnimation();
    Animated.spring(tabPressAnim, {
      toValue: 0,
      speed: 28,
      bounciness: 4,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPressedTabIdx(null);
      }
    });
  }, [tabPressAnim]);

  const beginTabPress = useCallback((idx: number) => {
    setPressedTabIdx(idx);
    hapticTap();
    if (!ENABLE_TAB_PRESS_LIFT) return;
    tabPressAnim.stopAnimation();
    Animated.spring(tabPressAnim, {
      toValue: 1,
      speed: 34,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  }, [tabPressAnim]);

  const tabPillPressScale = tabPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.992],
  });

  const tabActivePillPressScale = tabPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const tabActivePillPressOpacity = tabPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  /** Довод до одного из двух устойчивых состояний (капсула ↔ орб). Используется,
   *  когда прогресс перестал управляться пальцем: отпускание, тап по орбу, свайп,
   *  программная смена таба. */
  const animateTabChrome = useCallback((collapsed: boolean, immediate = false) => {
    tabScrollCollapsedRef.current = collapsed;
    setTabChromeCollapsed(collapsed);
    tabScrollProgress.stopAnimation();
    if (immediate) {
      tabScrollProgress.setValue(collapsed ? 1 : 0);
      return;
    }
    Animated.timing(tabScrollProgress, {
      toValue: collapsed ? 1 : 0,
      duration: collapsed ? TAB_SCROLL_COLLAPSE_MS : TAB_SCROLL_EXPAND_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tabScrollProgress]);

  /**
   * Скролл ведёт таббар ЗА ПАЛЬЦЕМ (модель Bevel).
   *
   * `dragged` — сколько пальцем утянуто вниз от той точки, где движение вниз началось
   * (`tabScrollAnchorYRef`). Прогресс = dragged / TAB_SCROLL_COLLAPSE_DISTANCE, поэтому
   * медленная тяга даёт частичное, видимое глазом сжатие, а не мгновенный переброс.
   *
   * Разворот НЕ привязан к пальцу намеренно: владелец просил, чтобы бар возвращался
   * только когда страница вернулась наверх — иначе любое микро-движение вверх посреди
   * длинной ленты дёргало бы бар туда-сюда.
   *
   * Экраны без скролла покрыты тем же кодом: там `bounces`/`alwaysBounceVertical`
   * (BouncyScrollView и FlashList) дают ОТРИЦАТЕЛЬНЫЙ contentOffset при тяге вниз,
   * что здесь читается как обычная тяга вниз. Отдельный жест-слой поверх контента
   * не нужен — он бы конкурировал с нативным скроллом (см. историю BouncyScrollView).
   */
  useEffect(() => {
    // Отдельный канал, а не scrollY маски: маска дросселирует свои обновления порогом,
    // а таббару нужен каждый кадр — включая отрицательный bounce на экранах без скролла.
    const scrollY = topFadeScroll?.tabBarScrollY;
    if (!scrollY) return undefined;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    /** Незавершённый жест не должен оставить бар «полусжатым». Таймер перевзводится
     *  на каждом кадре скролла, поэтому срабатывает ровно один раз — когда движение
     *  реально замерло (палец отпущен и инерция погасла). */
    const armSettle = (progress: number) => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        if (!tabScrollDrivenRef.current) return;
        tabScrollDrivenRef.current = false;
        animateTabChrome(progress >= TAB_SCROLL_SETTLE_THRESHOLD);
      }, TAB_SCROLL_SETTLE_IDLE_MS);
    };

    const id = scrollY.addListener(({ value }) => {
      const y = value;
      const previousY = tabScrollLastYRef.current;
      tabScrollLastYRef.current = y;

      // Страница наверху — единственная зона, где бар разворачивается.
      if (y <= TAB_SCROLL_TOP_ZONE_Y) {
        tabScrollAnchorYRef.current = y;
        if (tabScrollCollapsedRef.current || tabScrollDrivenRef.current) {
          if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
          tabScrollDrivenRef.current = false;
          animateTabChrome(false);
        }
        return;
      }

      // Движение вверх посреди ленты: якорь встаёт на самую верхнюю достигнутую точку,
      // чтобы следующая тяга вниз считалась от неё, а не от начала экрана.
      if (y < previousY) {
        tabScrollAnchorYRef.current = Math.min(tabScrollAnchorYRef.current, y);
        return;
      }

      if (tabScrollCollapsedRef.current) return;

      const dragged = y - tabScrollAnchorYRef.current;
      if (dragged <= 0) return;

      const progress = Math.min(1, dragged / TAB_SCROLL_COLLAPSE_DISTANCE);
      tabScrollDrivenRef.current = true;
      tabScrollProgress.setValue(progress);

      // Дожали до конца ещё внутри жеста — фиксируем свёрнутое состояние сразу,
      // чтобы орб стал кликабельным не дожидаясь отпускания пальца.
      if (progress >= 1) {
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
        tabScrollDrivenRef.current = false;
        tabScrollCollapsedRef.current = true;
        setTabChromeCollapsed(true);
        return;
      }

      armSettle(progress);
    });

    return () => {
      scrollY.removeListener(id);
      if (settleTimer) clearTimeout(settleTimer);
      tabScrollProgress.stopAnimation();
    };
  }, [animateTabChrome, tabScrollProgress, topFadeScroll?.tabBarScrollY]);


  // contract: collapsed-tap-expands-only — тап по орбу лишь разворачивает капсулу,
  // навигации нет: видна одна активная вкладка, тап по ней значит «покажи остальные».
  // Разворот идёт той же анимацией, что и схлопывание (владелец: «точно с такой же
  // анимацией разворачивается»), поэтому immediate здесь НЕ используется.
  // Якорь переносим на текущий офсет: иначе первый же кадр скролла увидел бы
  // «утянуто на пол-ленты вниз» и мгновенно схлопнул бар обратно.
  const handleOrbPress = useCallback(() => {
    hapticTap();
    tabScrollAnchorYRef.current = tabScrollLastYRef.current;
    animateTabChrome(false);
  }, [animateTabChrome]);

  /** Свайп между табами — смена контекста, а не продолжение жеста скролла: бар должен
   *  быть развёрнут сразу, поэтому здесь immediate. Якорь переносим на офсет нового
   *  таба, чтобы его первый scroll-кадр не прочитался как «утянуто вниз». */
  const handleSwipeStartChrome = useCallback((physicalIdx: number) => {
    tabScrollAnchorYRef.current = tabScrollLastYRef.current;
    tabScrollDrivenRef.current = false;
    animateTabChrome(false, true);
    onSwipeStart(physicalIdx);
  }, [animateTabChrome, onSwipeStart]);

  /** Программная смена таба: новый таб открывается наверху — таббар всегда развёрнут,
   *  lastY/якорь сбрасываем, чтобы первый scroll-кадр нового таба не дал ложную тягу. */
  const goToTabExpanded = useCallback((idx: number) => {
    tabScrollLastYRef.current = 0;
    tabScrollAnchorYRef.current = 0;
    tabScrollDrivenRef.current = false;
    animateTabChrome(false, true);
    goToTab(idx);
  }, [animateTabChrome, goToTab]);

  /* Схлопывание по ширине БЕЗ layout-анимации.
   *
   * Капсула растянута left:0/right:0, её transform-origin — центр. Чтобы правый край
   * ехал влево, а левый стоял на месте (как у Bevel), нужны два transform сразу:
   * scaleX сжимает капсулу к центру, а translateX возвращает её левый край обратно
   * к исходной позиции. Смещение = половина «съеденной» ширины.
   *
   * До первого onLayout (tabPillWidth=0) геометрия неизвестна — держим развёрнутое
   * состояние, иначе первый кадр показал бы капсулу неправильной ширины. */
  const tabCapsuleTargetScaleX = tabPillWidth > 0
    ? Math.min(1, tabBarHeight / tabPillWidth)
    : 1;
  const tabCapsuleScaleX = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, tabCapsuleTargetScaleX],
    extrapolate: 'clamp',
  });
  const tabCapsuleAnchorX = tabPillWidth > 0
    ? -((tabPillWidth - tabPillWidth * tabCapsuleTargetScaleX) / 2)
    : 0;
  const tabCapsuleTranslateX = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabCapsuleAnchorX],
    extrapolate: 'clamp',
  });

  /* Контр-масштаб содержимого: scaleX сплющил бы иконки в овалы. Обратный множитель
   * держит их круглыми на всём пути сжатия. */
  const tabCapsuleContentScaleX = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, tabCapsuleTargetScaleX > 0 ? 1 / tabCapsuleTargetScaleX : 1],
    extrapolate: 'clamp',
  });

  /* Ряд иконок сжимается вместе с капсулой (ячейки flex:1), поэтому активная иконка
   * приезжает в центр СВОЕЙ сузившейся ячейки, а не в центр круга. Доводим ряд так,
   * чтобы активная ячейка встала ровно по центру орба — иначе в свёрнутом состоянии
   * иконка стояла бы не по центру кружка, и это первое, что бросается в глаза.
   * Считаем в координатах ДО scaleX: transform применяется к уже сжатому ряду. */
  const tabCellWidth = tabPillWidth > 0 ? tabPillWidth / TABS.length : 0;
  const tabIconsRowTranslateX = tabPillWidth > 0
    ? tabScrollProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [
          0,
          // Центр круга в системе координат капсулы / целевой scaleX минус центр
          // активной ячейки: разница и есть недостающий доезд.
          tabCapsuleTargetScaleX > 0
            ? (tabBarHeight / 2) / tabCapsuleTargetScaleX
              - (visualTabIdx * tabCellWidth + tabCellWidth / 2)
            : 0,
        ],
        extrapolate: 'clamp',
      })
    : 0;

  /* Капсула держится видимой почти до конца — её место занимает орб только когда
   * она уже стала размером с круг. Никакого раннего фейда: исчезновение на середине
   * жеста и читалось владельцем как «мгновенное переключение вместо анимации». */
  const tabCapsuleOpacity = tabScrollProgress.interpolate({
    inputRange: [0, TAB_ORB_FADE_IN_START, 1],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  /* Неактивные иконки гаснут раньше остального: в сузившейся капсуле им уже нет места,
   * и без этого они наложились бы друг на друга. */
  const tabInactiveIconOpacity = tabScrollProgress.interpolate({
    inputRange: [0, TAB_ICONS_FADE_OUT_END],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const tabOrbOpacity = tabScrollProgress.interpolate({
    inputRange: [TAB_ORB_FADE_IN_START, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /* Орб входит с 0.9, не с нуля — ничто в физическом мире не появляется из ниоткуда. */
  const tabOrbScale = tabScrollProgress.interpolate({
    inputRange: [TAB_ORB_FADE_IN_START, 1],
    outputRange: [TAB_COLLAPSED_ORB_ENTER_SCALE, 1],
    extrapolate: 'clamp',
  });

  const orbPressScale = orbPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  const notifyFirstContentReady = useCallback(() => {
    if (!currentRouteIsTab || activeIdx === 0 || firstContentReadyEmittedRef.current) return;
    firstContentReadyEmittedRef.current = true;
    const emitFirstContentReady = () => emitAppEvent('app_first_content_ready');
    requestAnimationFrame(() => {
      emitFirstContentReady();
      setTimeout(emitFirstContentReady, 32);
      setTimeout(emitFirstContentReady, 120);
    });
  }, [activeIdx, currentRouteIsTab]);

  useEffect(() => {
    notifyFirstContentReady();
  }, [notifyFirstContentReady]);

  return (
    <ScreenGradient artBackdrop="home" style={{ flex: 1 }} staticParallaxY={HOME_ENTRANCE.bgDriftPx}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {/* Затемняющий верхний край: одна маска на все табы, от самого верха экрана
          (вне paddingTop-обёртки), opacity привязан к скроллу активного таба. */}
      <TopFadeMask scrollY={topFadeScroll?.scrollY} zIndex={2} />
      <View
        onLayout={notifyFirstContentReady}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View style={{ flex: 1, width: '100%', alignSelf: 'stretch', flexDirection: 'column' }}>
          <View style={s.tabContent}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <TabSlider activeIndex={physicalPageIdx} onTabChange={goToTabExpanded} onSwipeStart={handleSwipeStartChrome} onSwipeComplete={onSwipeComplete} swipeEnabled={true}>
                {tabScreens}
              </TabSlider>
            </GestureHandlerRootView>
          </View>
          {/* Плавающая капсула поверх контента: нижняя safe-area остаётся без отдельной полосы. */}
          <View
            style={[s.tabBarWrap, { height: tabOverlayHeight }]}
            pointerEvents="box-none"
          >
            <Animated.View
              onLayout={(event) => setTabPillWidth(event.nativeEvent.layout.width)}
              pointerEvents={tabChromeCollapsed ? 'none' : 'auto'}
              accessibilityElementsHidden={tabChromeCollapsed}
              importantForAccessibility={tabChromeCollapsed ? 'no-hide-descendants' : 'auto'}
              style={[
                s.tabPill,
                {
                  bottom: tabPillBottom,
                  marginHorizontal: ds.spacing.lg,
                  height: tabBarHeight,
                  borderRadius: tabBarHeight / 2,
                  borderColor: tabPillBorder,
                  shadowColor: t.shadowDark,
                  opacity: tabCapsuleOpacity,
                  transform: [
                    { translateX: tabCapsuleTranslateX },
                    { scaleX: tabCapsuleScaleX },
                    { scale: tabPillPressScale },
                  ],
                },
              ]}
            >
              {/* 95% scrim: контент едва просвечивает, но затемняется без runtime blur. */}
              <View pointerEvents="none" style={[s.tabPillFill, { backgroundColor: TAB_UNDERLAY_DIM_BG }]} />

              {/* Ряд иконок + подсветка едут одним слоем, чтобы активная вкладка
                  приехала точно в центр круга. */}
              <Animated.View
                style={[s.tabPillRow, { transform: [{ translateX: tabIconsRowTranslateX }] }]}
              >
              {ENABLE_TAB_HIGHLIGHT_TRAVEL && tabPillWidth > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    s.tabActivePill,
                    {
                      top: (tabBarHeight - TAB_ACTIVE_PILL_HEIGHT) / 2,
                      left: (tabPillWidth / TABS.length - TAB_ACTIVE_PILL_WIDTH) / 2,
                      backgroundColor: tabActiveBg,
                      borderColor: tabActiveBorder,
                      opacity: tabActivePillPressOpacity,
                      transform: [{
                        translateX: tabHighlightAnim.interpolate({
                          inputRange: TABS.map((_, i) => i),
                          outputRange: TABS.map((_, i) => i * (tabPillWidth / TABS.length)),
                          extrapolate: 'clamp',
                        }),
                      }, { scale: tabActivePillPressScale }],
                    },
                  ]}
                />
              )}

              {TABS.map((tab, i) => {
                const visuallyFocused = visualTabIdx === i;
                const color = visuallyFocused ? t.accent : tabIconMuted;
                const iconScale = pressedTabIdx === i
                  ? tabPressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
                  : 1;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    testID={`tab-${tab.key}`}
                    accessibilityLabel={`qa-tab-${tab.key}`}
                    accessible={true}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: visuallyFocused }}
                    style={s.tabBtn}
                    onPressIn={() => beginTabPress(i)}
                    onPressOut={endTabPress}
                    onPress={() => { goToTabExpanded(i); }}
                    activeOpacity={1}
                  >
                    {/* Подсветка активного таба — мягкая «пилюля» под иконкой (как в Instagram). */}
                    {!ENABLE_TAB_HIGHLIGHT_TRAVEL && visuallyFocused && (
                      <View
                        style={[
                          s.tabActivePill,
                          { backgroundColor: tabActiveBg, borderColor: tabActiveBorder },
                        ]}
                      />
                    )}
                    <Animated.View
                      style={{
                        // Контр-scaleX держит иконку круглой, пока капсула сжимается.
                        opacity: visuallyFocused ? 1 : tabInactiveIconOpacity,
                        transform: [{ scaleX: tabCapsuleContentScaleX }, { scale: iconScale }],
                      }}
                    >
                      <Ionicons
                        name={visuallyFocused ? tab.active : tab.icon}
                        size={26}
                        color={color}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
              </Animated.View>
            </Animated.View>

            {/* Орб — свёрнутый таббар (Bevel/iOS 26): круг слева с иконкой активной
                вкладки. Кроссфейд с капсулой по тому же tabScrollProgress. */}
            <Animated.View
              pointerEvents={tabChromeCollapsed ? 'auto' : 'none'}
              accessibilityElementsHidden={!tabChromeCollapsed}
              importantForAccessibility={tabChromeCollapsed ? 'auto' : 'no-hide-descendants'}
              style={[
                s.tabOrb,
                {
                  bottom: tabPillBottom,
                  left: ds.spacing.lg,
                  width: tabBarHeight,
                  height: tabBarHeight,
                  borderRadius: tabBarHeight / 2,
                  shadowColor: t.shadowDark,
                  opacity: tabOrbOpacity,
                  transform: [
                    { scale: tabOrbScale },
                    { scale: orbPressScale },
                  ],
                },
              ]}
            >
              <View pointerEvents="none" style={[s.tabPillFill, { backgroundColor: TAB_UNDERLAY_DIM_BG }]} />
              <TouchableOpacity
                testID="tab-collapsed-orb"
                accessibilityLabel="qa-tab-collapsed-orb"
                accessible={true}
                accessibilityRole="button"
                style={s.tabOrbBtn}
                hitSlop={TAB_ORB_HIT_SLOP}
                onPressIn={() => {
                  Animated.spring(orbPressAnim, { toValue: 1, speed: 34, bounciness: 6, useNativeDriver: true }).start();
                }}
                onPressOut={() => {
                  Animated.spring(orbPressAnim, { toValue: 0, speed: 28, bounciness: 4, useNativeDriver: true }).start();
                }}
                onPress={handleOrbPress}
                activeOpacity={1}
              >
                <Ionicons
                  name={(TABS[visualTabIdx] ?? TABS[0]).active}
                  size={26}
                  color={t.accent}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </ScreenGradient>
  );
}

function scheduleIdleTask(run: () => void, timeoutMs: number): CancelableTask {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idleHandle: unknown = null;
  const requestIdle = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void, options?: { timeout?: number }) => unknown);
  const cancelIdle = (globalThis as any).cancelIdleCallback as undefined | ((handle: unknown) => void);
  const invoke = () => {
    if (cancelled) return;
    run();
  };

  if (requestIdle) {
    idleHandle = requestIdle(invoke, { timeout: timeoutMs });
  } else {
    timer = setTimeout(invoke, 80);
  }

  return {
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (idleHandle !== null && cancelIdle) cancelIdle(idleHandle);
    },
  };
}

export default function TabLayout() {
  const { width: tabPaneWidth } = useScreen();
  const { theme: t } = useTheme();
  const pathname = usePathname();
  const segments = useSegments();
  const [activeIdx, setActiveIdx] = useState(() => tabIdxFromRouter(pathname, segments) ?? 0);
  const [visualIdx, setVisualIdx] = useState(() => tabIdxFromRouter(pathname, segments) ?? 0);
  const [physicalPageIdx, setPhysicalPageIdx] = useState<PhysicalPageIndex>(() => logicalTabToPhysicalPage(tabIdxFromRouter(pathname, segments) ?? 0));
  const physicalPageIdxRef = useRef(physicalPageIdx);
  physicalPageIdxRef.current = physicalPageIdx;
  const [todaySessionEpoch, setTodaySessionEpoch] = useState(0);
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const visualIdxRef = useRef(visualIdx);
  visualIdxRef.current = visualIdx;
  const [focusTick, setFocusTick] = useState(0);
  // Ліниве монтування: слот таба появляется сразу, а тяжелый экран монтируется в idle после первого кадра.
  // Начальный таб всегда в visited/mounted — чтобы первый рендер не был плейсхолдером.
  const [visitedTabs, setVisitedTabs] = useState(() => {
    const initial = tabIdxFromRouter(pathname, segments) ?? 0;
    return new Set<number>([0, initial]);
  });
  const visitedTabsRef = useRef(visitedTabs);
  visitedTabsRef.current = visitedTabs;
  const [mountedTabs, setMountedTabs] = useState(() => {
    const initial = tabIdxFromRouter(pathname, segments) ?? 0;
    return new Set<number>([0, initial]);
  });
  const mountedTabsRef = useRef(mountedTabs);
  mountedTabsRef.current = mountedTabs;
  const scheduledMountsRef = useRef<Map<number, CancelableTask>>(new Map());
  const router = useRouter();
  const backgroundPremountStartedRef = useRef(false);
  const backgroundPremountTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Пока router.replace ещё не обновил pathname, useLayoutEffect не должен откатить вкладку по старому URL. */
  const pendingTabIdxRef = useRef<number | null>(null);
  const initialExamBestPctTabIdxRef = useRef(tabIdxFromRouter(pathname, segments) ?? activeIdxRef.current);

  useLayoutEffect(() => {
    markExamBestPctTabActivity(initialExamBestPctTabIdxRef.current);
    return () => setExamBestPctTabActivity('unknown');
  }, []);

  const scheduleMount = useCallback((idx: number) => {
    if (idx < 0 || mountedTabsRef.current.has(idx) || scheduledMountsRef.current.has(idx)) return;

    const task = scheduleIdleTask(() => {
      scheduledMountsRef.current.delete(idx);
      if (AppState.currentState !== 'active') return;
      if (idx !== 0 && !prewarmDeferredTabScreen(idx)) return;
      requestAnimationFrame(() => {
        if (AppState.currentState !== 'active') return;
        setVisitedTabs((prev) => addVisitedTab(prev, idx));
        setMountedTabs((prev) => addVisitedTab(prev, idx));
      });
    }, BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS);

    scheduledMountsRef.current.set(idx, task);
  }, []);

  useEffect(() => () => {
    scheduledMountsRef.current.forEach((task) => task.cancel?.());
    scheduledMountsRef.current.clear();
    backgroundPremountTimersRef.current.forEach((timer) => clearTimeout(timer));
    backgroundPremountTimersRef.current = [];
  }, []);

  // До paint: pathname + segments, чтобы индекс не отставал и TabSlider не кадрил старый слайд.
  useLayoutEffect(() => {
    const fromRouter = tabIdxFromRouter(pathname, segments);
    const pending = pendingTabIdxRef.current;
    if (pending !== null && fromRouter !== null && fromRouter === pending) {
      pendingTabIdxRef.current = null;
    }
    if (pendingTabIdxRef.current !== null) {
      const hold = pendingTabIdxRef.current;
      markExamBestPctTabActivity(hold);
      if (!visitedTabsRef.current.has(hold)) {
        setVisitedTabs((prev) => addVisitedTab(prev, hold));
      }
      scheduleMount(hold);
      if (visualIdxRef.current !== hold) {
        setVisualIdx(hold);
      }
      if (activeIdxRef.current !== hold) {
        setActiveIdx(hold);
      }
      const physical = logicalTabToPhysicalPage(hold);
      if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
      return;
    }
    if (fromRouter !== null) {
      markExamBestPctTabActivity(fromRouter);
      if (!visitedTabsRef.current.has(fromRouter)) {
        setVisitedTabs((prev) => addVisitedTab(prev, fromRouter));
      }
      scheduleMount(fromRouter);
      if (visualIdxRef.current !== fromRouter) {
        setVisualIdx(fromRouter);
      }
      if (activeIdxRef.current !== fromRouter) {
        setActiveIdx(fromRouter);
      }
      const physical = logicalTabToPhysicalPage(fromRouter);
      if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
    }
  }, [pathname, scheduleMount, segments]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  const scheduleBackgroundPremount = useCallback(() => {
    if (!ENABLE_BACKGROUND_TAB_PREMOUNT || backgroundPremountStartedRef.current) return;
    if (AppState.currentState !== 'active') return;
    backgroundPremountStartedRef.current = true;

    BACKGROUND_TAB_PREMOUNT_ORDER.forEach((idx, order) => {
      const timer = setTimeout(() => {
        backgroundPremountTimersRef.current = backgroundPremountTimersRef.current.filter((entry) => entry !== timer);
        scheduleMount(idx);
      }, BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS + order * BACKGROUND_TAB_PREMOUNT_STEP_MS);
      backgroundPremountTimersRef.current.push(timer);
    });
  }, [scheduleMount]);

  useEffect(() => {
    if (!ENABLE_BACKGROUND_TAB_PREMOUNT) return;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const startPremount = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      scheduleBackgroundPremount();
    };

    const sub = onAppEvent('app_first_content_ready', startPremount);
    fallbackTimer = setTimeout(startPremount, BACKGROUND_TAB_PREMOUNT_FALLBACK_MS);
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      sub.remove();
    };
  }, [scheduleBackgroundPremount]);

  const rememberVisitedTab = useCallback((idx: number) => {
    setVisitedTabs((prev) => addVisitedTab(prev, idx));
  }, []);

  /** Вызывается в момент отпускания пальца (до анимации): хром таббара догоняет сразу,
   *  а реальный activeIdx/URL переключаются после UI-thread анимации. */
  const handleSwipeStart = useCallback((physicalIdx: number) => {
    const idx = physicalPageToLogicalTab(physicalIdx);
    setExamBestPctTabActivity('unsafe');
    setVisualIdx(idx);
    if (physicalIdx === 0 || idx === activeIdxRef.current) return;
    rememberVisitedTab(idx);
    scheduleMount(idx);
  }, [rememberVisitedTab, scheduleMount]);

  const routerNavigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTo = useCallback((idx: number) => {
    const target = IDX_TO_TAB_ROUTE[idx];
    if (!target) return;
    if (routerShowsTab(pathname, segments, idx)) return;
    // Откладываем router.navigate на следующий frame после отрисовки UI — иначе
    // usePathname()-change → useLayoutEffect → React re-render вызывает белый кадр.
    if (routerNavigateTimerRef.current) clearTimeout(routerNavigateTimerRef.current);
    routerNavigateTimerRef.current = setTimeout(() => {
      pendingTabIdxRef.current = idx;
      router.navigate(target as any);
    }, 0);
  }, [pathname, segments, router]);

  useEffect(() => () => {
    if (routerNavigateTimerRef.current) clearTimeout(routerNavigateTimerRef.current);
  }, []);

  /** Тап по таббару — немедленно обновляем UI, URL обновляем асинхронно. */
  const handleTabChange = useCallback((idx: number) => {
    markExamBestPctTabActivity(idx);
    setVisualIdx(idx);
    const physical = logicalTabToPhysicalPage(idx);
    setPhysicalPageIdx(physical);
    if (idx === activeIdxRef.current && physicalPageIdxRef.current === physical) return;
    setActiveIdx(idx);
    rememberVisitedTab(idx);
    scheduleMount(idx);
    navigateTo(idx);
  }, [navigateTo, rememberVisitedTab, scheduleMount]);

  /** Свайп завершён — теперь обновляем реальный активный таб и затем URL. */
  const handleSwipeComplete = useCallback((physicalIdx: number) => {
    const physical = physicalIdx as PhysicalPageIndex;
    const wasToday = physicalPageIdxRef.current === 0;
    physicalPageIdxRef.current = physical;
    const idx = physicalPageToLogicalTab(physical);
    markExamBestPctTabActivity(idx);
    setPhysicalPageIdx(physical);
    setVisualIdx(idx);
    if (physical === 0) {
      setActiveIdx(0);
      if (!wasToday) setTodaySessionEpoch((epoch) => epoch + 1);
      return;
    }
    if (idx !== activeIdxRef.current) {
      setActiveIdx(idx);
      rememberVisitedTab(idx);
      scheduleMount(idx);
    }
    navigateTo(idx);
  }, [navigateTo, rememberVisitedTab, scheduleMount]);

  useEffect(() => {
    if (physicalPageIdx !== 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleTabChange(0);
      return true;
    });
    return () => subscription.remove();
  }, [handleTabChange, physicalPageIdx]);

  const currentRouteIsTab = tabIdxFromRouter(pathname, segments) !== null;

  const tabScreens = useMemo(() => {
    // Главная всегда в дереве; остальные табы получают слот сразу, а реальные экраны
    // по одному монтируются в фоне после первого готового кадра, чтобы первый тап не видел пустой placeholder.
    const placeholder = (k: string) => (
      <View key={k} style={{ width: tabPaneWidth, flex: 1, backgroundColor: t.bgPrimary }} collapsable={false} />
    );

    const show = (i: number) => i === 0 || i === activeIdx || visitedTabs.has(i);
    const shouldLoad = (i: number) => mountedTabs.has(i);
    // Замораживаем табы дальше чем сосед активного: активный + оба соседа живут
    // (свайп-драг показывает соседнюю панель — она не должна быть пустой).
    const freezeWanted = (logicalIdx: number) => Math.abs(logicalTabToPhysicalPage(logicalIdx) - physicalPageIdx) >= TAB_FREEZE_MIN_DISTANCE;
    return [
      <TodayPaneBoundary key="today" freezeWanted={Math.abs(physicalPageIdx) >= TAB_FREEZE_MIN_DISTANCE} />,
      show(0) ? <TabPane key="home" freezeWanted={freezeWanted(0)}><HomeScreen /></TabPane> : placeholder('ph-home'),
      show(1) ? (
        <LessonsPaneBoundary
          key="index"
          freezeWanted={freezeWanted(1)}
          shouldLoad={shouldLoad(1)}
          isActive={activeIdx === 1 && physicalPageIdx === logicalTabToPhysicalPage(1)}
        />
      ) : placeholder('ph-index'),
      // зачем: кубок стоит по центру (макет 01) — порядок здесь ОБЯЗАН
      // совпадать с TABS и LOGICAL_TAB_IDS, иначе кнопка таббара открывает
      // соседний экран, а последний вылетает.
      show(2) ? <TabPane key="tournaments" freezeWanted={freezeWanted(2)}><DeferredTabScreen shouldLoad={shouldLoad(2)} loadScreen={loadTournamentsScreen} /></TabPane> : placeholder('ph-tournaments'),
      show(3) ? <TabPane key="friends" freezeWanted={freezeWanted(3)}><DeferredTabScreen shouldLoad={shouldLoad(3)} loadScreen={loadFriendsScreen} /></TabPane> : placeholder('ph-friends'),
      show(4) ? <TabPane key="settings" freezeWanted={freezeWanted(4)}><DeferredTabScreen shouldLoad={shouldLoad(4)} loadScreen={loadSettingsScreen} /></TabPane> : placeholder('ph-settings'),
    ];
  }, [activeIdx, mountedTabs, physicalPageIdx, t.bgPrimary, tabPaneWidth, visitedTabs]);

  const runtimeOwnerId = physicalPageToRuntimeOwner(physicalPageIdx);

  return (
    <TabProvider activeIdx={activeIdx} runtimeOwnerId={runtimeOwnerId} todaySessionEpoch={todaySessionEpoch} onTabChange={handleTabChange} onSwipeStart={handleSwipeStart} onSwipeComplete={handleSwipeComplete} focusTick={focusTick}>
      <TopFadeScrollProvider>
        <TabScaffold tabScreens={tabScreens} currentRouteIsTab={currentRouteIsTab} visualIdx={visualIdx} physicalPageIdx={physicalPageIdx} />
      </TopFadeScrollProvider>
    </TabProvider>
  );
}

const s = StyleSheet.create({

  deferredTabPlaceholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lessonsPaneBoundary: {
    flex: 1,
    minHeight: 0,
  },
  lessonsPaneContent: {
    flex: 1,
    minHeight: 0,
  },
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). Фон прозрачный — градиент с TabScaffold, без белого «просвета». */
  tabContent: { flex: 1, minHeight: 0, width: '100%', backgroundColor: 'transparent' },
  /** Нижний overlay не резервирует место: контент уходит под него без отдельной safe-area полосы. */
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  /** Плавающая капсула: отрывается от низа и краёв, полностью скруглена, со статичным фоном. */
  tabPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0,
    // Объёмная тень, чтобы капсула «парила» над контентом.
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  tabPillFill: { ...StyleSheet.absoluteFillObject },
  /** Ряд иконок внутри капсулы: едет одним слоем при схлопывании, чтобы активная
   *  вкладка приехала точно в центр круглого орба. */
  tabPillRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', position: 'relative', zIndex: 10 },
  /** Подсветка активного таба внутри капсулы — мягкая пилюля под иконкой. */
  tabActivePill: {
    position: 'absolute',
    width: TAB_ACTIVE_PILL_WIDTH,
    height: TAB_ACTIVE_PILL_HEIGHT,
    borderRadius: TAB_ACTIVE_PILL_HEIGHT / 2,
    borderWidth: 0,
  },
  /** Орб — свёрнутое состояние таббара: меньше площадь → сильнее «парит»
   *  (плотнее opacity при том же радиусе, что у капсулы — дороже radius нельзя, перф). */
  tabOrb: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 12,
  },
  tabOrbBtn: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
