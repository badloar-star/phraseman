import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
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
import { countDueItemsToday } from '../active_recall';
import HomeScreen       from './home';
import LessonsScreen    from './index';
import ArenaTabScreen   from './arena';
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

/** Суффиксы путей табов — порядок важен: более длинные/специфичные раньше не нужны, /index отдельно от /home. */
const TAB_PATH_SUFFIXES = ['/home', '/index', '/arena', '/settings'] as const;

const PATHNAME_TO_IDX: Record<(typeof TAB_PATH_SUFFIXES)[number], number> = {
  '/home': 0,
  '/index': 1,
  '/arena': 2,
  '/settings': 3,
};
const IDX_TO_TAB_ROUTE: Record<number, string> = {
  0: '/(tabs)/home',
  1: '/(tabs)/index',
  2: '/(tabs)/arena',
  3: '/(tabs)/settings',
};

const TABS: TabDef[] = [
  { key: 'home', ru: 'Главная', uk: 'Головна', es: 'Inicio', icon: 'home-outline', active: 'home' },
  { key: 'index', ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', icon: 'book-outline', active: 'book' },
  { key: 'arena', ru: 'Арена', uk: 'Арена', es: 'Arena', icon: 'flash-outline', active: 'flash' },
  { key: 'settings', ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', icon: 'settings-outline', active: 'settings' },
];

type TabScaffoldProps = { tabScreens: React.ReactNode[]; homeBadge: number };

/**
 * Один full-screen ScreenGradient (орбы/градиент) под системным статус-баром + paddingTop по insets
 * (без SafeAreaView сверху — иначе над контентом оставалась «плашка» из bgPrimary).
 */
function TabScaffold({ tabScreens, homeBadge }: TabScaffoldProps) {
  const { lang } = useLang();
  const { theme: t, f, ds, themeMode, statusBarLight } = useTheme();
  const { contentMaxW, tabBarHeight, bottomInset: PB } = useScreen();
  const insets = useSafeAreaInsets();
  const { goToTab, activeIdx, homeBgParallax } = useTabNav();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const isDeepLightTab = themeMode === 'sakura' || themeMode === 'ocean';
  const isMinimal = themeMode === 'minimalLight' || themeMode === 'minimalDark';
  return (
    <ScreenGradient style={{ flex: 1 }} entranceOffsetY={homeBgParallax}>
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
                    <View style={{ position: 'relative', overflow: 'visible' }}>
                      <Ionicons
                        name={focused ? tab.active : tab.icon}
                        size={22}
                        color={color}
                      />
                      {tab.key === 'home' && homeBadge > 0 && (
                        <View style={[s.badge, { borderColor: t.bgPrimary }]}>
                          <Text style={[s.badgeText, { fontSize: f.label - 3 }]}>
                            {homeBadge > 9 ? '9+' : homeBadge}
                          </Text>
                        </View>
                      )}
                    </View>
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  // Ліниве монтування: повний екран лише для активного таба або вже відкритих (стан зберігається); інше — плейсхолдер (менш навантаження при зміні мови/теми).
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<number>());
  // Бейдж на табе Home: кол-во фраз готовых к повторению сегодня.
  // Перезагружается при каждом focusTick — т.е. после возврата из review.tsx он сбросится.
  const [homeBadge, setHomeBadge] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const suf of TAB_PATH_SUFFIXES) {
      if (pathname === suf || pathname.endsWith(suf)) {
        const idx = PATHNAME_TO_IDX[suf];
        if (idx !== undefined) {
          setActiveIdx(idx);
          return;
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeIdx)) return prev;
      const next = new Set(prev);
      next.add(activeIdx);
      return next;
    });
  }, [activeIdx]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  useEffect(() => {
    countDueItemsToday().then(setHomeBadge);
  }, [focusTick]);

  const handleTabChange = useCallback((idx: number) => {
    if (idx === activeIdx) return;
    setActiveIdx(idx);
    // URL таба должен совпадать с видимым табом — иначе после router.back() из стек-экрана
    // pathname остаётся старым (напр. /arena), и эффект ниже переключает слайдер на арену.
    const target = IDX_TO_TAB_ROUTE[idx];
    if (!target) return;
    const short = target.replace('/(tabs)', '');
    if (pathname === target || pathname.endsWith(short)) return;
    router.replace(target as any);
  }, [activeIdx, pathname, router]);

  const tabScreens = useMemo(() => {
    // Головна (0) завжди в дереві — інакше при першому візиті з іншого таба Home remount'иться
    // з нульовим стану (рівень 1, стрик 0) до приходу AsyncStorage.
    const show = (i: number) => i === 0 || visitedTabs.has(i) || i === activeIdx;
    const placeholder = (k: string) => (
      <View key={k} style={{ width: tabPaneWidth, flex: 1, backgroundColor: 'transparent' }} collapsable={false} />
    );
    return [
      show(0) ? <HomeScreen       key="home" />         : placeholder('ph-home'),
      show(1) ? <LessonsScreen    key="index" />        : placeholder('ph-index'),
      show(2) ? <ArenaTabScreen   key="arena" />        : placeholder('ph-arena'),
      show(3) ? <SettingsScreen   key="settings" />     : placeholder('ph-settings'),
    ];
  }, [visitedTabs, activeIdx, tabPaneWidth]);

  return (
    <TabProvider activeIdx={activeIdx} onTabChange={handleTabChange} focusTick={focusTick}>
      <TabScaffold tabScreens={tabScreens} homeBadge={homeBadge} />
    </TabProvider>
  );
}

const s = StyleSheet.create({
  /** Область свайпа табов; minHeight:0 — иначе flex не даёт скроллу сжиматься (RN). */
  tabContent: { flex: 1, minHeight: 0, width: '100%' },
  /** Не absolute: панель — последний flex-элемент, всегда видна и кликабельна. */
  tabBarWrap: { width: '100%', flexShrink: 0, zIndex: 1, elevation: 8 },
  tabBar:     { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 6 },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  indicator:  { position: 'absolute', top: -6, left: '25%', right: '25%', height: 2, borderRadius: 1 },
  tabLabel:   { fontSize: 10, letterSpacing: 0.1 },

  badge:      { position: 'absolute', top: -4, right: -7, backgroundColor: '#FF3B30', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' as const, lineHeight: 13 },
});
