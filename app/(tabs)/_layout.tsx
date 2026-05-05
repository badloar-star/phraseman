import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFocusEffect, usePathname, useRouter, useSegments } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { useScreen } from '../../hooks/use-screen';
import ScreenGradient from '../../components/ScreenGradient';
import TabSlider from '../TabSlider';
import { TabProvider, useTabNav } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { HOME_ENTRANCE } from '../../constants/motion';
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

type TabScaffoldProps = { tabScreens: React.ReactNode[] };

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens }: TabScaffoldProps) {
  const { lang } = useLang();
  const { theme: t, f, ds, themeMode, statusBarLight } = useTheme();
  const { contentMaxW, tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx } = useTabNav();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const isDeepLightTab = themeMode === 'sakura' || themeMode === 'ocean';
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  return (
    <ScreenGradient style={{ flex: 1 }} staticParallaxY={HOME_ENTRANCE.bgDriftPx}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flex: 1, maxWidth: contentMaxW, width: '100%', alignSelf: 'center', flexDirection: 'column' }}>
          {/* flex-колонка вместо absolute: таб-бар всегда снизу в дереве, его не перекрывает ScrollView/elevation */}
          <View style={s.tabContent}>
            <TabSlider activeIndex={activeIdx} onTabChange={goToTab} swipeEnabled={true}>
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
                  borderTopColor: isDeepLightTab
                    ? (themeMode === 'sakura' ? 'rgba(255,200,220,0.18)' : 'rgba(100,200,255,0.24)')
                    : t.border,
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
                const color = isDeepLightTab
                  ? (themeMode === 'sakura'
                    ? (focused ? 'rgba(255,248,252,0.95)' : 'rgba(255,220,235,0.55)')
                    : (focused ? 'rgba(240,252,255,0.95)' : 'rgba(180,220,255,0.6)'))
                  : (focused ? t.textPrimary : t.textMuted);
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
                    {focused && (
                      <View style={[s.indicator, { backgroundColor: isDeepLightTab ? (themeMode === 'sakura' ? 'rgba(255,180,210,0.9)' : 'rgba(120,210,255,0.95)') : t.textPrimary }]} />
                    )}
                    <Ionicons
                      name={focused ? tab.active : tab.icon}
                      size={22}
                      color={color}
                    />
                    <Text style={[s.tabLabel, { color, fontWeight: focused ? '600' : '400', fontSize: f.label }]} numberOfLines={1}>
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
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<number>());
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

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeIdx)) return prev;
      const next = new Set(prev);
      next.add(activeIdx);
      return next;
    });
  }, [activeIdx]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  const handleTabChange = useCallback((idx: number) => {
    if (idx === activeIdxRef.current) return;
    pendingTabIdxRef.current = idx;
    setActiveIdx(idx);
    // URL таба должен совпадать с видимым табом — иначе после router.back() из стек-экрана
    // pathname остаётся старым (напр. /arena), и эффект ниже переключает слайдер на арену.
    const target = IDX_TO_TAB_ROUTE[idx];
    if (!target) return;
    if (routerShowsTab(pathname, segments, idx)) {
      pendingTabIdxRef.current = null;
      return;
    }
    router.replace(target as any);
  }, [pathname, segments, router]);

  const tabScreens = useMemo(() => {
    // Головна (0) і Уроки (1) завжди в дереві — інакше при першому відкритті таба екран монтується
    // «з нуля» і користувач бачить порожній список / нульові прогреси до приходу AsyncStorage.
    const show = (i: number) => i === 0 || i === 1 || visitedTabs.has(i) || i === activeIdx;
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
  }, [visitedTabs, activeIdx, tabPaneWidth]);

  return (
    <TabProvider activeIdx={activeIdx} onTabChange={handleTabChange} focusTick={focusTick}>
      <TabScaffold tabScreens={tabScreens} />
    </TabProvider>
  );
}

const s = StyleSheet.create({
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). Фон прозрачный — градиент с TabScaffold, без белого «просвета». */
  tabContent: { flex: 1, minHeight: 0, width: '100%', backgroundColor: 'transparent' },
  /** Не absolute: панель — последний flex-элемент, всегда видна и кликабельна. */
  tabBarWrap: { width: '100%', flexShrink: 0, zIndex: 1, elevation: 8 },
  tabBar:     { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 6 },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  indicator:  { position: 'absolute', top: -6, left: '25%', right: '25%', height: 2, borderRadius: 1 },
  /** alignSelf + textAlign: иначе на iOS подпись может схлопнуться в «узкую колонку» и рисоваться вертикально */
  tabLabel:   { fontSize: 10, letterSpacing: 0.1, textAlign: 'center', alignSelf: 'stretch' },
});
