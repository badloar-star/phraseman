/** Owner-approved Pulse pre-session modal (12 September 2026). */
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useStableSafeAreaInsets } from "../app/stable_safe_area_metrics";
import { hapticTap } from "../hooks/use-haptics";
import { useReduceMotionPreference } from "../hooks/use_reduce_motion";
import { LEARNING_V2_OWNER_LAYOUT } from "./learning-v2/learningV2OwnerLayout";
import { useLv2Glass } from "./learning-v2/LearningV2Glass";
import { KitGlassLayer } from "./v2/KitLiquidGlass";
import { ThemeAccentFill } from "./v2/ThemeAccentFill";
import { useLineScale, useScaledTextStyles } from '../hooks/useLineScale';
import { KIT_MOTION } from "../constants/motionHybrid";
import PressableHybrid from "./PressableHybrid";

// зачем (координатор 05.10, kit.css:147 `.dim`): окно .cm в макете статичное и живёт на затемнении —
// оно появляется и уходит вместе с ним: opacity 260 мс (CSS `ease`) в обе стороны, без своих сдвигов и пружин.
export const LEARNING_V2_SESSION_MODAL_EXIT_MS = KIT_MOTION.dimMs;
const DIM_EASE = REasing.bezier(0.25, 0.1, 0.25, 1);

