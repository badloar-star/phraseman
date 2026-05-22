import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, Easing, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { scheduleAnimatedStateUpdate, type ScheduledAnimatedStateUpdate } from '../../components/animationScheduling';
import { backgroundTransitionKey, usePersistentBackgroundLayers } from '../../components/backgroundTransition';
import { rememberAppArtBackdrop } from '../../components/AppArtBackdrop';
import type { AppArtBackdropName } from '../../components/appArtBackdropRegistry';
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

const HOME_THEME_BACKDROPS = {
  dark: require('../../assets/images/home/home-study-dark.webp'),
  neon: require('../../assets/images/home/home-study-neon.webp'),
  gold: require('../../assets/images/home/home-study-gold.webp'),
  coral: require('../../assets/images/home/home-study-coral.webp'),
  minimalLight: require('../../assets/images/home/home-study-minimal-light.webp'),
  minimalDark: require('../../assets/images/home/home-study-minimal-dark.webp'),
} as const;

const LESSONS_THEME_BACKDROPS = {
  dark: require('../../assets/images/lessons/lessons-path-dark.webp'),
  neon: require('../../assets/images/lessons/lessons-path-neon.webp'),
  gold: require('../../assets/images/lessons/lessons-path-gold.webp'),
  coral: require('../../assets/images/lessons/lessons-path-coral.webp'),
  minimalLight: require('../../assets/images/lessons/lessons-path-minimal-light.webp'),
  minimalDark: require('../../assets/images/lessons/lessons-path-minimal-dark.webp'),
} as const;

const ARENA_THEME_BACKDROPS = {
  dark: require('../../assets/images/arena/knowledge-arena-dark.webp'),
  neon: require('../../assets/images/arena/knowledge-arena-neon.webp'),
  gold: require('../../assets/images/arena/knowledge-arena-gold.webp'),
  coral: require('../../assets/images/arena/knowledge-arena-coral.webp'),
  minimalLight: require('../../assets/images/arena/knowledge-arena-minimal-light.webp'),
  minimalDark: require('../../assets/images/arena/knowledge-arena-minimal-dark.webp'),
} as const;

const FRIENDS_THEME_BACKDROPS = {
  dark: require('../../assets/images/friends/friends-guild-dark.webp'),
  neon: require('../../assets/images/friends/friends-guild-neon.webp'),
  gold: require('../../assets/images/friends/friends-guild-gold.webp'),
  coral: require('../../assets/images/friends/friends-guild-coral.webp'),
  minimalLight: require('../../assets/images/friends/friends-guild-minimal-light.webp'),
  minimalDark: require('../../assets/images/friends/friends-guild-minimal-dark.webp'),
} as const;

const SETTINGS_THEME_BACKDROPS = {
  dark: require('../../assets/images/settings/settings-sanctum-dark.webp'),
  neon: require('../../assets/images/settings/settings-sanctum-neon.webp'),
  gold: require('../../assets/images/settings/settings-sanctum-gold.webp'),
  coral: require('../../assets/images/settings/settings-sanctum-coral.webp'),
  minimalLight: require('../../assets/images/settings/settings-sanctum-minimal-light.webp'),
  minimalDark: require('../../assets/images/settings/settings-sanctum-minimal-dark.webp'),
} as const;

