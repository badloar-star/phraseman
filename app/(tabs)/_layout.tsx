import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TopFadeMask from '../../components/TopFadeMask';
import { TopFadeScrollProvider, useTopFadeScroll } from '../../components/TopFadeScrollContext';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { HOME_ENTRANCE } from '../../constants/motion';
import { emitAppEvent, onAppEvent } from '../events';
import { scheduleAnimatedStateUpdate, type ScheduledAnimatedStateUpdate } from '../../components/animationScheduling';
import HomeScreen       from './home';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabScreenComponent = React.ComponentType;
type DeferredTabModule = { default: TabScreenComponent };

let deferredLessonsScreen: TabScreenComponent | null = null;
let deferredArenaScreen: TabScreenComponent | null = null;
let deferredFriendsScreen: TabScreenComponent | null = null;
let deferredSettingsScreen: TabScreenComponent | null = null;

function loadLessonsScreen(): TabScreenComponent {
  deferredLessonsScreen ??= (require('./lessons') as DeferredTabModule).default;
  return deferredLessonsScreen;
}

function loadArenaScreen(): TabScreenComponent {
  deferredArenaScreen ??= (require('./arena') as DeferredTabModule).default;
  return deferredArenaScreen;
}

function loadFriendsScreen(): TabScreenComponent {
  deferredFriendsScreen ??= (require('./friends') as DeferredTabModule).default;
  return deferredFriendsScreen;
}

function loadSettingsScreen(): TabScreenComponent {
  deferredSettingsScreen ??= (require('./settings') as DeferredTabModule).default;
  return deferredSettingsScreen;
}

function prewarmDeferredTabScreens() {
  const loaders = [loadLessonsScreen, loadArenaScreen, loadFriendsScreen, loadSettingsScreen];
  loaders.forEach((loadScreen) => {
    try {
      loadScreen();
    } catch {
      /* Route-level render will surface real module errors when the user opens that tab. */
    }
  });
}

function DeferredTabScreen({ shouldLoad, loadScreen }: { shouldLoad: boolean; loadScreen: () => TabScreenComponent }) {
  const Screen = shouldLoad ? loadScreen() : null;
  if (!Screen) return <View style={s.deferredTabPlaceholder} collapsable={false} />;
  return <Screen />;
}

type TabDef = {
  key: string;
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
  icon: IconName;
  active: IconName;
};

/** Суффиксы путей пяти основных табов (список уроков — `lessons.tsx`, не `index.tsx`). */
const TAB_PATH_SUFFIXES = ['/home', '/lessons', '/arena', '/friends', '/settings'] as const;

const PATHNAME_TO_IDX: Record<(typeof TAB_PATH_SUFFIXES)[number], number> = {
  '/home': 0,
  '/lessons': 1,
  '/arena': 2,
  '/friends': 3,
  '/settings': 4,
};
const IDX_TO_TAB_ROUTE: Record<number, string> = {
  0: '/(tabs)/home',
  1: '/(tabs)/lessons',
  2: '/(tabs)/arena',
  3: '/(tabs)/friends',
  4: '/(tabs)/settings',
};

function addVisitedTab(prev: Set<number>, idx: number): Set<number> {
  if (idx < 0 || prev.has(idx)) return prev;
  const next = new Set(prev);
  next.add(idx);
  return next;
}

const TAB_BACKGROUND_TRANSITION_MS = 900;
const TAB_CHROME_TRANSITIONS_ENABLED = false;
const TAB_CHROME_TRANSITION_USE_NATIVE_DRIVER = false;

