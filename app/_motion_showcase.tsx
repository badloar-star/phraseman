// ─── Витрина движения · все поверхности (DEV) ───────────────────────────────
// зачем: владелец потребовал раздел в DEV Hub, где по подразделам собраны
// ВСЕ анимируемые поверхности приложения и каждый пункт запускает РЕАЛЬНЫЙ
// экран/модалку/тост (не бутафорию). Реестр шардирован по семьям:
// components/dev/motion_showcase/sections/*.ts — каждый шард пополняется
// независимо, конфликтов между сессиями нет.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { rememberNavigationPath, safeRouterBack } from './navigation_back';
import { MOTION_SHOWCASE_ROUTE } from '../constants/devRoutes';
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
  const { acceptedCount, pendingCount } = useMemo(() => {
    let accepted = 0;
    let pending = 0;
    for (const section of sections) {
      for (const item of section.items) {
        if (item.approval === 'accepted') accepted += 1;
        else pending += 1;
      }
    }
    return { acceptedCount: accepted, pendingCount: pending };
  }, [sections]);

  // зачем: витрину часто открывают напрямую (deep link из DEV-инструментов,
  // автопрогон), и тогда журнал навигации пуст — экраны, запущенные пунктами
  // kind:'route', при «назад» не находят кандидата и ВЫХОДЯТ ИЗ ПРИЛОЖЕНИЯ на
  // рабочий стол (найдено смоук-прогоном 2026-08-16). Регистрируем витрину
  // как точку возврата до того, как из неё куда-то уйдут.
  useEffect(() => {
    rememberNavigationPath(MOTION_SHOWCASE_ROUTE);
  }, []);

  const launch = useCallback((item: ShowcaseItem) => {
    hapticTap();
    if (item.kind === 'route' && item.route) {
      // журнал должен знать текущую точку, иначе «назад» из экрана уводит мимо
      rememberNavigationPath(MOTION_SHOWCASE_ROUTE);
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
        <TapScale onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)} accessibilityLabel={cs('back')}>
          <View style={[styles.back, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </View>
        </TapScale>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {cs('screen_title')}
          </Text>
          {/* зачем: владелец смотрит витрину глазами и должен сразу видеть,
              сколько поверхностей ещё ждут его вердикта, без пересчёта строк */}
          <Text style={[styles.tally, { color: t.textMuted, fontSize: f.caption }]}>
            {`${acceptedCount} ${cs('mark_accepted')} · ${pendingCount} ${cs('mark_pending')}`}
          </Text>
        </View>
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
                        // зачем: разделяем строки ТОНОМ, не обводкой — запрет
                        // владельца на borderWidth/borderColor вокруг блоков.
                        index % 2 === 1 ? { backgroundColor: t.bgSurface } : null,
                      ]}
                    >
                      <View style={styles.rowText}>
                        <View style={styles.rowTitleLine}>
                          <Text
                            style={[
                              styles.rowTitle,
                              { color: disabled ? t.textGhost : t.textPrimary, fontSize: f.body },
                            ]}
                          >
                            {item.title}
                          </Text>
                          {/* зачем: владелец должен видеть глазами, что он уже
                              одобрил, а что ждёт его решения — метка тоном,
                              без подписи мелким шрифтом под названием. */}
                          <View
                            style={[
                              styles.mark,
                              { backgroundColor: item.approval === 'accepted' ? t.accent : t.bgCard },
                            ]}
                          >
                            <Text
                              style={[
                                styles.markText,
                                { color: item.approval === 'accepted' ? t.bgPrimary : t.textMuted, fontSize: f.caption },
                              ]}
                            >
                              {item.approval === 'accepted' ? cs('mark_accepted') : cs('mark_pending')}
                            </Text>
                          </View>
                        </View>
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
      {active?.render ? (
        // зачем: у части реальных модалок закрытие ведёт в навигацию/сеть,
        // а в витрине их надо просто снять. Каждой даём один и тот же onClose,
        // а сверху — страховочную кнопку «закрыть», чтобы ни одна поверхность
        // не оставила витрину без выхода (замечание владельца).
        <ShowcaseOverlayFrame key={active.id} onClose={closeActive}>
          {active.render({ visible: true, onClose: closeActive })}
        </ShowcaseOverlayFrame>
      ) : null}
    </View>
  );
}

function ShowcaseOverlayFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  return (
    <>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
        <TapScale onPress={onClose} accessibilityLabel={cs('close')}>
          <View
            style={[
              styles.escape,
              { top: insets.top + 10, backgroundColor: t.bgSurface, shadowColor: '#000000' },
            ]}
          >
            <Ionicons name="close" size={18} color={t.textPrimary} />
          </View>
        </TapScale>
      </View>
    </>
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
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontWeight: '700', flexShrink: 1 },
  mark: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  markText: { fontWeight: '700' },
  rowDetail: { marginTop: 2 },
  escape: {
    position: 'absolute',
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
