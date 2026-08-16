import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Freeze } from 'react-freeze';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, StatusBar, Animated, Easing, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TopFadeMask from '../../components/TopFadeMask';
import { TopFadeScrollProvider, useTopFadeScroll } from '../../components/TopFadeScrollContext';
import { DeferredRedirect } from '../../components/DeferredRedirect';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { HOME_ENTRANCE } from '../../constants/motion';
import { OLIVE_RICH } from '../../constants/oliveTheme';
import { emitAppEvent, onAppEvent } from '../events';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import HomeScreen       from './home';
import DevHubSheetGate from '../../components/dev/DevHubSheetGate';
import { ENABLE_DEV_TOOLS } from '../config';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import {
  setExamBestPctTabActivity,
} from '../exam_best_pct_overlay';
import {
  logicalTabToPhysicalPage,
  physicalPageToLogicalTab,
  physicalPageToRuntimeOwner,
  type PhysicalPageIndex,
} from '../tab_page_model';

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

type TabScreenProps = {
  overlayIdentityEpoch?: number;
  presentation?: 'tab' | 'push';
};
type TabScreenComponent = React.ComponentType<TabScreenProps>;
type DeferredTabModule = { default: TabScreenComponent };
type CancelableTask = { cancel?: () => void };

let deferredLessonsScreen: TabScreenComponent | null = null;
let deferredFriendsScreen: TabScreenComponent | null = null;
let deferredSettingsScreen: TabScreenComponent | null = null;