/** Имена сегментов expo-router под `app/(tabs)/*.tsx` (без ведущих скобочных групп). */
const SEGMENT_TO_TAB_IDX: Record<string, number> = {
  home: 0,
  lessons: 1,
  arena: 2,
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

/** Синхронно с URL — чтобы при заходе на /(tabs)/arena не было кадра с activeIdx=0 и лишней анимации TabSlider. */
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

const TABS: TabDef[] = [
  { key: 'home', ru: 'Главная', uk: 'Головна', es: 'Inicio', 'pt-BR': 'Início', vi: 'Trang chủ', id: 'Beranda', tr: 'Ana sayfa', pl: 'Start', icon: 'home-outline', active: 'home' },
  { key: 'index', ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje', icon: 'book-outline', active: 'book' },
  { key: 'arena', ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena', icon: 'flash-outline', active: 'flash' },
  { key: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi', icon: 'people-outline', active: 'people' },
  { key: 'settings', ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', 'pt-BR': 'Configurações', vi: 'Cài đặt', id: 'Pengaturan', tr: 'Ayarlar', pl: 'Ustawienia', icon: 'settings-outline', active: 'settings' },
];


type TabScaffoldProps = { tabScreens: React.ReactNode[]; currentRouteIsTab: boolean };

type TabChromeLayer = {
  id: number;
  wrapBg: string;
  barBg: string;
  safeBg: string;
  fade: Animated.Value;
};

function renderTabChromeLayer(layer: TabChromeLayer, keyPrefix: string, backgroundColor: string) {
  if (!TAB_CHROME_TRANSITIONS_ENABLED) {
    return (
      <View
        key={`${keyPrefix}-${layer.id}`}
        style={[s.tabChromeFill, { backgroundColor }]}
      />
    );
  }

  return (
    <Animated.View
      key={`${keyPrefix}-${layer.id}`}
      style={[s.tabChromeFill, { backgroundColor, opacity: layer.fade }]}
    />
  );
}

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, currentRouteIsTab }: TabScaffoldProps) {
  const { lang } = useLang();
  const { theme: t, f, ds, themeMode, statusBarLight } = useTheme();
  const { tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const topFadeScroll = useTopFadeScroll();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  const tabChromeSolidBg = isMinimal ? t.bgCard : t.bgPrimary;
  const tabChromeWrapBg = t.bgPrimary;
  const tabChromeBarBg = tabChromeSolidBg;
  const tabChromeSafeBg = tabChromeBarBg;
  const tabChromeKey = `${themeMode}:plain:${tabChromeWrapBg}:${tabChromeBarBg}:${tabChromeSafeBg}`;
  const [tabChromeLayers, setTabChromeLayers] = useState<TabChromeLayer[]>(() => [{
    id: 0,
    wrapBg: tabChromeWrapBg,
    barBg: tabChromeBarBg,
    safeBg: tabChromeSafeBg,
    fade: new Animated.Value(1),
  }]);
  const tabChromeLayerSeqRef = useRef(0);
  const tabChromeLayersRef = useRef<TabChromeLayer[]>(tabChromeLayers);
  const activeTabChromeKeyRef = useRef(tabChromeKey);
  const tabChromeLayerCleanupTasksRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  const firstContentReadyEmittedRef = useRef(false);

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

  useEffect(() => {
    tabChromeLayersRef.current = tabChromeLayers;
  }, [tabChromeLayers]);

  const cancelTabChromeLayerCleanupTasks = useCallback(() => {
    tabChromeLayerCleanupTasksRef.current.forEach(task => task.cancel());
    tabChromeLayerCleanupTasksRef.current = [];
  }, []);

  const removeTabChromeLayerAfterCommit = useCallback((layerId: number) => {
    let scheduled: ScheduledAnimatedStateUpdate | null = null;
    scheduled = scheduleAnimatedStateUpdate(() => {
      if (scheduled) {
        tabChromeLayerCleanupTasksRef.current = tabChromeLayerCleanupTasksRef.current.filter(task => task !== scheduled);
      }
      setTabChromeLayers(current => current.filter(item => item.id !== layerId));
    });
    tabChromeLayerCleanupTasksRef.current.push(scheduled);
  }, []);

  useEffect(() => () => {
    cancelTabChromeLayerCleanupTasks();
  }, [cancelTabChromeLayerCleanupTasks]);

  useEffect(() => {
    if (activeTabChromeKeyRef.current === tabChromeKey) return;
    activeTabChromeKeyRef.current = tabChromeKey;
    cancelTabChromeLayerCleanupTasks();

    const previousLayers = tabChromeLayersRef.current;
    previousLayers.forEach(layer => {
      layer.fade.stopAnimation();
    });

    if (!TAB_CHROME_TRANSITIONS_ENABLED) {
      setTabChromeLayers([{
        id: ++tabChromeLayerSeqRef.current,
        wrapBg: tabChromeWrapBg,
        barBg: tabChromeBarBg,
        safeBg: tabChromeSafeBg,
        fade: new Animated.Value(1),
      }]);
      return;
    }

    const nextLayer: TabChromeLayer = {
      id: ++tabChromeLayerSeqRef.current,
      wrapBg: tabChromeWrapBg,
      barBg: tabChromeBarBg,
      safeBg: tabChromeSafeBg,
      fade: new Animated.Value(0),
    };

    previousLayers.forEach(layer => {
      Animated.timing(layer.fade, {
        toValue: 0,
        duration: TAB_BACKGROUND_TRANSITION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: TAB_CHROME_TRANSITION_USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished) return;
        removeTabChromeLayerAfterCommit(layer.id);
      });
    });

    setTabChromeLayers(current => [...current.slice(-1), nextLayer]);
    Animated.timing(nextLayer.fade, {
      toValue: 1,
      duration: TAB_BACKGROUND_TRANSITION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: TAB_CHROME_TRANSITION_USE_NATIVE_DRIVER,
    }).start();
  }, [cancelTabChromeLayerCleanupTasks, removeTabChromeLayerAfterCommit, tabChromeBarBg, tabChromeKey, tabChromeSafeBg, tabChromeWrapBg]);

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
          {/* flex-колонка вместо absolute: таб-бар всегда снизу в дереве, его не перекрывает ScrollView/elevation */}
          <View style={s.tabContent}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <TabSlider activeIndex={activeIdx} onTabChange={goToTab} onSwipeStart={onSwipeStart} onSwipeComplete={onSwipeComplete} swipeEnabled={true}>
                {tabScreens}
              </TabSlider>
            </GestureHandlerRootView>
          </View>
          <View style={s.tabBarWrap}>
            <View pointerEvents="none" style={s.tabChromeFill}>
              {tabChromeLayers.map(layer => renderTabChromeLayer(layer, 'wrap', layer.wrapBg))}
            </View>
            <View
              style={[
                s.tabBar,
                {
                  height: tabBarHeight,
                  backgroundColor: 'transparent',
                  borderTopColor: t.border,
                  borderTopWidth: isMinimal ? 1 : 0.5,
                  borderTopLeftRadius: isMinimal ? ds.radius.xl : 0,
                  borderTopRightRadius: isMinimal ? ds.radius.xl : 0,
                  paddingTop: isMinimal ? ds.spacing.sm : 6,
                  paddingHorizontal: isMinimal ? ds.spacing.md : 0,
                  ...ds.shadow.soft,
                },
              ]}
            >
              <View pointerEvents="none" style={s.tabChromeFill}>
                {tabChromeLayers.map(layer => renderTabChromeLayer(layer, 'bar', layer.barBg))}
              </View>
              {TABS.map((tab, i) => {
                const focused = activeIdx === i;
                const color = focused ? t.accent : t.textMuted;
                const label = isES ? tab.es : isUK ? tab.uk : tab.ru;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    testID={`tab-${tab.key}`}
                    accessibilityLabel={`qa-tab-${tab.key}`}
                    accessible={true}
                    style={s.tabBtn}
                    onPressIn={() => { hapticTap(); }}
                    onPress={() => { goToTab(i); }}
                    activeOpacity={0.7}
                  >
                    {focused && <View style={[s.indicator, { backgroundColor: t.accent }]} />}

                    <Ionicons
                      name={focused ? tab.active : tab.icon}
                      size={22}
                      color={color}
                    />

                    <Text
                      style={[s.tabLabel, { color, fontWeight: focused ? '600' : '400', fontSize: f.label }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[s.tabSafeInset, { height: PB }]}>
              <View pointerEvents="none" style={s.tabChromeFill}>
                {tabChromeLayers.map(layer => renderTabChromeLayer(layer, 'safe', layer.safeBg))}
              </View>
            </View>

          </View>
        </View>
      </View>
    </ScreenGradient>
  );
}

export default function TabLayout() {
  const { width: tabPaneWidth } = useScreen();
  const pathname = usePathname();
  const segments = useSegments();
  const [activeIdx, setActiveIdx] = useState(() => tabIdxFromRouter(pathname, segments) ?? 0);
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const [focusTick, setFocusTick] = useState(0);
  // Ліниве монтування: повний екран лише для активного таба або вже відкритих (стан зберігається); інше — плейсхолдер (менш навантаження при зміні мови/теми).
  // Начальный таб всегда в visited — чтобы первый рендер не был плейсхолдером.
  const [visitedTabs, setVisitedTabs] = useState(() => {
    const initial = tabIdxFromRouter(pathname, segments) ?? 0;
    return new Set<number>([0, initial]);
  });
  const router = useRouter();
  const deferredTabPrewarmStartedRef = useRef(false);
  /** Пока router.replace ещё не обновил pathname, useLayoutEffect не должен откатить вкладку по старому URL. */
  const pendingTabIdxRef = useRef<number | null>(null);

  // До paint: pathname + segments, чтобы индекс не отставал и TabSlider не кадрил старый слайд.
  useLayoutEffect(() => {
    const fromRouter = tabIdxFromRouter(pathname, segments);
    const pending = pendingTabIdxRef.current;
    if (pending !== null && fromRouter !== null && fromRouter === pending) {
      pendingTabIdxRef.current = null;
    }
    if (pendingTabIdxRef.current !== null) {
      const hold = pendingTabIdxRef.current;
      setVisitedTabs((prev) => addVisitedTab(prev, hold));
      setActiveIdx((prev) => (prev === hold ? prev : hold));
      return;
    }
    if (fromRouter !== null) {
      setVisitedTabs((prev) => addVisitedTab(prev, fromRouter));
    }
    setActiveIdx((prev) => {
      if (fromRouter === null) return prev;
      return prev === fromRouter ? prev : fromRouter;
    });
  }, [pathname, segments]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  useEffect(() => {
    const startPrewarm = () => {
      if (deferredTabPrewarmStartedRef.current) return;
      deferredTabPrewarmStartedRef.current = true;
      setTimeout(() => {
        requestAnimationFrame(prewarmDeferredTabScreens);
      }, 120);
    };

    const sub = onAppEvent('app_first_content_ready', startPrewarm);
    const fallbackTimer = setTimeout(startPrewarm, 900);
    return () => {
      clearTimeout(fallbackTimer);
      sub.remove();
    };
  }, []);

  const rememberVisitedTab = useCallback((idx: number) => {
    setVisitedTabs((prev) => addVisitedTab(prev, idx));
  }, []);

  /** Вызывается в момент отпускания пальца (до анимации) — только гарантируем наличие экрана назначения.
   *  Активный таб/хром переключаются после UI-thread анимации, чтобы React-рендер не дергал свайп. */
  const handleSwipeStart = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return;
    rememberVisitedTab(idx);
  }, [rememberVisitedTab]);

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
    if (idx === activeIdxRef.current) return;
    setActiveIdx(idx);
    rememberVisitedTab(idx);
    navigateTo(idx);
  }, [navigateTo, rememberVisitedTab]);

  /** Свайп завершён — теперь обновляем активный таб/хром и затем URL. */
  const handleSwipeComplete = useCallback((idx: number) => {
    if (idx !== activeIdxRef.current) {
      setActiveIdx(idx);
      rememberVisitedTab(idx);
    }
    navigateTo(idx);
  }, [navigateTo, rememberVisitedTab]);

  const currentRouteIsTab = tabIdxFromRouter(pathname, segments) !== null;

  const tabScreens = useMemo(() => {
    // Головна (0) завжди в дереві; інші таби зберігають слот, але реальний екран підключається лише коли таб активний.
    // Решальные табы добавляются в visitedTabs в handleSwipeStart/handleTabChange, чтобы не строить тяжёлые экраны при старте.
    const placeholder = (k: string) => (
      <View key={k} style={{ width: tabPaneWidth, flex: 1, backgroundColor: 'transparent' }} collapsable={false} />
    );

    const show = (i: number) => i === 0 || i === activeIdx || visitedTabs.has(i);
    const shouldLoad = (i: number) => i === activeIdx || visitedTabs.has(i);
    return [
      show(0) ? <HomeScreen       key="home" />         : placeholder('ph-home'),
      show(1) ? <DeferredTabScreen key="index" shouldLoad={shouldLoad(1)} loadScreen={loadLessonsScreen} /> : placeholder('ph-index'),
      show(2) ? <DeferredTabScreen key="arena" shouldLoad={shouldLoad(2)} loadScreen={loadArenaScreen} /> : placeholder('ph-arena'),
      show(3) ? <DeferredTabScreen key="friends" shouldLoad={shouldLoad(3)} loadScreen={loadFriendsScreen} /> : placeholder('ph-friends'),
      show(4) ? <DeferredTabScreen key="settings" shouldLoad={shouldLoad(4)} loadScreen={loadSettingsScreen} /> : placeholder('ph-settings'),
    ];
  }, [activeIdx, visitedTabs, tabPaneWidth]);

  return (
    <TabProvider activeIdx={activeIdx} onTabChange={handleTabChange} onSwipeStart={handleSwipeStart} onSwipeComplete={handleSwipeComplete} focusTick={focusTick}>
      <TopFadeScrollProvider>
        <TabScaffold tabScreens={tabScreens} currentRouteIsTab={currentRouteIsTab} />
      </TopFadeScrollProvider>
    </TabProvider>
  );
}

const s = StyleSheet.create({

  deferredTabPlaceholder: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). Фон прозрачный — градиент с TabScaffold, без белого «просвета». */
  tabContent: { flex: 1, minHeight: 0, width: '100%', backgroundColor: 'transparent' },
  /** Не absolute: панель — последний flex-элемент, всегда видна и кликабельна. */
  tabBarWrap: { width: '100%', flexShrink: 0, zIndex: 1, elevation: 8, position: 'relative', backgroundColor: 'transparent' },
  tabBar:     { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 6, position: 'relative', overflow: 'hidden' },
  tabSafeInset: { position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' },
  tabChromeFill: { ...StyleSheet.absoluteFillObject },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', zIndex: 10 },
  indicator:  { position: 'absolute', top: -6, left: '25%', right: '25%', height: 2, borderRadius: 1 },
  /** alignSelf + textAlign: иначе на iOS подпись может схлопнуться в «узкую колонку» и рисоваться вертикально */
  tabLabel:   { fontSize: 10, letterSpacing: 0.1, textAlign: 'center', alignSelf: 'stretch' },

});