const TAB_BACKGROUND_TRANSITION_MS = 900;
const TAB_BACKDROP_IMAGE_SCALE_END = 1.18;

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
  { key: 'home', ru: 'Главная', uk: 'Головна', es: 'Inicio', 'pt-BR': 'Início', vi: 'Trang chủ', id: 'Beranda', tr: 'Ana sayfa', pl: 'Start', icon: 'home-outline', active: 'home' },
  { key: 'index', ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje', icon: 'book-outline', active: 'book' },
  { key: 'arena', ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena', icon: 'flash-outline', active: 'flash' },
  { key: 'friends', ru: 'Друзья', uk: 'Друзі', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi', icon: 'people-outline', active: 'people' },
  { key: 'settings', ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', 'pt-BR': 'Configurações', vi: 'Cài đặt', id: 'Pengaturan', tr: 'Ayarlar', pl: 'Ustawienia', icon: 'settings-outline', active: 'settings' },
];

type TabScaffoldProps = { tabScreens: React.ReactNode[]; currentRouteIsTab: boolean };

type TabBackdropState = {
  key: string;
  source: ImageSourcePropType;
  imageOpacity: number;
  imageTranslateX: number;
  scrim: [string, string, string];
  edgeScrim: [string, string, string, string];
};
type TabChromeLayer = {
  id: number;
  wrapBg: string;
  barBg: string;
  safeBg: string;
  fade: Animated.Value;
};

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, currentRouteIsTab }: TabScaffoldProps) {
  const { lang } = useLang();
  const { theme: t, f, ds, themeMode, statusBarLight } = useTheme();
  const { width: viewportW } = useWindowDimensions();
  const { contentMaxW, tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, onSwipeStart, onSwipeComplete } = useTabNav();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  const isHomeBackdrop = activeIdx === 0;
  const isLessonsBackdrop = activeIdx === 1;
  const isArenaBackdrop = activeIdx === 2;
  const isFriendsBackdrop = activeIdx === 3;
  const isSettingsBackdrop = activeIdx === 4;
  const activeTabArtBackdropName: AppArtBackdropName =
    isHomeBackdrop ? 'home' :
    isLessonsBackdrop ? 'lessons' :
    isArenaBackdrop ? 'arena' :
    isFriendsBackdrop ? 'friends' :
    'settings';
  const activeTabBackdropSource =
    isHomeBackdrop
      ? (HOME_THEME_BACKDROPS[themeMode] ?? HOME_THEME_BACKDROPS.dark)
      : isLessonsBackdrop
        ? (LESSONS_THEME_BACKDROPS[themeMode] ?? LESSONS_THEME_BACKDROPS.dark)
      : isArenaBackdrop
      ? (ARENA_THEME_BACKDROPS[themeMode] ?? ARENA_THEME_BACKDROPS.dark)
      : isFriendsBackdrop
        ? (FRIENDS_THEME_BACKDROPS[themeMode] ?? FRIENDS_THEME_BACKDROPS.dark)
      : isSettingsBackdrop
        ? (SETTINGS_THEME_BACKDROPS[themeMode] ?? SETTINGS_THEME_BACKDROPS.dark)
        : null;
  const showTabBackdrop = currentRouteIsTab && activeTabBackdropSource !== null;
  const tabBackdropOpacity = isHomeBackdrop
    ? themeMode === 'minimalLight' ? 0.16 :
      themeMode === 'minimalDark' ? 0.18 :
      themeMode === 'neon' ? 0.20 :
      themeMode === 'gold' ? 0.30 :
      themeMode === 'coral' ? 0.22 :
      0.24
    : isLessonsBackdrop
      ? themeMode === 'minimalLight' ? 0.17 :
        themeMode === 'minimalDark' ? 0.22 :
        themeMode === 'neon' ? 0.24 :
        themeMode === 'gold' ? 0.34 :
        themeMode === 'coral' ? 0.26 :
        0.28
    : isSettingsBackdrop
    ? themeMode === 'minimalLight' ? 0.20 :
      themeMode === 'minimalDark' ? 0.24 :
      themeMode === 'neon' ? 0.26 :
      themeMode === 'gold' ? 0.36 :
      themeMode === 'coral' ? 0.30 :
      0.32
    : isFriendsBackdrop
      ? themeMode === 'minimalLight' ? 0.18 :
        themeMode === 'minimalDark' ? 0.24 :
        themeMode === 'neon' ? 0.26 :
        themeMode === 'gold' ? 0.34 :
        themeMode === 'coral' ? 0.28 :
        0.32
    : themeMode === 'minimalLight' ? 0.16 :
      themeMode === 'gold' ? 0.10 :
      themeMode === 'neon' ? 0.08 :
      0.11;
  const tabBackdropScrim = useMemo<[string, string, string]>(() => (
    isHomeBackdrop
      ? themeMode === 'minimalLight'
        ? ['rgba(0,0,0,0.14)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.28)']
        : themeMode === 'gold'
          ? ['rgba(0,0,0,0.58)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.86)']
          : ['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.78)']
      : isLessonsBackdrop
        ? themeMode === 'minimalLight'
          ? ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.24)']
          : themeMode === 'gold'
            ? ['rgba(0,0,0,0.60)', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.88)']
            : ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.72)']
      : isFriendsBackdrop || isSettingsBackdrop
        ? themeMode === 'minimalLight'
          ? ['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.22)']
          : themeMode === 'gold'
            ? ['rgba(0,0,0,0.60)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.86)']
            : ['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.66)']
      : themeMode === 'minimalLight'
        ? ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.18)']
        : themeMode === 'gold'
          ? ['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.54)', 'rgba(0,0,0,0.94)']
          : ['rgba(0,0,0,0.64)', 'rgba(0,0,0,0.44)', 'rgba(0,0,0,0.90)']
  ), [isFriendsBackdrop, isHomeBackdrop, isLessonsBackdrop, isSettingsBackdrop, themeMode]);
  const tabBackdropEdgeScrim = useMemo<[string, string, string, string]>(() => (
    themeMode === 'minimalLight'
      ? ['rgba(255,252,246,0.44)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0)', 'rgba(255,252,246,0.26)']
      : themeMode === 'gold'
        ? ['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']
        : themeMode === 'minimalDark'
          ? ['rgba(0,0,0,0.34)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']
          : ['rgba(0,0,0,0.30)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.20)']
  ), [themeMode]);
  const tabBackdropImageTranslateX = showTabBackdrop
    ? isHomeBackdrop
      ? -Math.round(Math.min(30, Math.max(16, viewportW * 0.052)))
      : isLessonsBackdrop
        ? 0
      : isFriendsBackdrop
        ? -Math.round(Math.min(22, Math.max(10, viewportW * 0.034)))
        : isSettingsBackdrop
          ? -Math.round(Math.min(16, Math.max(8, viewportW * 0.024)))
          : 0
    : 0;
  const tabChromeSolidBg = isMinimal ? t.bgCard : t.bgPrimary;
  const tabChromeBackdropBg =
    themeMode === 'minimalLight' ? 'rgba(255,252,246,0.94)' :
    themeMode === 'gold' ? 'rgba(3,3,3,0.88)' :
    themeMode === 'minimalDark' ? 'rgba(18,18,18,0.78)' :
    'rgba(6,8,10,0.76)';
  const tabChromeWrapBg = showTabBackdrop ? 'rgba(0,0,0,0)' : t.bgPrimary;
  const tabChromeBarBg = showTabBackdrop ? tabChromeBackdropBg : tabChromeSolidBg;
  const tabChromeSafeBg = tabChromeBarBg;
  const tabChromeKey = `${themeMode}:${showTabBackdrop ? 'art' : 'plain'}:${tabChromeWrapBg}:${tabChromeBarBg}:${tabChromeSafeBg}`;
  const tabBackdropKey = showTabBackdrop && activeTabBackdropSource
    ? `${activeIdx}:${themeMode}:${Math.round(viewportW)}:${backgroundTransitionKey(activeTabBackdropSource)}`
    : 'none';
  const targetTabBackdrop = useMemo<TabBackdropState | null>(() => {
    if (!showTabBackdrop || !activeTabBackdropSource) return null;

    return {
      key: tabBackdropKey,
      source: activeTabBackdropSource,
      imageOpacity: tabBackdropOpacity,
      imageTranslateX: tabBackdropImageTranslateX,
      scrim: tabBackdropScrim as [string, string, string],
      edgeScrim: tabBackdropEdgeScrim,
    };
  }, [activeTabBackdropSource, showTabBackdrop, tabBackdropEdgeScrim, tabBackdropImageTranslateX, tabBackdropKey, tabBackdropOpacity, tabBackdropScrim]);
  const { layers: tabBackdropLayers } = usePersistentBackgroundLayers({
    value: targetTabBackdrop,
    transitionKey: tabBackdropKey,
    fadeInDuration: TAB_BACKGROUND_TRANSITION_MS,
    fadeOutDuration: TAB_BACKGROUND_TRANSITION_MS,
    fadeOutDelay: TAB_BACKGROUND_TRANSITION_MS,
    maxLayers: 4,
  });
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
  useEffect(() => {
    rememberAppArtBackdrop(activeTabArtBackdropName, themeMode, viewportW);
  }, [activeTabArtBackdropName, themeMode, viewportW]);

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

    const previousLayers = tabChromeLayersRef.current;
    const nextLayer: TabChromeLayer = {
      id: ++tabChromeLayerSeqRef.current,
      wrapBg: tabChromeWrapBg,
      barBg: tabChromeBarBg,
      safeBg: tabChromeSafeBg,
      fade: new Animated.Value(0),
    };

    previousLayers.forEach(layer => {
      layer.fade.stopAnimation();
      Animated.timing(layer.fade, {
        toValue: 0,
        duration: TAB_BACKGROUND_TRANSITION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
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
      useNativeDriver: true,
    }).start();
  }, [removeTabChromeLayerAfterCommit, tabChromeBarBg, tabChromeKey, tabChromeSafeBg, tabChromeWrapBg]);

  return (
    <ScreenGradient artBackdrop={false} style={{ flex: 1 }} staticParallaxY={HOME_ENTRANCE.bgDriftPx}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {tabBackdropLayers.some(layer => layer.value) && (
        <View pointerEvents="none" style={s.tabBackdropLayer}>
          {tabBackdropLayers.map(layer => {
            const backdrop = layer.value;
            if (!backdrop) return null;

            const imageOpacity = layer.opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, backdrop.imageOpacity],
            });

            return (
              <React.Fragment key={layer.id}>
                <Animated.Image
                  source={backdrop.source}
                  resizeMode="cover"
                  fadeDuration={0}
                  style={[
                    s.tabBackdropImage,
                    {
                      opacity: imageOpacity,
                      transform: [
                        { scale: TAB_BACKDROP_IMAGE_SCALE_END },
                        { translateX: backdrop.imageTranslateX },
                      ],
                    },
                  ]}
                />
                <Animated.View pointerEvents="none" style={[s.tabBackdropScrim, { opacity: layer.opacity }]}>
                  <LinearGradient
                    colors={backdrop.scrim}
                    locations={[0, 0.48, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={s.tabBackdropScrim}
                  />
                  <LinearGradient
                    colors={backdrop.edgeScrim}
                    locations={[0, 0.20, 0.82, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={s.tabBackdropScrim}
                  />
                </Animated.View>
              </React.Fragment>
            );
          })}
        </View>
      )}
      <View
        onLayout={notifyFirstContentReady}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View style={{ flex: 1, maxWidth: contentMaxW, width: '100%', alignSelf: 'center', flexDirection: 'column' }}>
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
              {tabChromeLayers.map(layer => (
                <Animated.View
                  key={`wrap-${layer.id}`}
                  style={[s.tabChromeFill, { backgroundColor: layer.wrapBg, opacity: layer.fade }]}
                />
              ))}
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
                {tabChromeLayers.map(layer => (
                  <Animated.View
                    key={`bar-${layer.id}`}
                    style={[s.tabChromeFill, { backgroundColor: layer.barBg, opacity: layer.fade }]}
                  />
                ))}
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
                    onPress={() => { hapticTap(); goToTab(i); }}
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
                {tabChromeLayers.map(layer => (
                  <Animated.View
                    key={`safe-${layer.id}`}
                    style={[s.tabChromeFill, { backgroundColor: layer.safeBg, opacity: layer.fade }]}
                  />
                ))}
              </View>
            </View>
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
    return new Set<number>([0, 1, initial]);
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

  const rememberVisitedTab = useCallback((idx: number) => {
    if (idx <= 1) return;
    setVisitedTabs((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  /** Вызывается в момент отпускания пальца (до анимации) — обновляем таббар и монтируем экран назначения.
   *  Нативный driver изолирован от JS-потока, поэтому React-mount нового экрана не прерывает анимацию. */
  const handleSwipeStart = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return;
    setActiveIdx(idx);
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
  },
  tabBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
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
