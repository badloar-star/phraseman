/** Owner-approved Pulse pre-session modal (12 September 2026). */
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useStableSafeAreaInsets } from "../app/stable_safe_area_metrics";
import { hapticTap } from "../hooks/use-haptics";
import { useReduceMotionPreference } from "../hooks/use_reduce_motion";
import { LEARNING_V2_OWNER_LAYOUT } from "./learning-v2/learningV2OwnerLayout";
import EnergyCostBadge from "./EnergyCostBadge";
import { useTheme } from "./ThemeContext";

export const LEARNING_V2_SESSION_MODAL_EXIT_MS = 180;

interface LearningV2SessionOutcomeSheetProps {
  visible: boolean;
  lessonOrdinal?: number;
  sessionOrdinal?: number;
  title: string;
  message: string;
  primaryLabel: string;
  actionsDisabled?: boolean;
  onPrimaryPress: () => void;
  secondaryLabel: string;
  onSecondaryPress: () => void;
  onClose: () => void;
  closeLabel?: string;
  sessionLabel?: string;
  chapterLabel?: string;
  durationLabel?: string;
  wordsLabel?: string;
  attemptsLabel?: string;
  onMounted?: () => void;
}

export default function LearningV2SessionOutcomeSheet({
  visible,
  sessionOrdinal = 1,
  title,
  message,
  primaryLabel,
  actionsDisabled = false,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onClose,
  closeLabel = "Закрыть",
  sessionLabel = "Сессия",
  chapterLabel = "Глава",
  durationLabel = "≈ 5 минут",
  wordsLabel = "4 новых слова",
  attemptsLabel = "3 попытки",
  onMounted,
}: LearningV2SessionOutcomeSheetProps) {
  const { theme: t, f } = useTheme();
  const layout = LEARNING_V2_OWNER_LAYOUT.modal;
  const reducedMotion = useReduceMotionPreference() !== false;
  const checkpoint = sessionOrdinal % 8 === 0;
  const chapterOrdinal = Math.ceil(sessionOrdinal / 8);
  const insets = useStableSafeAreaInsets();
  const backdropOpacity = useSharedValue(0);
  const cardProgress = useSharedValue(0);
  const sceneProgress = useSharedValue(0);
  const closingRef = useRef(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !mountedVisibleRef.current) onMounted?.();
    mountedVisibleRef.current = visible;
  }, [onMounted, visible]);

  useEffect(() => {
    cancelAnimation(backdropOpacity);
    cancelAnimation(cardProgress);
    cancelAnimation(sceneProgress);
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    closingRef.current = false;
    if (!visible) return;
    if (reducedMotion) {
      backdropOpacity.value = 1;
      cardProgress.value = 1;
      sceneProgress.value = 1;
      return;
    }
    sceneProgress.value = 0;
    backdropOpacity.value = withTiming(1, { duration: 180 });
    cardProgress.value = withTiming(1, {
      duration: 320,
      easing: REasing.bezier(0.22, 0.84, 0.24, 1),
    });
    sceneProgress.value = withDelay(90, withTiming(1, {
      duration: 360,
      easing: REasing.bezier(0.16, 1, 0.3, 1),
    }));
    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(cardProgress);
      cancelAnimation(sceneProgress);
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, [backdropOpacity, cardProgress, reducedMotion, sceneProgress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [
      { translateY: (1 - cardProgress.value) * 18 },
      { scale: 0.96 + cardProgress.value * 0.04 },
    ],
  }));
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneProgress.value,
    transform: [
      { translateY: (1 - sceneProgress.value) * 10 },
      { scale: 0.78 + sceneProgress.value * 0.22 },
    ],
  }));
  const detailsStyle = useAnimatedStyle(() => ({
    opacity: sceneProgress.value,
    transform: [{ translateY: (1 - sceneProgress.value) * 8 }],
  }));

  const leave = useCallback((afterLeave: () => void, immediate = false) => {
    if (closingRef.current) return;
    closingRef.current = true;
    hapticTap();
    if (reducedMotion) {
      afterLeave();
      return;
    }
    backdropOpacity.value = withTiming(0, { duration: 150 });
    cardProgress.value = withTiming(0, { duration: 170 });
    sceneProgress.value = withTiming(0, { duration: 120 });
    if (immediate) {
      afterLeave();
      return;
    }
    leaveTimerRef.current = setTimeout(() => {
      leaveTimerRef.current = null;
      afterLeave();
    }, LEARNING_V2_SESSION_MODAL_EXIT_MS);
  }, [backdropOpacity, cardProgress, reducedMotion, sceneProgress]);

  const dismiss = useCallback(() => {
    leave(onClose);
  }, [leave, onClose]);

  const start = useCallback(() => {
    if (actionsDisabled) return;
    leave(onPrimaryPress, true);
  }, [actionsDisabled, leave, onPrimaryPress]);

  const skipIntro = useCallback(() => {
    if (actionsDisabled) return;
    leave(onSecondaryPress, true);
  }, [actionsDisabled, leave, onSecondaryPress]);

  const stats = [
    { id: "duration", testID: "learning-v2-session-modal-duration", icon: "time-outline" as const, value: durationLabel },
    { id: "words", testID: "learning-v2-session-modal-words", icon: "book-outline" as const, value: wordsLabel },
    { id: "attempts", testID: "learning-v2-session-modal-attempts", icon: "heart-outline" as const, value: attemptsLabel },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        <View style={[styles.center, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.card,
              { borderRadius: layout.cardRadius, backgroundColor: t.bgCard, borderColor: t.border },
              cardStyle,
            ]}
          >
            <Pressable
              testID="learning-v2-session-modal-close"
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              onPress={dismiss}
              style={({ pressed }) => [styles.close, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.66 : 1 }]}
            >
              <Ionicons name="close" size={20} color={t.textPrimary} />
            </Pressable>

            <Animated.View style={[styles.scene, sceneStyle]}>
              <View style={[styles.orb, { width: layout.nodeSize, height: layout.nodeSize, borderRadius: layout.nodeSize / 2, backgroundColor: t.accent }]}>
                <Ionicons name={checkpoint ? "trophy" : "play"} size={36} color={t.correctText} />
              </View>
            </Animated.View>
            <Animated.View style={detailsStyle}>
              <Text testID="learning-v2-session-modal-kicker" style={[styles.kicker, { color: t.accent }]}>{sessionLabel.toUpperCase()} {sessionOrdinal} · {chapterLabel.toUpperCase()} {chapterOrdinal}</Text>
              <Text style={[styles.title, { color: t.textPrimary, fontSize: layout.headingSize, lineHeight: 31 }]}>{title}</Text>
              <Text style={[styles.message, { color: t.textMuted, fontSize: layout.bodySize, lineHeight: layout.bodySize * 1.45 }]}>{message}</Text>

              <View style={styles.stats}>
                {stats.map((stat) => (
                  <View key={stat.id} testID={stat.testID} style={[styles.stat, { backgroundColor: t.bgSurface2 }]}>
                    <Ionicons name={stat.icon} size={17} color={t.accent} />
                    <Text style={[styles.statText, { color: t.textPrimary }]}>{stat.value}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.divider, { backgroundColor: t.border }]} />

              <View style={styles.primaryWrap}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: actionsDisabled }}
                  disabled={actionsDisabled}
                  activeOpacity={0.8}
                  onPress={start}
                  style={[styles.primaryButton, { backgroundColor: t.accent, minHeight: layout.targetHeight, opacity: actionsDisabled ? 0.66 : 1 }]}
                >
                  <Text style={[styles.primaryLabel, { color: t.correctText, fontSize: f.body }]}>{primaryLabel}</Text>
                  <Ionicons name="arrow-forward" size={19} color={t.correctText} />
                </TouchableOpacity>
                <EnergyCostBadge activity="learning_v2_session" testID="learning-v2-session-energy-cost" />
              </View>
              <TouchableOpacity testID="learning-v2-session-skip-intro" accessibilityRole="button" accessibilityState={{ disabled: actionsDisabled }} disabled={actionsDisabled} onPress={skipIntro} style={[styles.secondaryButton, actionsDisabled && { opacity: 0.45 }]}>
                <Text style={[styles.secondaryLabel, { color: t.textMuted, fontSize: f.body }]}>{secondaryLabel}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.68)" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  card: { width: "100%", maxWidth: 390, borderWidth: 1, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16, overflow: "hidden" },
  close: { position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", zIndex: 3 },
  scene: { height: 112, alignItems: "center", justifyContent: "center" },
  orb: { alignItems: "center", justifyContent: "center" },
  kicker: { marginTop: 2, textAlign: "center", fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 9, textAlign: "center", fontWeight: "900", letterSpacing: -0.7 },
  message: { marginTop: 8, textAlign: "center", fontWeight: "400" },
  stats: { flexDirection: "row", gap: 7, marginTop: 18 },
  stat: { flex: 1, minHeight: 58, borderRadius: 16, paddingHorizontal: 6, paddingVertical: 9, alignItems: "center", justifyContent: "center", gap: 4 },
  statText: { fontSize: 10.5, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  primaryWrap: { position: "relative" },
  primaryButton: { minHeight: 54, borderRadius: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryLabel: { fontWeight: "900" },
  secondaryButton: { alignSelf: "center", minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center" },
  secondaryLabel: { fontWeight: "700" },
});
