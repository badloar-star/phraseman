import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image, Animated, Easing, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { HOME_ENTRANCE } from '../../constants/motion';
import { emitAppEvent } from '../events';
import HomeScreen       from './home';
import LessonsScreen    from './lessons';
import ArenaTabScreen   from './arena';
import FriendsScreen    from './friends';
import SettingsScreen   from './settings';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabDef = {
  key: string;
  ru: string;
  uk: string;
  es: string;
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

const ARENA_THEME_BACKDROPS = {
  dark: require('../../assets/images/arena/knowledge-arena-dark.webp'),
  neon: require('../../assets/images/arena/knowledge-arena-neon.webp'),
  gold: require('../../assets/images/arena/knowledge-arena-gold.webp'),
  coral: require('../../assets/images/arena/knowledge-arena-coral.webp'),
  minimalLight: require('../../assets/images/arena/knowledge-arena-minimal-light.webp'),
  minimalDark: require('../../assets/images/arena/knowledge-arena-minimal-dark.webp'),
} as const;

const SETTINGS_THEME_BACKDROPS = {
  dark: require('../../assets/images/settings/settings-sanctum-dark.webp'),
  neon: require('../../assets/images/settings/settings-sanctum-neon.webp'),
  gold: require('../../assets/images/settings/settings-sanctum-gold.webp'),
  coral: require('../../assets/images/settings/settings-sanctum-coral.webp'),
  minimalLight: require('../../assets/images/settings/settings-sanctum-minimal-light.webp'),
  minimalDark: require('../../assets/images/settings/settings-sanctum-minimal-dark.webp'),
} as const;

const TAB_BACKDROP_TAP_MAX_MS = 260;
const TAB_BACKDROP_TAP_MAX_MOVE = 12;
const TAB_BACKDROP_RIPPLE_SIZE = 170;
const TAB_BACKDROP_DISTORTION_SIZE = 230;

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
  { key: 'home', ru: 'Главная', uk: 'Головна', es: 'Inicio', icon: 'home-outline', active: 'home' },
  { key: 'index', ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', icon: 'book-outline', active: 'book' },
  { key: 'arena', ru: 'Арена', uk: 'Арена', es: 'Arena', icon: 'flash-outline', active: 'flash' },
  { key: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'Amigos', icon: 'people-outline', active: 'people' },
  { key: 'settings', ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', icon: 'settings-outline', active: 'settings' },
];

type TabScaffoldProps = { tabScreens: React.ReactNode[]; currentRouteIsTab: boolean };

type BackdropTouchStart = { x: number; y: number; at: number };
type BackdropRipple = { id: number; x: number; y: number; anim: Animated.Value };

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, currentRouteIsTab }: TabScaffoldProps) {
  const { lang } = useLang();
  const { theme: t, f, ds, themeMode, statusBarLight } = useTheme();
  const { width: viewportW, height: viewportH } = useWindowDimensions();
  const { contentMaxW, tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const isDeepLightTab = false;
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  const isArenaBackdrop = activeIdx === 2;
  const isSettingsBackdrop = activeIdx === 4;
  const activeTabBackdropSource =
    isArenaBackdrop
      ? (ARENA_THEME_BACKDROPS[themeMode] ?? ARENA_THEME_BACKDROPS.dark)
      : isSettingsBackdrop
        ? (SETTINGS_THEME_BACKDROPS[themeMode] ?? SETTINGS_THEME_BACKDROPS.dark)
        : null;
  const showTabBackdrop = currentRouteIsTab && activeTabBackdropSource !== null;
  const tabBackdropOpacity = isSettingsBackdrop
    ? themeMode === 'minimalLight' ? 0.18 :
      themeMode === 'minimalDark' ? 0.30 :
      themeMode === 'neon' ? 0.34 :
      themeMode === 'gold' ? 0.40 :
      themeMode === 'coral' ? 0.38 :
      0.42
    : themeMode === 'minimalLight' ? 0.06 :
      themeMode === 'gold' ? 0.19 :
      themeMode === 'neon' ? 0.10 :
      0.14;
  const tabBackdropScrim = isSettingsBackdrop
    ? themeMode === 'minimalLight'
      ? ['rgba(255,255,255,0.46)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0.66)']
      : ['rgba(0,0,0,0.20)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.56)']
    : themeMode === 'minimalLight'
      ? ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.58)', 'rgba(255,255,255,0.86)']
      : themeMode === 'gold'
        ? ['rgba(0,0,0,0.60)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.92)']
        : ['rgba(0,0,0,0.64)', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.90)'];
  const tabBackdropRippleColor =
    themeMode === 'minimalLight' ? '#B08A2D' :
    themeMode === 'minimalDark' ? '#D5DAE2' :
    themeMode === 'neon' ? '#C8FF00' :
    themeMode === 'coral' ? '#FF7A72' :
    themeMode === 'gold' ? '#F6D77B' :
    '#69DB92';
  const [backdropRipples, setBackdropRipples] = useState<BackdropRipple[]>([]);
  const backdropTapStartRef = useRef<BackdropTouchStart | null>(null);
  const backdropRippleSeqRef = useRef(0);
  const backdropRippleAnimationsRef = useRef<Map<number, ReturnType<typeof Animated.loop>>>(new Map());
  const firstContentReadyEmittedRef = useRef(false);
  const notifyFirstContentReady = useCallback(() => {
    if (!currentRouteIsTab || activeIdx === 0 || firstContentReadyEmittedRef.current) return;
    firstContentReadyEmittedRef.current = true;
    requestAnimationFrame(() => {
      setTimeout(() => emitAppEvent('app_first_content_ready'), 160);
    });
  }, [activeIdx, currentRouteIsTab]);

  useEffect(() => {
    notifyFirstContentReady();
  }, [notifyFirstContentReady]);

  const stopBackdropRippleAnimations = useCallback(() => {
    backdropRippleAnimationsRef.current.forEach(animation => animation.stop());
    backdropRippleAnimationsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!showTabBackdrop) {
      backdropTapStartRef.current = null;
      stopBackdropRippleAnimations();
      setBackdropRipples([]);
    }
  }, [showTabBackdrop, stopBackdropRippleAnimations]);

  useEffect(() => () => {
    stopBackdropRippleAnimations();
  }, [stopBackdropRippleAnimations]);

  const handleBackdropTouchStart = useCallback((event: GestureResponderEvent) => {
    if (!showTabBackdrop) return;
    const { pageX, pageY } = event.nativeEvent;
    backdropTapStartRef.current = { x: pageX, y: pageY, at: Date.now() };
  }, [showTabBackdrop]);

  const handleBackdropTouchEnd = useCallback((event: GestureResponderEvent) => {
    const start = backdropTapStartRef.current;
    backdropTapStartRef.current = null;
    if (!showTabBackdrop || !start) return;

    const { pageX, pageY } = event.nativeEvent;
    const dx = pageX - start.x;
    const dy = pageY - start.y;
    if (Date.now() - start.at > TAB_BACKDROP_TAP_MAX_MS || Math.hypot(dx, dy) > TAB_BACKDROP_TAP_MAX_MOVE) return;

    const anim = new Animated.Value(0);
    const ripple: BackdropRipple = {
      id: ++backdropRippleSeqRef.current,
      x: start.x,
      y: start.y,
      anim,
    };

    stopBackdropRippleAnimations();
    setBackdropRipples([ripple]);

    const rippleLoop = Animated.loop(Animated.timing(anim, {
      toValue: 1,
      duration: 1180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }));
    backdropRippleAnimationsRef.current.set(ripple.id, rippleLoop);
    rippleLoop.start();
  }, [showTabBackdrop, stopBackdropRippleAnimations]);

  const handleBackdropTouchCancel = useCallback(() => {
    backdropTapStartRef.current = null;
  }, []);

  return (
    <ScreenGradient style={{ flex: 1 }} staticParallaxY={HOME_ENTRANCE.bgDriftPx}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {showTabBackdrop && activeTabBackdropSource && (
        <View pointerEvents="none" style={s.tabBackdropLayer}>
          <Image
            source={activeTabBackdropSource}
            resizeMode="cover"
            style={[s.tabBackdropImage, { opacity: tabBackdropOpacity }]}
          />
          <LinearGradient
            colors={tabBackdropScrim as [string, string, string]}
            locations={[0, 0.48, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.tabBackdropScrim}
          />
          <View pointerEvents="none" style={s.tabBackdropRippleLayer}>
            {backdropRipples.map(ripple => {
              const left = ripple.x - TAB_BACKDROP_RIPPLE_SIZE / 2;
              const top = ripple.y - TAB_BACKDROP_RIPPLE_SIZE / 2;
              const distortionLeft = ripple.x - TAB_BACKDROP_DISTORTION_SIZE / 2;
              const distortionTop = ripple.y - TAB_BACKDROP_DISTORTION_SIZE / 2;
              const firstScale = ripple.anim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1.7] });
              const secondScale = ripple.anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 2.55] });
              const coreScale = ripple.anim.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0.2, 1.15, 0.82] });
              const lensScale = ripple.anim.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.22, 1.02, 2.05] });
              const lensOpacity = ripple.anim.interpolate({ inputRange: [0, 0.10, 0.64, 1], outputRange: [0, 0.30, 0.12, 0] });
              const lensImageScale = ripple.anim.interpolate({ inputRange: [0, 0.40, 1], outputRange: [1.28, 1.14, 1.04] });
              const lensImageShiftX = ripple.anim.interpolate({ inputRange: [0, 0.46, 1], outputRange: [-5, 9, -2] });
              const lensImageShiftY = ripple.anim.interpolate({ inputRange: [0, 0.46, 1], outputRange: [4, -7, 2] });
              const firstOpacity = ripple.anim.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 0.34, 0.16, 0] });
              const secondOpacity = ripple.anim.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 0.20, 0.08, 0] });
              const coreOpacity = ripple.anim.interpolate({ inputRange: [0, 0.10, 0.42, 1], outputRange: [0, 0.34, 0.12, 0] });
              return (
                <React.Fragment key={ripple.id}>
                  <Animated.View
                    style={[
                      s.tabBackdropDistortionLens,
                      {
                        left: distortionLeft,
                        top: distortionTop,
                        opacity: lensOpacity,
                        transform: [{ scale: lensScale }],
                      },
                    ]}
                  >
                    <Animated.Image
                      source={activeTabBackdropSource}
                      resizeMode="cover"
                      style={[
                        s.tabBackdropDistortionImage,
                        {
                          width: viewportW,
                          height: viewportH,
                          left: -distortionLeft,
                          top: -distortionTop,
                          transform: [
                            { scale: lensImageScale },
                            { translateX: lensImageShiftX },
                            { translateY: lensImageShiftY },
                          ],
                        },
                      ]}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.00)']}
                      locations={[0, 0.46, 1]}
                      start={{ x: 0.10, y: 0.05 }}
                      end={{ x: 0.88, y: 0.86 }}
                      style={s.tabBackdropDistortionGlint}
                    />
                  </Animated.View>
                  <Animated.View
                    style={[
                      s.tabBackdropRipple,
                      {
                        left,
                        top,
                        borderColor: tabBackdropRippleColor,
                        opacity: firstOpacity,
                        transform: [{ scale: firstScale }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      s.tabBackdropRipple,
                      s.tabBackdropRippleSecond,
                      {
                        left,
                        top,
                        borderColor: tabBackdropRippleColor,
                        opacity: secondOpacity,
                        transform: [{ scale: secondScale }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      s.tabBackdropRippleCore,
                      {
                        left: ripple.x - 5,
                        top: ripple.y - 5,
                        backgroundColor: tabBackdropRippleColor,
                        opacity: coreOpacity,
                        transform: [{ scale: coreScale }],
                      },
                    ]}
                  />
                </React.Fragment>
              );
            })}
          </View>
        </View>
      )}
      <View
        onLayout={notifyFirstContentReady}
        onTouchStart={handleBackdropTouchStart}
        onTouchEnd={handleBackdropTouchEnd}
        onTouchCancel={handleBackdropTouchCancel}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View style={{ flex: 1, maxWidth: contentMaxW, width: '100%', alignSelf: 'center', flexDirection: 'column' }}>
          {/* flex-колонка вместо absolute: таб-бар всегда снизу в дереве, его не перекрывает ScrollView/elevation */}
          <View style={s.tabContent}>
            <TabSlider activeIndex={activeIdx} onTabChange={goToTab} onSwipeStart={onSwipeStart} onSwipeComplete={onSwipeComplete} swipeEnabled={true}>
              {tabScreens}
            </TabSlider>
          </View>
          <View style={[s.tabBarWrap, { backgroundColor: t.bgPrimary }]}>
            <View
              style={[
                s.tabBar,
                {
                  height: tabBarHeight,
                  backgroundColor: isMinimal ? t.bgCard : t.bgPrimary,
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
              {TABS.map((tab, i) => {
                const focused = activeIdx === i;
                const color = focused ? t.textPrimary : t.textMuted;
                const label = isES ? tab.es : isUK ? tab.uk : tab.ru;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    testID={`tab-${tab.key}`}
                    accessibilityLabel={`qa-tab-${tab.key}`}
                    accessible={true}
                    style={s.tabBtn}
                    onPress={() => { hapticTap(); goToTab(i); }}
                    activeOpacity={0.7}
                  >
                    {focused && <View style={[s.indicator, { backgroundColor: t.textPrimary }]} />}
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
            <View style={{ height: PB, backgroundColor: isMinimal ? t.bgCard : t.bgPrimary }} />
          </View>
        </View>
      </View>
    </ScreenGradient>
  );
}

export default function TabLayout() {
  const { width: screenW, contentMaxW } = useScreen();
  const tabPaneWidth = Math.min(screenW, contentMaxW);
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
    return new Set<number>([initial]);
  });
  const router = useRouter();
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
      setActiveIdx((prev) => (prev === hold ? prev : hold));
      return;
    }
    setActiveIdx((prev) => {
      if (fromRouter === null) return prev;
      return prev === fromRouter ? prev : fromRouter;
    });
  }, [pathname, segments]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  /** Вызывается в момент отпускания пальца (до анимации) — обновляем таббар и монтируем экран назначения.
   *  Нативный driver изолирован от JS-потока, поэтому React-mount нового экрана не прерывает анимацию. */
  const handleSwipeStart = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return;
    setActiveIdx(idx);
    setVisitedTabs((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  const routerNavigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTo = useCallback((idx: number) => {
    const target = IDX_TO_TAB_ROUTE[idx];
    if (!target) return;
    if (routerShowsTab(pathname, segments, idx)) return;
    // Откладываем router.replace на следующий frame после отрисовки UI — иначе
    // usePathname()-change → useLayoutEffect → React re-render вызывает белый кадр.
    if (routerNavigateTimerRef.current) clearTimeout(routerNavigateTimerRef.current);
    routerNavigateTimerRef.current = setTimeout(() => {
      pendingTabIdxRef.current = idx;
      router.navigate(target as any);
    }, 0);
  }, [pathname, segments, router]);

  /** Тап по таббару — немедленно обновляем UI, URL обновляем асинхронно. */
  const handleTabChange = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return;
    setActiveIdx(idx);
    setVisitedTabs((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    navigateTo(idx);
  }, [navigateTo]);

  /** Свайп завершён — обновляем URL асинхронно (UI уже обновлён в handleSwipeStart). */
  const handleSwipeComplete = useCallback((idx: number) => {
    navigateTo(idx);
  }, [navigateTo]);

  const tabScreens = useMemo(() => {
    // Головна (0) і Уроки (1) завжди в дереві. Решальные табы монтируются в handleSwipeStart/handleTabChange
    // (добавляются в visitedTabs), но не раньше — чтобы не строить тяжёлые экраны при старте.
    const show = (i: number) => i === 0 || i === 1 || visitedTabs.has(i);
    const placeholder = (k: string) => (
      <View key={k} style={{ width: tabPaneWidth, flex: 1, backgroundColor: 'transparent' }} collapsable={false} />
    );
    return [
      show(0) ? <HomeScreen       key="home" />         : placeholder('ph-home'),
      show(1) ? <LessonsScreen    key="index" />        : placeholder('ph-index'),
      show(2) ? <ArenaTabScreen   key="arena" />        : placeholder('ph-arena'),
      show(3) ? <FriendsScreen    key="friends" />      : placeholder('ph-friends'),
      show(4) ? <SettingsScreen   key="settings" />     : placeholder('ph-settings'),
    ];
  }, [visitedTabs, tabPaneWidth]);

  const currentRouteIsTab = tabIdxFromRouter(pathname, segments) !== null;

  return (
    <TabProvider activeIdx={activeIdx} onTabChange={handleTabChange} onSwipeStart={handleSwipeStart} onSwipeComplete={handleSwipeComplete} focusTick={focusTick}>
      <TabScaffold tabScreens={tabScreens} currentRouteIsTab={currentRouteIsTab} />
    </TabProvider>
  );
}

const s = StyleSheet.create({
  tabBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tabBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.18 }],
  },
  tabBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBackdropRippleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBackdropDistortionLens: {
    position: 'absolute',
    width: TAB_BACKDROP_DISTORTION_SIZE,
    height: TAB_BACKDROP_DISTORTION_SIZE,
    borderRadius: TAB_BACKDROP_DISTORTION_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabBackdropDistortionImage: {
    position: 'absolute',
  },
  tabBackdropDistortionGlint: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBackdropRipple: {
    position: 'absolute',
    width: TAB_BACKDROP_RIPPLE_SIZE,
    height: TAB_BACKDROP_RIPPLE_SIZE,
    borderRadius: TAB_BACKDROP_RIPPLE_SIZE / 2,
    borderWidth: 1.25,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  tabBackdropRippleSecond: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  tabBackdropRippleCore: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). Фон прозрачный — градиент с TabScaffold, без белого «просвета». */
  tabContent: { flex: 1, minHeight: 0, width: '100%', backgroundColor: 'transparent' },
  /** Не absolute: панель — последний flex-элемент, всегда видна и кликабельна. */
  tabBarWrap: { width: '100%', flexShrink: 0, zIndex: 1, elevation: 8 },
  tabBar:     { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 6, position: 'relative', overflow: 'hidden' },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', zIndex: 10 },
  indicator:  { position: 'absolute', top: -6, left: '25%', right: '25%', height: 2, borderRadius: 1 },
  /** alignSelf + textAlign: иначе на iOS подпись может схлопнуться в «узкую колонку» и рисоваться вертикально */
  tabLabel:   { fontSize: 10, letterSpacing: 0.1, textAlign: 'center', alignSelf: 'stretch' },
});