interface LearningV2SessionOutcomeSheetProps {
  visible: boolean;
  lessonOrdinal?: number;
  sessionOrdinal?: number;
  title: string;
  message: string;
  primaryLabel: string;
  actionsDisabled?: boolean;
  onPrimaryPress: () => void;
  /** learning-v2.html startModal: у пройденного/проверки/закрытого `sec: null` — второй кнопки нет, на её месте отступ 14. */
  secondaryLabel: string | null;
  onSecondaryPress: () => void;
  onClose: () => void;
  closeLabel?: string;
  sessionLabel?: string;
  chapterLabel?: string;
  durationLabel?: string;
  wordsLabel?: string;
  attemptsLabel?: string;
  onMounted?: () => void;
  /**
   * зачем (learning-v2.html, «Закрытое занятие» / «Занятие Plus»): тёмная шайба с замком вместо
   * белой с «play». Чисто вид; сам путь открытия закрытых занятий (тост-отказ) не менялся.
   */
  locked?: boolean;
  /**
   * зачем (learning-v2.html 2.2 «Пройденное — Повторить», координатор 05.10): строка «★★☆ Лучший результат».
   * Показывается ТОЛЬКО при значении 0–3; нет значения — строки нет. Данные подключает Ядро.
   */
  bestStars?: 0 | 1 | 2 | 3;
  bestStarsLabel?: string;
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
  closeLabel = "Закрыть", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  sessionLabel = "Сессия", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  chapterLabel = "Глава", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  durationLabel = "≈ 5 минут", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  wordsLabel = "4 новых слова", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  attemptsLabel = "3 попытки", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
  onMounted,
  locked = false,
  bestStars,
  bestStarsLabel = "Лучший результат", // i18n-ok: значение по умолчанию; экран уроков передаёт перевод на 9 языков (lessons.tsx)
}: LearningV2SessionOutcomeSheetProps) {
  const sx = useScaledTextStyles(styles);
  const lh = useLineScale();
  // зачем (learning-v2.html, startModal): окно занятия — на токенах Liquid Glass активной темы.
  const g = useLv2Glass();
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
    const dimIn = { duration: KIT_MOTION.dimMs, easing: DIM_EASE };
    backdropOpacity.value = withTiming(1, dimIn);
    cardProgress.value = withTiming(1, dimIn);
    sceneProgress.value = withTiming(1, dimIn);
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
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardProgress.value }));
  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneProgress.value }));
  const detailsStyle = useAnimatedStyle(() => ({ opacity: sceneProgress.value }));

  const leave = useCallback((afterLeave: () => void, immediate = false) => {
    if (closingRef.current) return;
    closingRef.current = true;
    hapticTap();
    if (reducedMotion) {
      afterLeave();
      return;
    }
    const dimOut = { duration: KIT_MOTION.dimMs, easing: DIM_EASE };
    backdropOpacity.value = withTiming(0, dimOut);
    cardProgress.value = withTiming(0, dimOut);
    sceneProgress.value = withTiming(0, dimOut);
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
      <View style={sx.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        >
          <Animated.View style={[sx.backdrop, backdropStyle]} />
        </Pressable>
        <View style={[sx.center, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              sx.card,
              { borderRadius: 22, backgroundColor: g.opaqueSheet, borderColor: g.glassEdge }, // guard-ok: 1 px кромка макета
              cardStyle,
            ]}
          >
            {/* зачем (kit.css `.modal::after`): окно — стекло с бликом и светлой кромкой сверху, не плоская заливка. */}
            <KitGlassLayer radius={22} />
            {/* зачем (kit.css:64–65 `.t.down`): ✕ вжимается до .97 общим нажатием, а не гаснет; хаптик даёт leave(). */}
            <PressableHybrid
              testID="learning-v2-session-modal-close"
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              hitSlop={8}
              onPress={dismiss}
              variant="icon"
              pressScaleTo={KIT_MOTION.pressScale}
              withHaptic={false}
              withSound={false}
              style={sx.closeHit}
              contentStyle={[sx.close, { borderColor: g.glassEdge }]}
            >
              <Ionicons name="close" size={18} color={g.text} />
            </PressableHybrid>

            <Animated.View style={[sx.scene, sceneStyle]}>
              <View style={[sx.orbPlate, { width: layout.nodeSize, height: layout.nodeSize, borderRadius: layout.nodeSize / 2, backgroundColor: locked ? g.opaqueControl : g.cta }]}>
                <View style={sx.orbPlateShade} />
              </View>
              {/* зачем (Сверка ib_light_sheet, 18.10): круг залит g.text, значок — цветом листа (g.opaqueSheet) = инверсия круга; прежний g.ctaInk в светлых темах почти сливался с кругом */}
              <View style={[sx.orb, { width: layout.nodeSize, height: layout.nodeSize, borderRadius: layout.nodeSize / 2, backgroundColor: locked ? g.opaqueControl : g.text }]}>
                <Ionicons name={locked ? "lock-closed" : checkpoint ? "trophy" : "play"} size={38} color={locked ? g.secondary : g.opaqueSheet} />
              </View>
            </Animated.View>
            <Animated.View style={detailsStyle}>
              <Text testID="learning-v2-session-modal-kicker" style={[sx.kicker, { color: g.secondary }]}>{sessionLabel.toUpperCase()} {sessionOrdinal} · {chapterLabel.toUpperCase()} {chapterOrdinal}</Text>
              <Text style={[sx.title, { color: g.text, fontSize: layout.headingSize, lineHeight: lh(31) }]}>{title}</Text>
              {/* зачем (сверка с learning-v2.html, 04.10): цель занятия приходит из текста курса с разметкой `код` —
                  человеку показывались сами обратные кавычки («`I am + слово о себе`»). Показываем текст без разметки. */}
              <Text style={[sx.message, { color: g.secondary, fontSize: 16, lineHeight: lh(22) }]}>{message.replace(/`/g, '')}</Text>
              {bestStars !== undefined ? (
                // `.flex` center gap 8, margin-top 16: звёзды s24 (погашенные #3A3A3E), подпись 15/600 --sec, отступ 6.
                <View testID="learning-v2-session-modal-best-stars" accessible accessibilityLabel={`${bestStarsLabel}: ${bestStars}/3`} style={sx.bestRow}>
                  {[1, 2, 3].map((i) => (
                    <Ionicons key={i} name="star" size={24} color={g.text} style={i <= bestStars ? null : sx.starOff} />
                  ))}
                  <Text style={[sx.bestLabel, { color: g.secondary }]}>{bestStarsLabel}</Text>
                </View>
              ) : null}

              {/* зачем (learning-v2.html 2.4/2.5 `noFacts: true`, learning-v2-013): у закрытого занятия фактов о занятии нет. */}
              {locked ? null : <View style={sx.stats}>
                {stats.map((stat) => (
                  <View key={stat.id} testID={stat.testID} style={[sx.stat, { backgroundColor: g.opaqueControl }]}>
                    {/* зачем (сверка 010, learning-v2.html `.facts > div::after`): каждый факт — отдельная стеклянная плитка с бликом и кромкой (--lg-sheen/--lg-rim). */}
                    <KitGlassLayer radius={16} />
                    <Ionicons name={stat.icon} size={18} color={g.secondary} />
                    <Text style={[sx.statText, { color: g.text }]}>{stat.value}</Text>
                  </View>
                ))}
              </View>}
              <View style={[sx.divider, { backgroundColor: g.line }]} />

              <View style={sx.primaryWrap}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: actionsDisabled }}
                  disabled={actionsDisabled}
                  activeOpacity={0.8}
                  onPress={start}
                  style={[sx.primaryButton, { backgroundColor: g.accent, minHeight: layout.targetHeight, opacity: actionsDisabled ? 0.66 : 1 }]}
                >
                  {/* зачем (сверка learning-v2-010, 05.10): глянец .cta макета / фактура темы — общий слой, как у всех главных кнопок. */}
                  <ThemeAccentFill glass={g} radius={20} />
                  <Text style={[sx.primaryLabel, { color: g.accentInk, fontSize: 16 }]}>{primaryLabel}</Text>
                  {/* зачем (`.cta .ar` right 22): стрелка прижата к правому краю кнопки, подпись по центру. */}
                  <Ionicons name="arrow-forward" size={20} color={g.accentInk} style={sx.primaryArrow} />
                </TouchableOpacity>
              </View>
              {secondaryLabel ? (
                <TouchableOpacity testID="learning-v2-session-skip-intro" accessibilityRole="button" accessibilityState={{ disabled: actionsDisabled }} disabled={actionsDisabled} onPress={skipIntro} style={[sx.secondaryButton, actionsDisabled && { opacity: 0.45 }]}>
                  <Text style={[sx.secondaryLabel, { color: g.secondary, fontSize: 16 }]}>{secondaryLabel}</Text>
                </TouchableOpacity>
              ) : (
                <View testID="learning-v2-session-no-secondary" style={{ height: 14 }} />
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.68)" }, // theme-exempt: затемнение под окном и площадки — чёрные в любой теме
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  card: { width: "100%", maxWidth: 390, borderWidth: 1, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16, overflow: "hidden" },
  // зачем (learning-v2.html `.cm .x` = `.rb.sq`): крестик 36, r12, без заливки, тонкая кромка, 14 от краёв; область нажатия добирает hitSlop.
  closeHit: { position: "absolute", top: 14, right: 14, width: 36, height: 36, alignSelf: "auto", zIndex: 3 },
  close: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  // зачем (`.orb` margin-top 6, тень 0 7px 0; `.ck` margin-top 22): шайба сверху сцены, цоколь на 7 ниже, подпись в 22 от шайбы.
  scene: { height: 98, paddingTop: 6, alignItems: "center", justifyContent: "flex-start" },
  orb: { alignItems: "center", justifyContent: "center" },
  // «цоколь» шайбы (0 7px 0 в макете): та же площадка, смещённая вниз и затемнённая
  orbPlate: { position: "absolute", top: 13, overflow: "hidden" },
  orbPlateShade: { flex: 1, backgroundColor: "rgba(0,0,0,0.32)" }, // theme-exempt: затемнение под окном и площадки — чёрные в любой теме
  kicker: { marginTop: 22, textAlign: "center", fontSize: 13, lineHeight: 18, fontWeight: "800", letterSpacing: 1.6 },
  title: { marginTop: 9, textAlign: "center", fontWeight: "800", letterSpacing: -0.6 },
  message: { marginTop: 8, textAlign: "center", fontWeight: "400" },
  bestRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  starOff: { opacity: 0.2 },
  bestLabel: { marginLeft: 6, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  stats: { flexDirection: "row", gap: 7, marginTop: 18 },
  stat: { flex: 1, minHeight: 58, borderRadius: 16, overflow: "hidden", paddingHorizontal: 6, paddingVertical: 9, alignItems: "center", justifyContent: "center", gap: 5 },
  statText: { fontSize: 13, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  primaryWrap: { position: "relative" },
  // зачем (`.cm .cta` height 54, r20): в окне занятия кнопка со скруглением 20, а не капсула.
  primaryButton: { minHeight: 54, borderRadius: 20, paddingHorizontal: 48, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  primaryArrow: { position: "absolute", right: 22 },
  primaryLabel: { fontWeight: "700" },
  secondaryButton: { alignSelf: "center", minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, justifyContent: "center" },
  secondaryLabel: { fontWeight: "600" },
});
