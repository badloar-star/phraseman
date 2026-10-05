// ─── Нижняя шторка кита 2.0 — kit.css `.sheet` / `.grab` ──────────────────────
// зачем (координатор 05.10, Сверка system-014/015): входящие в макете — шторка снизу поверх раздела, а не
// полноэкранное окно. Вид — kit.css `.sheet`: радиус 28 сверху, поля 12/18/40, фон --sheet, кромка 1 px без нижней,
// ручка 44×5; выезд и уход 440 мс cubic-bezier(.2,1,.3,1) (CSS-переход один на обе стороны); затемнение .6 за 260 мс. Всё движение — Reanimated на
// UI-потоке, без setState в кадрах.
//
// Видимость управляется снаружи (visible). На visible=false шторка сама доигрывает уход и только потом снимает
// Modal. Перетаскивание вниз — только за ручку и шапку (`header`), чтобы не спорить с прокруткой списка внутри.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { KIT_MOTION, LUM, SHEET } from '../../constants/motionHybrid';
import { useTheme } from '../ThemeContext';

const SHEET_EASE = REasing.bezier(...KIT_MOTION.sheetEase);
const INSTANT = LUM.instantMs;

type Props = Readonly<{
  visible: boolean;
  /** Фон, «назад», перетаскивание вниз. Само закрытие — снаружи (visible=false). */
  onRequestClose: () => void;
  /** Ручка и шапка: зона перетаскивания. */
  header: React.ReactNode;
  /** Содержимое под шапкой (список). Получает остаток высоты шторки. */
  children: React.ReactNode;
  /** Подпись фона для скринридера (= подпись кнопки закрытия). */
  closeLabel: string;
  /** Доля высоты окна, выше которой шторка не растёт. */
  maxHeightRatio?: number;
  /** Высота содержимого фиксирована (для списков); иначе — по содержимому. */
  fill?: boolean;
  testID?: string;
}>;

export function KitSheetModal({ visible, onRequestClose, closeLabel, header, children, maxHeightRatio = KIT_MOTION.sheetMaxHeight, fill = false, testID }: Props) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const [presented, setPresented] = useState(visible);
  const backdropO = useSharedValue(0);
  const slide = useSharedValue(1); // 1 — за краем, 0 — на месте
  const drag = useSharedValue(0);
  const requestCloseRef = useRef(onRequestClose);
  requestCloseRef.current = onRequestClose;

  useEffect(() => {
    if (visible) {
      setPresented(true);
      drag.value = 0;
      backdropO.value = withTiming(1, { duration: reduceMotion ? INSTANT : KIT_MOTION.dimMs });
      slide.value = 1;
      slide.value = withTiming(0, { duration: reduceMotion ? INSTANT : KIT_MOTION.sheetMs, easing: SHEET_EASE });
      return () => { cancelAnimation(slide); cancelAnimation(backdropO); };
    }
    // Уход: доигрываем и только потом снимаем Modal.
    const finish = () => setPresented(false);
    backdropO.value = withTiming(0, { duration: reduceMotion ? INSTANT : KIT_MOTION.dimMs });
    slide.value = withTiming(1, { duration: reduceMotion ? INSTANT : KIT_MOTION.sheetMs, easing: SHEET_EASE }, (finished) => {
      if (finished) runOnJS(finish)();
    });
    return () => { cancelAnimation(slide); cancelAnimation(backdropO); };
  }, [visible, reduceMotion, backdropO, slide, drag]);

  const requestClose = useCallback(() => requestCloseRef.current(), []);

  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-32, 32])
    .onUpdate((e) => {
      'worklet';
      drag.value = e.translationY < 0 ? e.translationY * SHEET.dragResist : e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (drag.value > SHEET.dragClosePx || e.velocityY > SHEET.dragCloseVelocity) {
        runOnJS(requestClose)();
      } else {
        drag.value = withSpring(0, SHEET.dragReturn);
      }
    }), [drag, requestClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropO.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value * viewportHeight + drag.value }],
  }));

  if (!presented) return null;
  const maxHeight = Math.max(240, Math.min(viewportHeight * maxHeightRatio, viewportHeight - insets.top - 12));
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={requestClose}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} accessibilityRole="button" accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: glass.opaqueSheet,
              borderColor: glass.glassEdge, // guard-ok: 1 px кромка .sheet (исключение 2.0)
              maxHeight,
              height: fill ? maxHeight : undefined,
              paddingBottom: 40 + insets.bottom,
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View collapsable={false}>
              <View style={[styles.grab, { backgroundColor: glass.mutedText }]} />
              {header}
            </View>
          </GestureDetector>
          <View style={fill ? styles.bodyFill : styles.bodyFit}>{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: `rgba(0,0,0,${KIT_MOTION.dimOpacity})` },
  // `.sheet`: r28 сверху, поля 12/18/40, кромка 1 px без нижней.
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1, // guard-ok: 1 px кромка .sheet
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  // `.grab`: 44×5.
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  bodyFill: { flex: 1, minHeight: 0 },
  bodyFit: { flexShrink: 1, minHeight: 0 },
});
