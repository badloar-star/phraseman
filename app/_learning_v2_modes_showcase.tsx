// ─── Learning V2 · витрина 7 одобренных режимов (список-меню) ───
// зачем: владелец потребовал ОТДЕЛЬНЫЙ подраздел DEV Hub (не встроенный
// внутрь «Движение · все поверхности») — список из 7 карточек, каждая
// открывает ПОЛНОЭКРАННЫЙ работающий режим (см.
// app/learning_v2_modes_showcase_run/[family].tsx), а не превью в скролле.
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { rememberNavigationPath, safeRouterBack } from './navigation_back';
import {
  LEARNING_V2_MODES_SHOWCASE_ROUTE,
  LEARNING_V2_MODES_SHOWCASE_RUN_DIR_NAME,
} from '../constants/devRoutes';
import TapScale from '../components/TapScale';
import { hapticTap } from '../hooks/use-haptics';
import { cs } from '../components/dev/motion_showcase/showcase_copy';
import {
  LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1,
  LEARNING_V2_MODE_SHOWCASE_FIXTURES_V1,
  LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1,
} from '../modules/learning-v2/modes/dev_showcase_fixtures_v1';

export default function LearningV2ModesShowcaseScreen() {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const router = useRouter();

  // зачем: та же ловушка навигации, что в _motion_showcase.tsx (найдена
  // смоук-прогоном 2026-08-16) — открытый напрямую deep-link без журнала
  // навигации на «назад» выходит из приложения на рабочий стол.
  useEffect(() => {
    rememberNavigationPath(LEARNING_V2_MODES_SHOWCASE_ROUTE);
  }, []);

  const items = [
    ...LEARNING_V2_SHOWCASE_TEXT_FAMILIES_V1.map((family) => LEARNING_V2_MODE_SHOWCASE_FIXTURES_V1[family]),
    LEARNING_V2_MODE_SHOWCASE_VOICE_FIXTURE_V1,
  ];

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary }]}>
      <ScreenGradient />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TapScale onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)} accessibilityLabel={cs('lv2_showcase_back')}>
          <View style={[styles.back, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </View>
        </TapScale>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {cs('lv2_showcase_title')}
          </Text>
          <Text style={[styles.tally, { color: t.textMuted, fontSize: f.caption }]}>
            {cs('lv2_showcase_tally')}
          </Text>
        </View>
      </View>
      {/* guard-ok: фиксированный список из 7 пунктов (никогда не растёт) —
          виртуализация FlatList хуже плоского ScrollView.map на таком размере,
          тот же паттерн уже принят в app/_motion_showcase.tsx. */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: '#000000' }]}>
          {items.map((item, index) => (
            <TapScale
              key={item.family}
              onPress={() => {
                hapticTap();
                rememberNavigationPath(LEARNING_V2_MODES_SHOWCASE_ROUTE);
                router.push(`/${LEARNING_V2_MODES_SHOWCASE_RUN_DIR_NAME}/${item.family}` as never);
              }}
              accessibilityLabel={item.title}
            >
              <View
                style={[
                  styles.row,
                  // зачем: разделяем строки ТОНОМ, не обводкой — запрет
                  // владельца на borderWidth/borderColor вокруг блоков.
                  index % 2 === 1 ? { backgroundColor: t.bgSurface } : null,
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.body }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.rowDetail, { color: t.textMuted, fontSize: f.caption }]}>
                    {item.mockupSource}
                  </Text>
                </View>
                <Ionicons name="play" size={16} color={t.accent} />
              </View>
            </TapScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontWeight: '700', letterSpacing: -0.3 },
  tally: { marginTop: 2 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '700' },
  rowDetail: { marginTop: 3 },
});
