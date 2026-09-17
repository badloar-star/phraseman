/**
 * DialogGoalsSheet — список ВСЕХ заданий диалога.
 *
 * зачем (владелец 2026-09-17): «цели должно быть нажимабельным и открывать
 * модал лист и показывать какие цели все». Раньше строка целей в шапке была
 * мёртвой (`accessibilityRole="text"`) и показывала ТОЛЬКО текущую цель —
 * человек не видел, сколько всего осталось и что именно.
 *
 * Каркас (выезд снизу, вуаль, drag-to-dismiss 88px/velocityY 900) намеренно
 * скопирован из DialogWhySheet: жест шторок во всём приложении обязан
 * ощущаться одинаково.
 *
 * Данные локальные (objectives сценария + множество выполненных) — ни сети,
 * ни спиннера: список открывается мгновенно.
 *
 * Токены темы, fontWeight только 400/700, без обводок контейнеров.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import { triLang, type Lang } from '../../constants/i18n';
import type { DialogObjective } from '../../app/ai_dialog_scenarios';

const SHEET_HIDDEN = 420;

interface DialogGoalsSheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  /** Все задания сценария по порядку разговора. */
  objectives: readonly DialogObjective[];
  /** id уже закрытых заданий. */
  objectivesMet: ReadonlySet<string>;
  testID?: string;
}

export default function DialogGoalsSheet({
  visible,
  onClose,
  lang,
  objectives,
  objectivesMet,
  testID,
}: DialogGoalsSheetProps) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    if (reduceMotion) {
      backdropO.value = 1;
      sheetY.value = 0;
      return;
    }
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetY.value = withTiming(0, { duration: 340, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, dragTranslateY, reduceMotion]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    if (reduceMotion) {
      handleCloseRef.current();
      return;
    }
    backdropO.value = withTiming(0, { duration: 180 });
    // Страховка: коллбэк Reanimated при отмене приходит с finished=false, и
    // шторка «зависала открытой» невидимо — JS-таймер закрывает всегда.
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, 300);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 220, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, sheetY, reduceMotion]);

  const closeAfterSwipe = useCallback(() => {
    handleCloseRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 240 }, (finished) => {
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  const doneCount = objectives.filter((o) => objectivesMet.has(o.id)).length;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <View style={styles.avoider} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              testID={testID}
              style={[
                styles.sheet,
                { backgroundColor: t.bgCard, paddingBottom: 20 + bottomInset, maxHeight: viewportHeight * 0.82 },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>

              <View style={styles.header}>
                <Ionicons name="flag" size={22} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', flex: 1 }} maxFontSizeMultiplier={1.2}>
                  {triLang(lang, {
                    ru: 'Задания', uk: 'Завдання', en: 'Goals', es: 'Objetivos',
                    'pt-BR': 'Objetivos', vi: 'Nhiệm vụ', id: 'Tugas', tr: 'Görevler', pl: 'Zadania',
                  })}
                </Text>
                <Pressable
                  onPress={dismissSheet}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  style={({ pressed }) => [styles.closeBtn, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </Pressable>
              </View>

              {/* Счётчик крупно: сколько закрыто из скольких. */}
              <Text
                style={{ color: t.textSecond, fontSize: f.body, fontWeight: '700', marginBottom: 12 }}
                maxFontSizeMultiplier={1.2}
              >
                {`${doneCount} / ${objectives.length}`}
              </Text>

              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 4, gap: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {/* guard-ok: заданий 4–7 по контракту (ai_dialog_objectives_contract),
                    FlatList на семи строках дороже, чем сам список. */}
                {objectives.map((objective) => {
                  const done = objectivesMet.has(objective.id);
                  return (
                    <View
                      key={objective.id}
                      style={[styles.row, { backgroundColor: done ? t.accentBg : t.bgSurface2 }]}
                      accessibilityRole="text"
                      accessibilityLabel={`${objective.labelRu}. ${done
                        ? triLang(lang, {
                            ru: 'Выполнено', uk: 'Виконано', en: 'Done', es: 'Hecho', 'pt-BR': 'Concluído',
                            vi: 'Xong', id: 'Selesai', tr: 'Tamamlandı', pl: 'Ukończono',
                          })
                        : triLang(lang, {
                            ru: 'Ещё не выполнено', uk: 'Ще не виконано', en: 'Not done yet', es: 'Aún no',
                            'pt-BR': 'Ainda não', vi: 'Chưa xong', id: 'Belum', tr: 'Henüz değil', pl: 'Jeszcze nie',
                          })}`}
                    >
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={done ? t.accent : t.textMuted}
                      />
                      <Text
                        style={{
                          color: done ? t.textSecond : t.textPrimary,
                          fontSize: f.body,
                          fontWeight: done ? '400' : '700',
                          flex: 1,
                          lineHeight: Math.round(f.body * 1.35),
                        }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {objective.labelRu}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    overflow: 'hidden',
  },
  grabber: { alignItems: 'center', paddingVertical: 6 },
  grabberPill: { width: 38, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 54,
    paddingVertical: 10,
  },
});
