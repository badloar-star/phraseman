import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect, usePathname } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLang } from '../../components/LangContext';
import { useTheme } from '../../components/ThemeContext';
import { useScreen } from '../../hooks/use-screen';
import TabSlider from '../TabSlider';
import { TabProvider } from '../TabContext';
import { hapticTap } from '../../hooks/use-haptics';
import { getDueItems } from '../active_recall';

// Маршруты таб-экранов
const TAB_ROUTES = new Set(['/', '/home', '/index', '/quizzes', '/hall_of_fame', '/settings']);

import HomeScreen       from './home';
import LessonsScreen    from './index';
import QuizzesScreen    from './quizzes';
import HallOfFameScreen from './hall_of_fame';
import SettingsScreen   from './settings';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS = [
  { key:'home',        ru:'Главная',   uk:'Головна',      icon:'home-outline'     as IconName, active:'home'      as IconName },
  { key:'index',       ru:'Уроки',     uk:'Уроки',        icon:'book-outline'     as IconName, active:'book'      as IconName },
  { key:'quizzes',     ru:'Квизы',     uk:'Квізи',        icon:'aperture-outline' as IconName, active:'aperture'  as IconName },
  { key:'hall_of_fame',ru:'Зал славы', uk:'Зал слави',    icon:'trophy-outline'   as IconName, active:'trophy'    as IconName },
  { key:'settings',    ru:'Настройки', uk:'Налаштування', icon:'settings-outline' as IconName, active:'settings'  as IconName },
];

export default function TabLayout() {
  const { lang }             = useLang();
  const { theme: t, isDark } = useTheme();
  const { tabBarHeight, contentMaxW, bottomInset: PB } = useScreen();
  const isUK = lang === 'uk';
  const [activeIdx, setActiveIdx] = useState(0);
  const [focusTick, setFocusTick] = useState(0);
  // Бейдж на табе Home: кол-во фраз готовых к повторению сегодня.
  // Перезагружается при каждом focusTick — т.е. после возврата из review.tsx он сбросится.
  const [homeBadge, setHomeBadge] = useState(0);
  const pathname = usePathname();

  // Sync active tab when navigated to from outside (e.g. daily_tasks_screen)
  const PATHNAME_TO_IDX: Record<string, number> = {
    '/home': 0,
    '/index': 1,
    '/quizzes': 2,
    '/hall_of_fame': 3,
    '/settings': 4,
  };
  useEffect(() => {
    const idx = PATHNAME_TO_IDX[pathname];
    if (idx !== undefined) setActiveIdx(idx);
  }, [pathname]);

  useFocusEffect(useCallback(() => { setFocusTick(tick => tick + 1); }, []));

  useEffect(() => {
    getDueItems(50).then(items => setHomeBadge(items.length));
  }, [focusTick]);

  const handleTabChange = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  const tabScreens = [
    <HomeScreen       key="home" />,
    <LessonsScreen    key="index" />,
    <QuizzesScreen    key="quizzes" />,
    <HallOfFameScreen key="hall_of_fame" />,
    <SettingsScreen   key="settings" />,
  ];

  return (
    <TabProvider activeIdx={activeIdx} onTabChange={handleTabChange} focusTick={focusTick}>
      <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: t.bgPrimary }]}>
        <View style={{ flex: 1, maxWidth: contentMaxW, width: '100%', alignSelf: 'center' }}>
        <View style={[s.content, { paddingBottom: tabBarHeight + PB }]}>
          <TabSlider activeIndex={activeIdx} onTabChange={handleTabChange}>
            {tabScreens}
          </TabSlider>
        </View>
        <View style={[s.tabBarWrap, { backgroundColor: t.bgPrimary }]}>
          <View style={[s.tabBar, { backgroundColor: t.bgPrimary, borderTopColor: t.border, height: tabBarHeight }]}>
            {TABS.map((tab, i) => {
              const focused = activeIdx === i;
              const isLight = !isDark;
              const color = focused ? t.textPrimary : t.textMuted;
              const label = isUK ? tab.uk : tab.ru;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={s.tabBtn}
                  onPress={() => { hapticTap(); handleTabChange(i); }}
                  activeOpacity={0.7}
                >
                  {focused && (
                    <View style={[s.indicator, { backgroundColor: t.textPrimary }]} />
                  )}
                  <View style={{ position: 'relative' }}>
                    <Ionicons
                      name={focused ? tab.active : tab.icon}
                      size={22}
                      color={color}
                    />
                    {i === 0 && homeBadge > 0 && (
                      <View style={[s.badge, { borderColor: t.bgPrimary }]}>
                        <Text style={s.badgeText}>
                          {homeBadge > 9 ? '9+' : homeBadge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.tabLabel, { color, fontWeight: focused ? '600' : '400' }]} numberOfLines={1}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: PB, backgroundColor: t.bgPrimary }} />
        </View>
        </View>
      </SafeAreaView>
    </TabProvider>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  content:    { flex: 1 },
  tabBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  tabBar:     { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 6 },
  tabBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  indicator:  { position: 'absolute', top: -6, left: '25%', right: '25%', height: 2, borderRadius: 1 },
  tabLabel:   { fontSize: 10, letterSpacing: 0.1 },
  pillLight:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badge:      { position: 'absolute', top: -4, right: -7, backgroundColor: '#FF3B30', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5 },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' as const, lineHeight: 13 },
});
