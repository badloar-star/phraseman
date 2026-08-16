// ─── Витрина движения · все поверхности (DEV) ───────────────────────────────
// зачем: владелец потребовал раздел в DEV Hub, где по подразделам собраны
// ВСЕ анимируемые поверхности приложения и каждый пункт запускает РЕАЛЬНЫЙ
// экран/модалку/тост (не бутафорию). Реестр шардирован по семьям:
// components/dev/motion_showcase/sections/*.ts — каждый шард пополняется
// независимо, конфликтов между сессиями нет.
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import TapScale from '../components/TapScale';
import { hapticTap } from '../hooks/use-haptics';
import { getShowcaseSections } from '../components/dev/motion_showcase';
import type { ShowcaseItem } from '../components/dev/motion_showcase/types';
import { cs } from '../components/dev/motion_showcase/showcase_copy';

export default function MotionShowcaseScreen() {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const router = useRouter();
  const sections = useMemo(() => getShowcaseSections(), []);
  /** Смонтированный render-пункт (реальная модалка с демо-пропсами). */
  const [active, setActive] = useState<ShowcaseItem | null>(null);

  const launch = useCallback((item: ShowcaseItem) => {
    hapticTap();
    if (item.kind === 'route' && item.route) {
      router.push(item.route as never);
      return;
    }
    if (item.kind === 'event' && item.fire) {
      item.fire();
      return;
    }
    if (item.kind === 'render' && item.render) {
      setActive(item);
    }
  }, [router]);

  const closeActive = useCallback(() => setActive(null), []);

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary }]}>
      <ScreenGradient />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TapScale onPress={() => router.back()} accessibilityLabel={cs('back')}>
          <View style={[styles.back, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </View>
        </TapScale>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          Движение · все поверхности
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary, fontSize: f.h3 }]}>
              {section.title}
              <Text style={{ color: t.textGhost }}>{'  ·  '}{section.items.length}</Text>
            </Text>
            <View style={[styles.card, { backgroundColor: t.bgCard, shadowColor: '#000000' }]}>
              {section.items.map((item, index) => {
                const disabled = item.kind === 'note';
                return (
                  <TapScale
                    key={item.id}
                    onPress={disabled ? undefined : () => launch(item)}
                    accessibilityLabel={item.title}
                  >
                    <View
                      style={[
                        styles.row,
                        index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border } : null,
                      ]}
                    >
                      <View style={styles.rowText}>
                        <Text
                          style={[
                            styles.rowTitle,
                            { color: disabled ? t.textGhost : t.textPrimary, fontSize: f.body },
                          ]}
                        >
                          {item.title}
                        </Text>
                        {item.detail ? (
                          <Text style={[styles.rowDetail, { color: t.textMuted, fontSize: f.caption }]}>
                            {item.detail}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={
                          item.kind === 'route' ? 'arrow-forward'
                            : item.kind === 'event' ? 'flash-outline'
                              : item.kind === 'render' ? 'play'
                                : 'time-outline'
                        }
                        size={16}
                        color={disabled ? t.textGhost : t.accent}
                      />
                    </View>
                  </TapScale>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      {active?.render ? active.render({ visible: true, onClose: closeActive }) : null}
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
  title: { fontWeight: '700', letterSpacing: -0.3, flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 6 },
  section: { marginTop: 16 },
  sectionTitle: { fontWeight: '700', letterSpacing: -0.2, marginBottom: 8, marginLeft: 2 },
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
    paddingVertical: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '700' },
  rowDetail: { marginTop: 2 },
});