function loadLessonsScreen(): TabScreenComponent {
  deferredLessonsScreen ??= (require('./lessons') as DeferredTabModule).default;
  return deferredLessonsScreen;
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
    case 2: return loadFriendsScreen();
    case 3: return loadSettingsScreen();
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
 * Freeze включается только ПОСЛЕ незамороженного коммита. Это нужно не только при
 * первом премаунте: при прямом прыжке через несколько вкладок runtimeOwnerId и
 * freezeWanted меняются одним родительским коммитом. react-freeze приостановил бы
 * исходящее поддерево раньше, чем оно увидит потерю ownership и выполнит cleanup.
 * Поэтому false -> true сначала коммитит children незамороженными, а пассивный
 * effect вооружает Freeze следующим коммитом. false размораживает синхронно.
 */
function TabPane({ freezeWanted, children }: { freezeWanted: boolean; children: React.ReactNode }) {
  const [freezeCommitted, setFreezeCommitted] = useState(false);
  useEffect(() => { setFreezeCommitted(freezeWanted); }, [freezeWanted]);
  const freezeActive = ENABLE_TAB_FREEZE && freezeWanted && freezeCommitted;
  return <Freeze freeze={freezeActive}>{children}</Freeze>;
}

type LessonsPrivacyState = Readonly<{
  epoch: number;
  phase: AccountGenerationToken['phase'];
  failClosed: boolean;
}>;

function LessonsPaneBoundary({
  freezeWanted,
  shouldLoad,
}: {
  freezeWanted: boolean;
  shouldLoad: boolean;
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
        // зачем: первое «усыновление» владельца (uninitialized → active) — это НЕ
        // смена аккаунта, новую эпоху заводить нельзя (иначе крышка закрылась бы
        // поверх уже показанного списка). Но записать фазу обязаны: без этого
        // privacy.phase навсегда оставался 'uninitialized', и любое условие,
        // смотрящее на фазу, держало вкладку закрытой — пустой экран.
        const initialAdoption = previous.phase === 'uninitialized' && next.phase === 'active';
        if (initialAdoption) {
          setPrivacy((current) => ({ ...current, phase: 'active' }));
          return;
        }
        const sameActiveOwner = previous.phase === 'active'
          && next.phase === 'active'
          && previous.stableId === next.stableId;
        if (sameActiveOwner) return;
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

  // зачем: крышка снималась только когда таб уже АКТИВЕН (isActive). Но вкладка
  // премаунтится в фоне и в момент премаунта неактивна — эпоха не «усыновлялась»,
  // и при первом открытии список был закрыт глухой заливкой bgPrimary (пустой
  // экран), пока какой-нибудь перерендер не совпал с isActive. Приватность держит
  // phase: 'active' означает, что владелец уже известен и это НЕ переходное
  // состояние между аккаунтами, поэтому смотреть на видимость таба здесь не нужно.
  if (privacy.phase === 'active' && !privacy.failClosed) {
    activatedEpochRef.current = privacy.epoch;
  }
  const coverLessons = privacy.failClosed
    || privacy.phase !== 'active'
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
            key={`lessons-${privacy.epoch}`}
            shouldLoad={shouldLoad}
            loadScreen={loadLessonsScreen}
            screenProps={{ overlayIdentityEpoch: privacy.epoch, presentation: 'tab' }}
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

/** Суффиксы основных табов. `/journal` остаётся legacy-якорем вкладки уроков. */
const TAB_PATH_SUFFIXES = ['/home', '/journal', '/lessons', '/friends', '/settings'] as const;

const PATHNAME_TO_IDX: Record<(typeof TAB_PATH_SUFFIXES)[number], number> = {
  '/home': 0,
  '/journal': 1,
  '/lessons': 1,
  '/friends': 2,
  '/settings': 3,
};
const IDX_TO_TAB_ROUTE: Record<number, string> = {
  0: '/(tabs)/home',
  1: '/(tabs)/lessons',
  2: '/(tabs)/friends',
  3: '/(tabs)/settings',
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
/** Фоново прогреваем все отложенные вкладки в их логическом порядке. */
const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3] as const;
// The entire capsule stays visible and only compacts slightly on downward scroll.
const TAB_SCROLL_COLLAPSED_SCALE = 0.9;
const TAB_SCROLL_COLLAPSED_TRANSLATE_Y = 8;
const TAB_SCROLL_COLLAPSED_OPACITY = 0.94;
const TAB_SCROLL_COLLAPSE_TRIGGER_Y = 36;
const TAB_SCROLL_EXPAND_TRIGGER_Y = 10;
const TAB_SCROLL_DIRECTION_EPSILON = 5;
const TAB_SCROLL_COLLAPSE_MS = 220;
const TAB_SCROLL_EXPAND_MS = 260;
const TAB_SCROLL_TOGGLE_COOLDOWN_MS = 140;
const TAB_UNDERLAY_DIM_ALPHA = 0.95;
const TAB_UNDERLAY_DIM_BG = `rgba(0,0,0,${TAB_UNDERLAY_DIM_ALPHA})`;
const TAB_DARK_ACTIVE_BG_ALPHA = 0.18;
const TAB_DARK_ICON_MUTED_ALPHA = 0.74;

/** Имена сегментов expo-router под `app/(tabs)/*.tsx` (без ведущих скобочных групп).
 *  journal — legacy-якорь вкладки «Все уроки». */
const SEGMENT_TO_TAB_IDX: Record<string, number> = {
  home: 0,
  journal: 1,
  lessons: 1,
  friends: 2,
  settings: 3,
};

/**
 * При смене таба pathname иногда один кадр отстаёт от реального экрана; сегменты стабильнее.
 * Схлопнутый `/(tabs)` без дочернего сегмента = редирект из `app/(tabs)/index.tsx` на главную (0).
 *
 * Если URL — полноэкранный экран поверх группы табов (`/lessons_list`, `/lesson_menu`,
 * `/review`, …), здесь возвращаем `null`: не переопределяем activeIdx таб-слайдера
 * (иначе маппинг падал бы в «Главная» и активная вкладка мигала бы под push-экраном).
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
  { key: 'lessons',     icon: 'book-outline',        active: 'book' },
  { key: 'friends',     icon: 'people-outline',      active: 'people' },
  { key: 'settings',    icon: 'settings-outline',    active: 'settings' },
];

/** Центральная кнопка таббара: Арена — полноэкранный push-маршрут, а не свайп-страница.
 *  logicalIdx = -1 намеренно: у неё нет физической страницы в TabSlider, поэтому
 *  свайпом в неё попасть нельзя и tab_page_model остаётся неизменной. */
const ARENA_BAR_ROUTE = '/arena';
type TabBarEntry = TabDef & { logicalIdx: number; route?: string; center?: boolean };

const TAB_BAR_TABS: TabBarEntry[] = (() => {
  const pages: TabBarEntry[] = TABS.map((tab, logicalIdx) => ({ ...tab, logicalIdx }));
  const middle = Math.ceil(pages.length / 2);
  const arena: TabBarEntry = {
    key: 'arena',
    icon: 'shield-half-outline',
    active: 'shield-half',
    logicalIdx: -1,
    route: ARENA_BAR_ROUTE,
    center: true,
  };
  return [...pages.slice(0, middle), arena, ...pages.slice(middle)];
})();


type TabScaffoldProps = {
  tabScreens: React.ReactNode[];
  currentRouteIsTab: boolean;
  visualIdx: number;
  physicalPageIdx: PhysicalPageIndex;
  devHubVisible: boolean;
  onCloseDevHub: () => void;
  onOpenDevHub: () => void;
};

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({
  tabScreens,
  currentRouteIsTab,
  visualIdx,
  physicalPageIdx,
  devHubVisible,
  onCloseDevHub,
  onOpenDevHub,
}: TabScaffoldProps) {
  const { theme: t, ds, statusBarLight, themeMode } = useTheme();
  const { lang } = useLang();
  const { tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useStableSafeAreaInsets();
  const tabBarRouter = useRouter();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const [devOverlayVisible, setDevOverlayVisible] = useState(false);
  const topFadeScroll = useTopFadeScroll();
  /** Sage использует собственную акцентную капсулу вместо чужого чёрного scrim.
   * Тёмные состояния иконок держат контраст и в полном, и в компактном таббаре. */
  const isSagePorcelainTabChrome = themeMode === 'sagePorcelain';
  const isOliveTheme = themeMode === 'olive';
  const tabPillBackground = isSagePorcelainTabChrome ? t.accent : isOliveTheme ? OLIVE_RICH.panel : TAB_UNDERLAY_DIM_BG;
  const tabIconActive = isSagePorcelainTabChrome ? t.correctText : isOliveTheme ? OLIVE_RICH.champagne : t.accent;
  const tabIconMuted = isSagePorcelainTabChrome
    ? withAlpha(t.correctText, 0.72)
    : isOliveTheme ? withAlpha(OLIVE_RICH.ivory, 0.62)
    : withAlpha(t.textSecond, TAB_DARK_ICON_MUTED_ALPHA);
  const tabActiveBg = withAlpha(tabIconActive, TAB_DARK_ACTIVE_BG_ALPHA);
  const tabPillBottom = Math.max(PB, ds.spacing.sm) + FLOATING_PILL_BOTTOM_GAP;
  const tabOverlayHeight = tabBarHeight + tabPillBottom + ds.spacing.md;
  const [tabPillWidth, setTabPillWidth] = useState(0);
  const tabHighlightAnim = useRef(new Animated.Value(activeIdx)).current;
  const tabPressAnim = useRef(new Animated.Value(0)).current;
  const tabScrollProgress = useRef(new Animated.Value(0)).current;
  const tabScrollCollapsedRef = useRef(false);
  const tabScrollLastYRef = useRef(0);
  const tabScrollLastToggleAtRef = useRef(0);
  const [pressedTabIdx, setPressedTabIdx] = useState<number | null>(null);
  const firstContentReadyEmittedRef = useRef(false);
  const visualTabIdx = visualIdx;
  const activeBarTabIdx = TAB_BAR_TABS.findIndex((tab) => tab.logicalIdx === visualTabIdx);
  const previousVisualTabIdxRef = useRef(visualIdx);

  useEffect(() => {
    if (activeBarTabIdx < 0) return;
    if (!ENABLE_TAB_HIGHLIGHT_TRAVEL) {
      tabHighlightAnim.setValue(activeBarTabIdx);
      return;
    }
    Animated.spring(tabHighlightAnim, {
      toValue: activeBarTabIdx,
      speed: 18,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }, [activeBarTabIdx, tabHighlightAnim]);

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

  const animateTabChrome = useCallback((collapsed: boolean, immediate = false) => {
    if (!immediate && tabScrollCollapsedRef.current === collapsed) return;
    const now = Date.now();
    if (!immediate && now - tabScrollLastToggleAtRef.current < TAB_SCROLL_TOGGLE_COOLDOWN_MS) return;
    tabScrollLastToggleAtRef.current = now;
    tabScrollCollapsedRef.current = collapsed;
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

  useLayoutEffect(() => {
    if (previousVisualTabIdxRef.current === visualIdx) return;
    previousVisualTabIdxRef.current = visualIdx;
    tabScrollLastYRef.current = 0;
    animateTabChrome(false, true);
  }, [animateTabChrome, visualIdx]);

  useEffect(() => {
    const scrollY = topFadeScroll?.tabBarScrollY;
    if (!scrollY) return undefined;

    const id = scrollY.addListener(({ value }) => {
      const y = Math.max(0, value);
      const delta = y - tabScrollLastYRef.current;
      tabScrollLastYRef.current = y;

      if (y <= TAB_SCROLL_EXPAND_TRIGGER_Y) {
        animateTabChrome(false, true);
        return;
      }

      if (delta >= TAB_SCROLL_DIRECTION_EPSILON && y >= TAB_SCROLL_COLLAPSE_TRIGGER_Y) {
        animateTabChrome(true);
        return;
      }

      if (delta <= -TAB_SCROLL_DIRECTION_EPSILON) {
        animateTabChrome(false);
      }
    });

    return () => {
      scrollY.removeListener(id);
      tabScrollProgress.stopAnimation();
    };
  }, [animateTabChrome, tabScrollProgress, topFadeScroll?.tabBarScrollY]);

  const handleSwipeStartChrome = useCallback((physicalIdx: number) => {
    tabScrollLastYRef.current = 0;
    animateTabChrome(false, true);
    onSwipeStart(physicalIdx);
  }, [animateTabChrome, onSwipeStart]);

  const tabScrollScale = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, TAB_SCROLL_COLLAPSED_SCALE],
    extrapolate: 'clamp',
  });
  const tabScrollTranslateY = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TAB_SCROLL_COLLAPSED_TRANSLATE_Y],
    extrapolate: 'clamp',
  });
  const tabScrollOpacity = tabScrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, TAB_SCROLL_COLLAPSED_OPACITY],
    extrapolate: 'clamp',
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
        pointerEvents={devOverlayVisible ? 'none' : 'auto'}
        accessibilityElementsHidden={devOverlayVisible}
        importantForAccessibility={devOverlayVisible ? 'no-hide-descendants' : 'auto'}
      >
        <View style={{ flex: 1, width: '100%', alignSelf: 'stretch', flexDirection: 'column' }}>
          <View style={s.tabContent}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <TabSlider activeIndex={physicalPageIdx} onTabChange={goToTab} onSwipeStart={handleSwipeStartChrome} onSwipeComplete={onSwipeComplete} swipeEnabled={true}>
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
              style={[
                s.tabPill,
                {
                  bottom: tabPillBottom,
                  marginHorizontal: ds.spacing.lg,
                  height: tabBarHeight,
                  borderRadius: tabBarHeight / 2,
                  shadowColor: t.shadowDark,
                  opacity: tabScrollOpacity,
                  transform: [{ translateY: tabScrollTranslateY }, { scale: tabScrollScale }, { scale: tabPillPressScale }],
                },
              ]}
            >
              <View pointerEvents="none" style={[s.tabPillFill, { backgroundColor: tabPillBackground }]} />

              {ENABLE_TAB_HIGHLIGHT_TRAVEL && tabPillWidth > 0 && activeBarTabIdx >= 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    s.tabActivePill,
                    {
                      top: (tabBarHeight - TAB_ACTIVE_PILL_HEIGHT) / 2,
                      left: (tabPillWidth / TAB_BAR_TABS.length - TAB_ACTIVE_PILL_WIDTH) / 2,
                      backgroundColor: tabActiveBg,
                      opacity: tabActivePillPressOpacity,
                      transform: [{
                        translateX: tabHighlightAnim.interpolate({
                          inputRange: TAB_BAR_TABS.map((_, index) => index),
                          outputRange: TAB_BAR_TABS.map((_, index) => index * (tabPillWidth / TAB_BAR_TABS.length)),
                          extrapolate: 'clamp',
                        }),
                      }, { scale: tabActivePillPressScale }],
                    },
                  ]}
                />
              ) : null}

              {TAB_BAR_TABS.map((tab, barIndex) => {
                const visuallyFocused = activeBarTabIdx === barIndex;
                const color = tab.center ? tabIconActive : visuallyFocused ? tabIconActive : tabIconMuted;
                const iconScale = pressedTabIdx === barIndex
                  ? tabPressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
                  : 1;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    testID={`tab-${tab.key}`}
                    accessibilityLabel={triLang(lang, { ru: tab.key === 'home' ? 'Главная' : tab.key === 'lessons' ? 'Уроки' : tab.key === 'friends' ? 'Друзья' : 'Настройки', uk: tab.key === 'home' ? 'Головна' : tab.key === 'lessons' ? 'Уроки' : tab.key === 'friends' ? 'Друзі' : 'Налаштування', es: tab.key === 'home' ? 'Inicio' : tab.key === 'lessons' ? 'Lecciones' : tab.key === 'friends' ? 'Amigos' : 'Ajustes', 'pt-BR': tab.key === 'home' ? 'Início' : tab.key === 'lessons' ? 'Lições' : tab.key === 'friends' ? 'Amigos' : 'Configurações', vi: tab.key === 'home' ? 'Trang chủ' : tab.key === 'lessons' ? 'Bài học' : tab.key === 'friends' ? 'Bạn bè' : 'Cài đặt', id: tab.key === 'home' ? 'Beranda' : tab.key === 'lessons' ? 'Pelajaran' : tab.key === 'friends' ? 'Teman' : 'Pengaturan', tr: tab.key === 'home' ? 'Ana sayfa' : tab.key === 'lessons' ? 'Dersler' : tab.key === 'friends' ? 'Arkadaşlar' : 'Ayarlar', pl: tab.key === 'home' ? 'Strona główna' : tab.key === 'lessons' ? 'Lekcje' : tab.key === 'friends' ? 'Znajomi' : 'Ustawienia' })}
                    accessible={true}
                    accessibilityRole={tab.center ? 'button' : 'tab'}
                    accessibilityState={tab.center ? undefined : { selected: visuallyFocused }}
                    style={s.tabBtn}
                    onPressIn={() => beginTabPress(barIndex)}
                    onPressOut={endTabPress}
                    onPress={() => {
                      if (tab.route) {
                        tabBarRouter.push(tab.route as never);
                        return;
                      }
                      goToTab(tab.logicalIdx);
                    }}
                    activeOpacity={1}
                  >
                    {!ENABLE_TAB_HIGHLIGHT_TRAVEL && visuallyFocused ? (
                      <View style={[s.tabActivePill, { backgroundColor: tabActiveBg }]} />
                    ) : null}
                    <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                      <Ionicons name={tab.center || visuallyFocused ? tab.active : tab.icon} size={tab.center ? 29 : 26} color={color} />
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>
        </View>
      </View>
      {ENABLE_DEV_TOOLS ? (
        <DevHubSheetGate
          visible={devHubVisible}
          onClose={onCloseDevHub}
          onOpen={onOpenDevHub}
          onSurfaceActiveChange={setDevOverlayVisible}
        />
      ) : null}
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

function ReleasedTabLayout() {
  const { width: tabPaneWidth } = useScreen();
  const { theme: t } = useTheme();
  const pathname = usePathname();
  // зачем: useSegments() в expo-router 6 типизирован union'ом ВСЕХ маршрутов —
  // в массивах зависимостей TS падает с TS2590 («union слишком сложный»).
  // Помощники ниже и так принимают readonly string[], поэтому сужаем тип здесь.
  const segments: readonly string[] = useSegments();
  const [activeIdx, setActiveIdx] = useState(() => tabIdxFromRouter(pathname, segments) ?? 0);
  const [visualIdx, setVisualIdx] = useState(() => tabIdxFromRouter(pathname, segments) ?? 0);
  const [physicalPageIdx, setPhysicalPageIdx] = useState<PhysicalPageIndex>(() => logicalTabToPhysicalPage(tabIdxFromRouter(pathname, segments) ?? 0));
  const physicalPageIdxRef = useRef(physicalPageIdx);
  physicalPageIdxRef.current = physicalPageIdx;
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const visualIdxRef = useRef(visualIdx);
  visualIdxRef.current = visualIdx;
  const [focusTick, setFocusTick] = useState(0);
  const [devHubVisible, setDevHubVisible] = useState(false);
  const openDevHub = useCallback(() => setDevHubVisible(true), []);
  const closeDevHub = useCallback(() => setDevHubVisible(false), []);
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

  /**
   * Немедленный маунт таба, на который пользователь смотрит ПРЯМО СЕЙЧАС.
   * зачем: раздел «Уроки» открывался долго — тап ставил монтирование в общую
   * idle-очередь (до BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 1200 мс), и всё
   * это время на экране висела пустая панель. Фоновый премаунт соседей idle
   * оставляем как есть: ждать там некому. Здесь же ждёт живой человек.
   */
  const mountNow = useCallback((idx: number) => {
    if (idx < 0 || mountedTabsRef.current.has(idx)) return;
    const scheduled = scheduledMountsRef.current.get(idx);
    if (scheduled) {
      scheduled.cancel?.();
      scheduledMountsRef.current.delete(idx);
    }
    if (idx !== 0 && !prewarmDeferredTabScreen(idx)) return;
    setVisitedTabs((prev) => addVisitedTab(prev, idx));
    setMountedTabs((prev) => addVisitedTab(prev, idx));
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
      // зачем: это таб, который прямо сейчас становится активным по URL
      // (deep link, возврат из урока) — маунт в idle оставлял пустую панель.
      mountNow(hold);
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
      mountNow(fromRouter);
      if (visualIdxRef.current !== fromRouter) {
        setVisualIdx(fromRouter);
      }
      if (activeIdxRef.current !== fromRouter) {
        setActiveIdx(fromRouter);
      }
      const physical = logicalTabToPhysicalPage(fromRouter);
      if (physicalPageIdxRef.current !== physical) setPhysicalPageIdx(physical);
    }
  }, [mountNow, pathname, segments]);

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
    // зачем: палец уже тянет соседнюю панель в кадр — она обязана быть заполненной.
    mountNow(idx);
  }, [mountNow, rememberVisitedTab]);

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
    // зачем: тап — пользователь уже смотрит на панель, ждать idle нельзя.
    mountNow(idx);
    navigateTo(idx);
  }, [mountNow, navigateTo, rememberVisitedTab]);

  /** Свайп завершён — теперь обновляем реальный активный таб и затем URL. */
  const handleSwipeComplete = useCallback((physicalIdx: number) => {
    const physical = physicalIdx as PhysicalPageIndex;
    physicalPageIdxRef.current = physical;
    const idx = physicalPageToLogicalTab(physical);
    markExamBestPctTabActivity(idx);
    setPhysicalPageIdx(physical);
    setVisualIdx(idx);
    // зачем: страница 0 раньше была «Сегодня» и намеренно не трогала URL; после
    // удаления экрана нулевая страница — обычная главная, и свайп на неё обязан
    // обновлять маршрут наравне с остальными табами.
    if (idx !== activeIdxRef.current) {
      setActiveIdx(idx);
      rememberVisitedTab(idx);
      mountNow(idx);
    }
    navigateTo(idx);
  }, [mountNow, navigateTo, rememberVisitedTab]);

  // зачем: перехват «Назад» существовал только ради страницы «Сегодня» (увести
  // на главную вместо выхода). Экран удалён, страница 0 — сама главная, и
  // держать перехват дальше значило бы ломать штатный выход из приложения.

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
      show(0) ? <TabPane key="home" freezeWanted={freezeWanted(0)}><HomeScreen onOpenDevHub={openDevHub} /></TabPane> : placeholder('ph-home'),
      show(1) ? (
        <LessonsPaneBoundary
          key="lessons"
          freezeWanted={freezeWanted(1)}
          shouldLoad={shouldLoad(1)}
        />
      ) : placeholder('ph-lessons'),
      show(2) ? <TabPane key="friends" freezeWanted={freezeWanted(2)}><DeferredTabScreen shouldLoad={shouldLoad(2)} loadScreen={loadFriendsScreen} /></TabPane> : placeholder('ph-friends'),
      show(3) ? <TabPane key="settings" freezeWanted={freezeWanted(3)}><DeferredTabScreen shouldLoad={shouldLoad(3)} loadScreen={loadSettingsScreen} /></TabPane> : placeholder('ph-settings'),
    ];
  }, [activeIdx, mountedTabs, openDevHub, physicalPageIdx, t.bgPrimary, tabPaneWidth, visitedTabs]);

  const runtimeOwnerId = physicalPageToRuntimeOwner(physicalPageIdx);

  return (
    <TabProvider
      activeIdx={activeIdx}
      runtimeOwnerId={runtimeOwnerId}
      onTabChange={handleTabChange}
      onSwipeStart={handleSwipeStart}
      onSwipeComplete={handleSwipeComplete}
      focusTick={focusTick}
    >
      <TopFadeScrollProvider>
        <TabScaffold
          tabScreens={tabScreens}
          currentRouteIsTab={currentRouteIsTab}
          visualIdx={visualIdx}
          physicalPageIdx={physicalPageIdx}
          devHubVisible={devHubVisible}
          onCloseDevHub={closeDevHub}
          onOpenDevHub={openDevHub}
        />
      </TopFadeScrollProvider>
    </TabProvider>
  );
}

function isDisabledTournamentTabPath(pathnameRaw: string): boolean {
  const pathname = pathnameRaw.replace(/\/$/, '');
  return pathname === '/tournaments' || pathname.endsWith('/(tabs)/tournaments');
}

export default function TabLayout() {
  const pathname = usePathname();
  if (isDisabledTournamentTabPath(pathname)) {
    return <DeferredRedirect href="/(tabs)/home" />;
  }
  return <ReleasedTabLayout />;
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
  /** Плавающая капсула остаётся целой и слегка уменьшается при скролле. */
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
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    position: 'relative',
    zIndex: 10,
  },
  tabActivePill: {
    position: 'absolute',
    width: TAB_ACTIVE_PILL_WIDTH,
    height: TAB_ACTIVE_PILL_HEIGHT,
    borderRadius: TAB_ACTIVE_PILL_HEIGHT / 2,
  },

});
