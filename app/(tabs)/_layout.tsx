import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Freeze } from 'react-freeze';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, StatusBar, Animated, AppState, BackHandler } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withSpring,
  Extrapolation,
} from 'react-native-reanimated';
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
// Guarded by tests/tabbar_scroll_chrome_contract.test.ts.
//
// зачем: владелец попросил таббар РОВНО как у Bevel — прогресс схлопывания привязан
// к пальцу, капсула сжимается в круглую кнопку («орб») активной вкладки СЛЕВА, а
// разворот происходит только когда страница вернулась наверх. Тап по орбу ТОЛЬКО
// разворачивает.
//
// 2026-07-26, вторая итерация. Первая версия сжимала капсулу через scaleX с контр-
// масштабом иконок — владелец забраковал: иконки заметно растягивало, и кубическая
// кривая читалась как «клюющая». Ресёрч боевых реализаций (expo-glass-tabs,
// SwiftUI Liquid Glass tab bars) показал единый приём, который здесь и применён:
//   • анимируется НАСТОЯЩАЯ ширина капсулы, а не scaleX — поэтому геометрия иконок
//     не искажается вообще, ни на одном кадре;
//   • иконки фиксированного размера, их никто не масштабирует: неактивные ГАСНУТ
//     заметно раньше, чем капсула дожимается, а лишнее обрезает overflow:hidden;
//   • движение — ПРУЖИНА с критическим затуханием (без отскока): при развороте
//     жеста пружина плавно перецеливается с текущей скорости, тогда как временная
//     кривая рестартовала бы с нуля и давала тот самый «клевок».
// Layout-анимация здесь безопасна: она идёт worklet'ом на UI-потоке (Reanimated),
// а не через JS-поток — именно JS-поток был причиной перегрева, а не сам факт
// изменения ширины.
/** Орб Ø=tabBarHeight (~58): hitSlop добирает цель до комфортных ≥44dp с запасом по краям. */
const TAB_ORB_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;
/** Путь пальца, за который капсула проходит весь путь от развёрнутой до орба. */
const TAB_SCROLL_COLLAPSE_DISTANCE = 92;
/** Ниже этого офсета страница считается «в верхнем положении» — только тут возможен
 *  разворот. Владелец: «как только страница возвращается в верхнее положение, только
 *  тогда таббар разворачивается». */
const TAB_SCROLL_TOP_ZONE_Y = 10;
/** Порог довода после отпускания пальца: за половиной пути — дожимаем в орб, иначе
 *  возвращаем в капсулу. */
const TAB_SCROLL_SETTLE_THRESHOLD = 0.5;
/** Пауза без единого кадра скролла, после которой жест считается завершённым. */
const TAB_SCROLL_SETTLE_IDLE_MS = 90;
/** Пружина довода. dampingRatio=1 — критическое затухание: доезжает плавно и
 *  останавливается без отскока. Отскок на изменении РАЗМЕРА читается как дефект
 *  (на трансформах он уместен, на геометрии — нет). 380 мс вместо прежних 260/300:
 *  владелец просил медленнее и мягче. */
const TAB_CHROME_SPRING = { duration: 380, dampingRatio: 1 } as const;
/** Неактивные иконки должны исчезнуть ЗАДОЛГО до того, как капсула сузится до круга —
 *  иначе видно, как их «поджимает» краем. 0.34 = гаснут на первой трети пути. */
