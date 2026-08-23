/**
 * LearningV2SessionOutcomeSheet — нижняя шторка «Что вы поймёте / Чему научитесь /
 * Что сможете делать» для карты курса Learning V2.
 *
 * зачем: владелец 2026-08-23 — раньше это был центральный ThemedChoiceModal
 * (fade по центру экрана), попросил переделать в анимированный bottom sheet,
 * выезжающий снизу. ThemedChoiceModal используется ещё в 6 местах проекта
 * (avatar_dna_studio, lesson_menu, DeleteAccountConfirmModal и т.д.) — трогать
 * общий компонент нельзя, поэтому это отдельная шторка по каркасу
 * ReferralSheetShell (тот же паттерн жестов: тяга вниз 1:1, вверх резина ×0.12,
 * закрытие по 88px / velocityY 900, JS-страховка от зависшего onClose).
 *
 * Токены темы; без обводок (тон); fontWeight только 400/700/900.
 */
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useStableSafeAreaInsets } from "../app/stable_safe_area_metrics";
import { normalizeSafeAreaBottomInset } from "../hooks/use-screen";
import { hapticTap } from "../hooks/use-haptics";
import { useTheme } from "./ThemeContext";
import TonalSurface from "./TonalSurface";

const SHEET_HIDDEN = 420;

interface LearningV2SessionOutcomeSheetProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel: string;
  onClose: () => void;
}

export default function LearningV2SessionOutcomeSheet({
  visible,
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onClose,
}: LearningV2SessionOutcomeSheetProps) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const handleCloseRef = useRef(onClose);
  handleCloseRef.current = onClose;
  const dismissFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
  }, []);

  const dismissSheet = useCallback(() => {
    hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    // зачем: Reanimated-колбэк приходит с finished=false при отмене — JS-страховка
    // закрывает всегда, иначе шторка «зависает открытой» невидимо (как в
    // ReferralSheetShell, инцидент владельца 2026-07-26).
    if (dismissFallbackRef.current) clearTimeout(dismissFallbackRef.current);
    dismissFallbackRef.current = setTimeout(() => {
      dismissFallbackRef.current = null;
      handleCloseRef.current();
    }, 320);
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
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
          "worklet";
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          "worklet";
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
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

  const handlePrimaryPress = useCallback(() => {
    hapticTap();
    // Один вызов закрытия: onPrimaryPress сам решает, что делать с visible
    // (обычно тут же переходит на экран сессии), onClose здесь не зовём —
    // иначе двойное закрытие гонится с навигацией.
    onPrimaryPress();
  }, [onPrimaryPress]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={secondaryLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <View style={styles.avoider} pointerEvents="box-none">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                { backgroundColor: t.bgCard, paddingBottom: 20 + bottomInset },
                sheetStyle,
              ]}
            >
              <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />
              <View style={styles.grabber} pointerEvents="none">
                <View style={[styles.grabberPill, { backgroundColor: t.border }]} />
              </View>

              <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
                {title}
              </Text>
              <Text style={[styles.message, { color: t.textMuted, fontSize: f.body, lineHeight: f.body * 1.5 }]}>
                {message}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handlePrimaryPress}
                style={[styles.primaryButton, { backgroundColor: t.accent }]}
              >
                <Text style={[styles.primaryLabel, { color: t.correctText, fontSize: f.body }]}>
                  {primaryLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={dismissSheet}
                style={styles.secondaryButton}
              >
                <Text style={[styles.secondaryLabel, { color: t.textMuted, fontSize: f.body }]}>
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  avoider: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 8,
    overflow: "hidden",
  },
  grabber: {
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 8,
  },
  grabberPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontWeight: "900",
    marginTop: 8,
  },
  message: {
    fontWeight: "400",
    marginTop: 8,
    marginBottom: 20,
    minHeight: 52,
  },
  primaryButton: {
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontWeight: "900",
  },
  secondaryButton: {
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryLabel: {
    fontWeight: "700",
  },
});
