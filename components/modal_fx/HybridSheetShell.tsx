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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { NATIVE_MODAL_DISMISS_GAP_MS } from '../../app/safe_modal_navigation';
import { hapticTap } from '../../hooks/use-haptics';
import { LUM, SHEET } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useKeyboardBottomInset } from '../keyboardAvoidance';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import TonalSurface from '../TonalSurface';
import {
  createNativeModalDismissState,
  reduceNativeModalDismiss,
  type NativeModalDismissEvent,
} from './native_modal_dismiss_coordinator';
import { DebugLogger } from '../../app/debug-logger';

const SHEET_HIDDEN = 320;

interface HybridSheetShellProps {
  visible: boolean;
  /** Вызывается ровно один раз, когда шторка закрывается (крест/фон/свайп/системная «назад»). */
  onClose: () => void;
  /** Fires after the native Modal is actually gone; unlike onClose, safe for another modal/navigation. */
  onDismissed?: () => void;
  /** Fires synchronously, exactly once, when any shell-owned dismiss path begins. */
  onDismissRequested?: () => void;
  /** Ярлык для скринридера на зоне фона (обычно = подпись кнопки закрытия). */
  closeLabel: string;
  /** Blocks backdrop/back/accessibility/gesture dismissal during an atomic flow. */
  dismissDisabled?: boolean;
  /** Backdrop remains tappable, but can be hidden from screen readers when a visible close CTA exists. */
  backdropAccessible?: boolean;
  testID?: string;
  /** Свечение сверху шита (паттерн AiConsentSheetModal/MistakeEli5Modal/ExplainSheet). */
  glowColor?: string;
  /** Optional fixed outer sheet height; padding/safe-area/keyboard inset stay inside this box. */
  sheetHeight?: DimensionValue;
  children: React.ReactNode | ((controls: { requestDismiss: () => void }) => React.ReactNode);
}