const TAB_ICONS_FADE_OUT_END = 0.34;
const TAB_UNDERLAY_DIM_ALPHA = 0.95;
const TAB_UNDERLAY_DIM_BG = `rgba(0,0,0,${TAB_UNDERLAY_DIM_ALPHA})`;
const TAB_DARK_ICON_MUTED_ALPHA = 0.74;
const TAB_DARK_ACTIVE_BG_ALPHA = 0.18;

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
   *  без runtime blur, с цветными иконками от текущей темы. Обводок нет —
   *  разделение тоном и тенью (правило владельца). */
  const tabIconMuted = withAlpha(t.textSecond, TAB_DARK_ICON_MUTED_ALPHA);
  const tabActiveBg = withAlpha(t.accent, TAB_DARK_ACTIVE_BG_ALPHA);
  const tabPillBottom = Math.max(PB, ds.spacing.sm) + FLOATING_PILL_BOTTOM_GAP;
  const tabOverlayHeight = tabBarHeight + tabPillBottom + ds.spacing.md;
  const [tabPillWidth, setTabPillWidth] = useState(0);
  const tabHighlightAnim = useRef(new Animated.Value(activeIdx)).current;
  const tabPressAnim = useRef(new Animated.Value(0)).current;
  /** 0 = развёрнутая капсула, 1 = круглый орб. Reanimated shared value: пишется и
   *  читается на UI-потоке, поэтому анимация ширины не трогает JS-поток. */
  const tabScrollProgress = useSharedValue(0);
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
    const target = collapsed ? 1 : 0;
    // Пружина, а не timing: при развороте жеста на полпути она перецеливается с
    // ТЕКУЩЕЙ скорости, тогда как временная кривая стартовала бы заново — это и
    // читалось владельцем как «клюющее» движение.
    tabScrollProgress.value = immediate ? target : withSpring(target, TAB_CHROME_SPRING);
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
      // Пока ведёт палец — пишем напрямую, без пружины: прогресс обязан совпадать
      // с жестом кадр в кадр. Пружина включается только на доводе после отпускания.
      tabScrollProgress.value = progress;

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

  /* Схлопывание НАСТОЯЩЕЙ шириной — ключевое отличие от первой версии.
   *
   * scaleX деформировал бы содержимое, и никакой контр-масштаб этого до конца не
   * лечит (владелец увидел растягивание иконок). Здесь капсула меняет реальную
   * ширину: иконки внутри вообще не трогаются трансформами, сохраняют свою
   * геометрию покадрово, а лишнее срезает overflow:hidden на капсуле.
   *
   * Это layout-свойство, но анимация идёт worklet'ом на UI-потоке (Reanimated),
   * то есть JS-поток не участвует — запрет проекта касался именно JS-потока.
   *
   * Ширина берётся из измеренной: до первого onLayout (tabPillWidth=0) держим
   * развёрнутое состояние, иначе первый кадр показал бы неверную геометрию. */
  const tabCapsuleStyle = useAnimatedStyle(() => {
    if (tabPillWidth <= 0) return { width: undefined as unknown as number };
    return {
      width: interpolate(
        tabScrollProgress.value,
        [0, 1],
        [tabPillWidth, tabBarHeight],
        Extrapolation.CLAMP,
      ),
    };
  }, [tabPillWidth, tabBarHeight]);

  /* Ряд иконок держит ИСХОДНУЮ ширину капсулы (width зафиксирована в px) и прижат
   * влево. Поэтому при сужении капсулы ячейки не пересчитываются: иконки стоят на
   * своих местах, а правые просто уходят за край и срезаются overflow:hidden —
   * ровно так это сделано в боевых реализациях. */
  const tabIconsRowStyle = useAnimatedStyle(() => {
    if (tabPillWidth <= 0) return {};
    const cell = tabPillWidth / TABS.length;
    // Активная иконка доезжает в центр круга: её ячейка встаёт под центр орба.
    const activeCellCenter = visualTabIdx * cell + cell / 2;
    return {
      transform: [{
        translateX: interpolate(
          tabScrollProgress.value,
          [0, 1],
          [0, tabBarHeight / 2 - activeCellCenter],
          Extrapolation.CLAMP,
        ),
      }],
    };
  }, [tabPillWidth, tabBarHeight, visualTabIdx]);

  /* Неактивные иконки гаснут на первой трети пути — задолго до того, как капсула
   * сузится до круга. Иначе видно, как их поджимает краем. */
  const tabInactiveIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tabScrollProgress.value,
      [0, TAB_ICONS_FADE_OUT_END],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* Подсветка активной вкладки не нужна в свёрнутом состоянии: круг сам и есть
   * подсветка. Гаснет вместе с неактивными иконками. */
  const tabActivePillFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      tabScrollProgress.value,
      [0, TAB_ICONS_FADE_OUT_END],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

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
            {/* Измеритель ПОЛНОЙ ширины развёрнутой капсулы. Лежит СНАРУЖИ капсулы:
                та анимирует width и клипует содержимое, поэтому её собственный
                onLayout выдавал бы промежуточные значения. Нулевая высота, невидим. */}
            <View
              pointerEvents="none"
              style={[s.tabPillMeasure, { left: ds.spacing.lg, right: ds.spacing.lg }]}
              onLayout={(event) => setTabPillWidth(event.nativeEvent.layout.width)}
            />

            {/* Одна капсула на оба состояния: она САМА сужается до круга. Отдельного
                слоя-орба больше нет — кроссфейд двух слоёв и был источником «шва»,
                а морфинг одного элемента честнее и дешевле. */}
            <Reanimated.View
              pointerEvents="box-none"
              style={[
                s.tabPill,
                tabCapsuleStyle,
                {
                  bottom: tabPillBottom,
                  left: ds.spacing.lg,
                  height: tabBarHeight,
                  borderRadius: tabBarHeight / 2,
                  shadowColor: t.shadowDark,
                },
              ]}
            >
              {/* 95% scrim: контент едва просвечивает, но затемняется без runtime blur. */}
              <View pointerEvents="none" style={[s.tabPillFill, { backgroundColor: TAB_UNDERLAY_DIM_BG }]} />

              {/* Ряд фиксированной ширины: при сужении капсулы ячейки НЕ пересчитываются,
                  иконки сохраняют геометрию, правые уходят под overflow:hidden. */}
              <Reanimated.View
                pointerEvents={tabChromeCollapsed ? 'none' : 'auto'}
                accessibilityElementsHidden={tabChromeCollapsed}
                importantForAccessibility={tabChromeCollapsed ? 'no-hide-descendants' : 'auto'}
                style={[
                  s.tabPillRow,
                  tabIconsRowStyle,
                  tabPillWidth > 0 ? { width: tabPillWidth } : null,
                ]}
              >
              {ENABLE_TAB_HIGHLIGHT_TRAVEL && tabPillWidth > 0 && (
                <Reanimated.View pointerEvents="none" style={tabActivePillFadeStyle}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      s.tabActivePill,
                      {
                        top: (tabBarHeight - TAB_ACTIVE_PILL_HEIGHT) / 2,
                        left: (tabPillWidth / TABS.length - TAB_ACTIVE_PILL_WIDTH) / 2,
                        backgroundColor: tabActiveBg,
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
                </Reanimated.View>
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
                    style={[s.tabBtn, tabPillWidth > 0 ? { width: tabPillWidth / TABS.length } : null]}
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
                          { backgroundColor: tabActiveBg },
                        ]}
                      />
                    )}
                    {/* Иконка НИЧЕМ не масштабируется от прогресса схлопывания —
                        только press-федбек. Неактивные просто гаснут. */}
                    <Reanimated.View style={visuallyFocused ? undefined : tabInactiveIconStyle}>
                      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                        <Ionicons
                          name={visuallyFocused ? tab.active : tab.icon}
                          size={26}
                          color={color}
                        />
                      </Animated.View>
                    </Reanimated.View>
                  </TouchableOpacity>
                );
              })}
              </Reanimated.View>

              {/* Кнопка свёрнутого состояния лежит поверх круга: та же геометрия,
                  что и у капсулы, поэтому «шва» между состояниями нет вовсе. */}
              <Animated.View
                pointerEvents={tabChromeCollapsed ? 'auto' : 'none'}
                accessibilityElementsHidden={!tabChromeCollapsed}
                importantForAccessibility={tabChromeCollapsed ? 'auto' : 'no-hide-descendants'}
                style={[
                  s.tabOrbHit,
                  { width: tabBarHeight, height: tabBarHeight, transform: [{ scale: orbPressScale }] },
                ]}
              >
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
                />
              </Animated.View>
            </Reanimated.View>
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
  /** Плавающая капсула: отрывается от низа и краёв, полностью скруглена, со статичным фоном.
   *  Привязана к ЛЕВОМУ краю (не left+right): ширина анимируется, и правый край
   *  должен уезжать влево, пока левый стоит на месте. overflow:hidden срезает иконки,
   *  которые не поместились — благодаря этому их не нужно масштабировать. */
  tabPill: {
    position: 'absolute',
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
  /** Нулевой по высоте измеритель полной ширины развёрнутой капсулы: сама капсула
   *  анимирует width и клипует содержимое, поэтому её onLayout давал бы промежуточные
   *  значения. Прижат к низу — tabBarWrap клипует по своей высоте. */
  tabPillMeasure: {
    position: 'absolute',
    bottom: 0,
    height: 0,
  },
  /** Ряд иконок внутри капсулы: фиксированной ширины (ячейки не пересчитываются при
   *  сужении), едет одним слоем, чтобы активная вкладка приехала в центр круга. */
  tabPillRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  /** Прозрачная кнопка поверх круга в свёрнутом состоянии. */
  tabOrbHit: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  /** Ширина ячейки задаётся явно (tabPillWidth / TABS.length), а не flex:1 — иначе
   *  при сужении капсулы ячейки пересчитывались бы и иконки «съезжались». */
  tabBtn:     { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', position: 'relative', zIndex: 10 },
  /** Подсветка активного таба внутри капсулы — мягкая пилюля под иконкой. */
  tabActivePill: {
    position: 'absolute',
    width: TAB_ACTIVE_PILL_WIDTH,
    height: TAB_ACTIVE_PILL_HEIGHT,
    borderRadius: TAB_ACTIVE_PILL_HEIGHT / 2,
    borderWidth: 0,
  },
  tabOrbBtn: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
