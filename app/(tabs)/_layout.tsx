import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
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
import HomeScreen       from './home';

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

/** Доп. зазор между плавающей капсулой и зоной системных жестов снизу. */
const FLOATING_PILL_BOTTOM_GAP = 6;

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

// Иконки-капсулы (как в Instagram, без подписей). Порядок = индексам табов (home..settings).
const TABS: TabDef[] = [
  { key: 'home',     icon: 'home-outline',     active: 'home' },
  { key: 'index',    icon: 'book-outline',     active: 'book' },
  { key: 'arena',    icon: 'flash-outline',    active: 'flash' },
  { key: 'friends',  icon: 'people-outline',   active: 'people' },
  { key: 'settings', icon: 'settings-outline', active: 'settings' },
];


type TabScaffoldProps = { tabScreens: React.ReactNode[]; currentRouteIsTab: boolean };

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, currentRouteIsTab }: TabScaffoldProps) {
  const { theme: t, ds, themeMode, statusBarLight } = useTheme();
  const { tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const topFadeScroll = useTopFadeScroll();
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  /** Тон-подложка плавающей капсулы поверх blur: на тёмных темах — затемнение, на светлых — осветление.
   *  Берём bgCard и подмешиваем альфу, чтобы стекло читалось, но контент за ним просвечивал. */
  const tabPillTintBg = withAlpha(t.bgCard, statusBarLight ? 0.55 : 0.72);
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
          {/* Плавающая «капсула» (Instagram/Telegram): отрывается от краёв, парит над контентом,
              полупрозрачный blur-фон. Обёртка по-прежнему резервирует ту же высоту в потоке,
              поэтому padding контента и use-global-bottom-overlay-offset не меняются. */}
          <View
            style={[s.tabBarWrap, { height: tabBarHeight + PB }]}
            pointerEvents="box-none"
          >
            <View
              style={[
                s.tabPill,
                {
                  bottom: Math.max(PB, ds.spacing.sm) + FLOATING_PILL_BOTTOM_GAP,
                  marginHorizontal: ds.spacing.lg,
                  height: tabBarHeight,
                  borderRadius: tabBarHeight / 2,
                  borderColor: t.borderHighlight,
                  shadowColor: t.shadowDark,
                },
              ]}
            >
              <BlurView
                intensity={isMinimal ? 40 : 60}
                tint={statusBarLight ? 'dark' : 'light'}
                style={s.tabPillFill}
              />
              {/* Полупрозрачная подложка-тон поверх blur — стабильный вид на Android, где blur слабее. */}
              <View pointerEvents="none" style={[s.tabPillFill, { backgroundColor: tabPillTintBg }]} />

              {TABS.map((tab, i) => {
                const focused = activeIdx === i;
                const color = focused ? t.accent : t.textMuted;
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
                    {/* Подсветка активного таба — мягкая «пилюля» под иконкой (как в Instagram). */}
                    {focused && (
                      <View
                        style={[
                          s.tabActivePill,
                          { backgroundColor: t.accentBg, borderColor: t.borderHighlight },
                        ]}
                      />
                    )}
                    <Ionicons
                      name={focused ? tab.active : tab.icon}
                      size={26}
                      color={color}
                    />
                  </TouchableOpacity>
                );
              })}
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
  /** Обёртка резервирует высоту бара в потоке (контент над ней не меняется); сама прозрачна,
   *  капсула внутри позиционируется absolute снизу. box-none — тапы проходят мимо пустых зон. */
  tabBarWrap: { width: '100%', flexShrink: 0, zIndex: 1, elevation: 8, position: 'relative', backgroundColor: 'transparent' },
  /** Плавающая капсула: отрывается от низа и краёв, полностью скруглена, со своим blur-фоном. */
  tabPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    // Объёмная тень, чтобы капсула «парила» над контентом.
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  tabPillFill: { ...StyleSheet.absoluteFillObject },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', position: 'relative', zIndex: 10 },
  /** Подсветка активного таба внутри капсулы — мягкая пилюля под иконкой. */
  tabActivePill: {
    position: 'absolute',
    width: 48,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },

});