export default function HybridSheetShell({
  visible,
  onClose,
  onDismissed,
  onDismissRequested,
  closeLabel,
  dismissDisabled = false,
  backdropAccessible = true,
  testID,
  glowColor,
  sheetHeight,
  children,
}: HybridSheetShellProps) {
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const keyboardBottomInset = useKeyboardBottomInset(visible);
  const reduceMotion = useReduceMotion();

  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  const dismissalEnabled = Boolean(onDismissed);
  const dismissalEnabledRef = useRef(dismissalEnabled);
  dismissalEnabledRef.current = dismissalEnabled;
  const previousDismissalEnabledRef = useRef(dismissalEnabled);
  const coordinatorRef = useRef(createNativeModalDismissState(visible));
  const dispatchNativeDismissRef = useRef<(event: NativeModalDismissEvent) => void>(() => {});
  const [nativePresentation, setNativePresentation] = useState(() => ({
    visible,
    token: coordinatorRef.current.token,
  }));
  const nativeDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDismissInteractionRef = useRef<{ cancel?: () => void } | null>(null);
  const cancelNativeDismissFallback = useCallback(() => {
    if (nativeDismissTimeoutRef.current) {
      clearTimeout(nativeDismissTimeoutRef.current);
      nativeDismissTimeoutRef.current = null;
    }
    nativeDismissInteractionRef.current?.cancel?.();
    nativeDismissInteractionRef.current = null;
  }, []);
  const dispatchNativeDismiss = useCallback((event: NativeModalDismissEvent) => {
    const transition = reduceNativeModalDismiss(
      coordinatorRef.current,
      event,
      Platform.OS === 'ios' ? 'ios' : 'android',
    );
    coordinatorRef.current = transition.state;
    for (const command of transition.commands) {
      if (command.type === 'set-native-visible') {
        setNativePresentation({ visible: command.visible, token: transition.state.token });
      } else if (command.type === 'cancel-android-barrier') {
        cancelNativeDismissFallback();
      } else if (command.type === 'schedule-android-barrier') {
        cancelNativeDismissFallback();
        nativeDismissInteractionRef.current = InteractionManager.runAfterInteractions(() => {
          nativeDismissTimeoutRef.current = setTimeout(
            () => dispatchNativeDismissRef.current({ type: 'android-barrier-elapsed', token: command.token }),
            NATIVE_MODAL_DISMISS_GAP_MS,
          );
        });
      } else if (command.type === 'notify-dismissed') {
        onDismissedRef.current?.();
      }
    }
  }, [cancelNativeDismissFallback]);
  dispatchNativeDismissRef.current = dispatchNativeDismiss;
  const handleNativeDismiss = useCallback((token: number) => {
    dispatchNativeDismiss({ type: 'native-dismissed', token });
  }, [dispatchNativeDismiss]);

  useEffect(() => {
    const wasEnabled = previousDismissalEnabledRef.current;
    previousDismissalEnabledRef.current = dismissalEnabled;

    if (!dismissalEnabled) {
      if (wasEnabled) {
        dispatchNativeDismiss({ type: 'dispose' });
        coordinatorRef.current = createNativeModalDismissState(visible);
      }
      setNativePresentation(current => current.visible === visible ? current : { visible, token: current.token });
      return;
    }

    // React StrictMode replays effect cleanup/setup without unmounting state.
    // Recreate the coordinator after that synthetic dispose so visibility events
    // continue to drive the same mounted sheet.
    if (coordinatorRef.current.disposed) {
      coordinatorRef.current = createNativeModalDismissState(visible);
      setNativePresentation({ visible, token: coordinatorRef.current.token });
      return;
    }

    if (!wasEnabled) {
      cancelNativeDismissFallback();
      coordinatorRef.current = createNativeModalDismissState(visible);
      setNativePresentation({ visible, token: coordinatorRef.current.token });
      return;
    }

    dispatchNativeDismiss({ type: 'sync-visible', visible });
  }, [cancelNativeDismissFallback, dismissalEnabled, dispatchNativeDismiss, visible]);

  useEffect(() => () => {
    if (dismissalEnabledRef.current) dispatchNativeDismiss({ type: 'dispose' });
  }, [dispatchNativeDismiss]);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      backdropO.value = 0;
      sheetY.value = SHEET_HIDDEN;
      sheetOpacity.value = 0;
      dragTranslateY.value = 0;
      return;
    }
    if (reduceMotion) {
      dragTranslateY.value = 0;
      backdropO.value = 1;
      sheetY.value = 0;
      sheetOpacity.value = 1;
      return;
    }
    // Вход «из света»: подложка расцветает, лист поднимается БЕЗ отскока
    // (settle 150/22 — закон базы Световода, не пружина-перелёт старой версии).
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: LUM.backdropMs, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: LUM.resolveMs });
    sheetY.value = withSpring(0, LUM.settle);
    // зачем: аудит 2026-08-17 — единственный вход без очистки среди гибридов.
    // Если шторку закрыть в середине появления (быстрый жест, переход экрана),
    // пружина продолжала считаться на UI-потоке уже без потребителя.
    return () => {
      cancelAnimation(backdropO);
      cancelAnimation(sheetY);
      cancelAnimation(sheetOpacity);
    };
  }, [visible, reduceMotion, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissCompletedRef = useRef(false);
  const dismissRequestedRef = useRef(false);
  const completeDismiss = useCallback(() => {
    if (dismissCompletedRef.current) return;
    dismissCompletedRef.current = true;
    if (dismissFallbackRef.current) {
      clearTimeout(dismissFallbackRef.current);
      dismissFallbackRef.current = null;
    }
    handleCloseRef.current();
  }, []);
  useEffect(() => {
    if (visible) {
      dismissCompletedRef.current = false;
      dismissRequestedRef.current = false;
      return;
    }
    // Parent-driven hide invalidates every in-flight exit completion. Without
    // this, a fallback/worklet callback could call onClose again after hide.
    dismissCompletedRef.current = true;
    if (dismissFallbackRef.current) {
      clearTimeout(dismissFallbackRef.current);
      dismissFallbackRef.current = null;
    }
  }, [visible]);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    if (dismissDisabled) return;
    if (dismissRequestedRef.current || dismissCompletedRef.current) return;
    dismissRequestedRef.current = true;
    try {
      onDismissRequested?.();
    } catch (e) {
      // Observers may tear down presentation state, but cannot strand the shell mid-dismiss.
      DebugLogger.error('HybridSheetShell:dismissSheet', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    hapticTap();
    if (reduceMotion) {
      completeDismiss();
      return;
    }
    backdropO.value = withTiming(0, { duration: LUM.exitMs });
    sheetOpacity.value = withTiming(0, { duration: LUM.exitMs });
    // зачем: страховка на случай finished=false (жест/отмена) — колбэк
    // Reanimated не всегда долетает, шит не должен «зависать открытым».
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(completeDismiss, LUM.exitMs + 80);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: LUM.exitMs, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(completeDismiss)();
    });
  }, [backdropO, completeDismiss, dismissDisabled, onDismissRequested, reduceMotion, sheetOpacity, sheetY]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!dismissDisabled)
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
            runOnJS(dismissSheet)();
          } else {
            dragTranslateY.value = reduceMotion ? 0 : withSpring(0, SHEET.dragReturn);
          }
        }),
    [dismissDisabled, dismissSheet, dragTranslateY, reduceMotion],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  return (
    <Modal key={nativePresentation.token} visible={onDismissed ? nativePresentation.visible : visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet} onDismiss={() => handleNativeDismiss(nativePresentation.token)}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissSheet}
          accessible={backdropAccessible}
          accessibilityRole={backdropAccessible ? 'button' : undefined}
          accessibilityLabel={backdropAccessible ? closeLabel : undefined}
          accessibilityState={backdropAccessible ? { disabled: dismissDisabled } : undefined}
          importantForAccessibility={backdropAccessible ? 'auto' : 'no-hide-descendants'}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <View style={styles.avoider} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              testID={testID}
              accessibilityViewIsModal
              onAccessibilityEscape={dismissSheet}
              importantForAccessibility="yes"
              style={[
                styles.sheet,
                {
                  backgroundColor: t.bgCard,
                  shadowColor: glowColor || t.accent,
                  paddingBottom: 20 + Math.max(bottomInset, keyboardBottomInset),
                  height: sheetHeight,
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
              {visible
                ? (typeof children === 'function'
                  ? children({ requestDismiss: dismissSheet })
                  : children)
                : null}
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
