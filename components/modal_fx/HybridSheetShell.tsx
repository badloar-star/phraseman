/**
 * HybridSheetShell — общий каркас гибридной шторки «Согласия и объяснения».
 *
 * зачем: владелец (2026-08-15) утвердил гибрид «Световод + Чекан»: шит семьи
 * «Согласия и объяснения» (AiConsentSheetModal/NotificationPermissionModal/
 * MistakeEli5Modal/ExplainSheet) поднимается ИЗ СВЕТА без отскока (закон
 * «база Световод без отскока», settle 150/22) вместо старого пружинного
 * translateY со spring MOTION_SPRING_LEGACY. Источник цифр — constants/motionHybrid.ts
 * (LUM), макет-эталон — сцена M2 «Шторка (bottom sheet)» в
 * .motion-mockups/phraseman-hybrid.html. Drag-to-dismiss — БЕЗ изменений,
 * паттерн components/referral_sheet_shell.tsx (тяга вниз 1:1, вверх резина
 * ×0.12, закрытие 88px/velocityY 900).
 *
 * Один каркас — пять потребителей содержимого (children каскадом по LUM.ladder
 * сами решают, что показывать). Токены темы; fontWeight только 400/700; без
 * обводок (тон, TonalSurface).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { hapticTap } from '../../hooks/use-haptics';
import { LUM } from '../../constants/motionHybrid';
import { useKeyboardBottomInset } from '../keyboardAvoidance';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import TonalSurface from '../TonalSurface';

const SHEET_HIDDEN = 320;

interface HybridSheetShellProps {
  visible: boolean;
  /** Вызывается ровно один раз, когда шторка закрывается (крест/фон/свайп/системная «назад»). */
  onClose: () => void;
  /** Ярлык для скринридера на зоне фона (обычно = подпись кнопки закрытия). */
  closeLabel: string;
  testID?: string;
  /** Свечение сверху шита (паттерн AiConsentSheetModal/MistakeEli5Modal/ExplainSheet). */
  glowColor?: string;
  children: React.ReactNode;
}

export default function HybridSheetShell({
  visible,
  onClose,
  closeLabel,
  testID,
  glowColor,
  children,
}: HybridSheetShellProps) {
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();
  const keyboardBottomInset = useKeyboardBottomInset(visible);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // Вход «из света»: подложка расцветает, лист поднимается БЕЗ отскока
    // (settle 150/22 — закон базы Световода, не пружина-перелёт старой версии).
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 240, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: LUM.resolveMs });
    sheetY.value = withSpring(0, LUM.settle);
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: LUM.exitMs });
    sheetOpacity.value = withTiming(0, { duration: LUM.exitMs });
    // зачем: страховка на случай finished=false (жест/отмена) — колбэк
    // Reanimated не всегда долетает, шит не должен «зависать открытым».
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, LUM.exitMs + 80);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: LUM.exitMs, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(handleCloseRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

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
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: LUM.exitMs }, (finished) => {
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
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

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
                {
                  backgroundColor: t.bgCard,
                  shadowColor: glowColor || t.accent,
                  paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset),
                },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <LinearGradient
                colors={[`${glowColor || t.accent}1F`, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }}
                style={styles.sheetGlow}
                pointerEvents="none"
              />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  avoider: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    overflow: 'hidden',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  sheetGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  grabber: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 2,
  },
  grabberPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
});
