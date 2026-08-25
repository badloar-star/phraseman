/**
 * Режим 6/7 — Пары на скорость. Источник вёрстки/анимаций:
 * docs/v2/mockups/07-speed-match.html.
 *
 * зачем: форма (irregular verbs и т.п.) должна доводиться до автоматизма —
 * таймер плюс сетка карточек создают давление скорости, которого нет в
 * остальных режимах.
 *
 * Данные: макет ожидает МАССИВ пар {en, ru} для полноценной сетки 2×N с
 * двумя независимо перемешанными колонками. Сегодняшний контент даёт ОДНУ
 * практику за раз (`prompt` + `responseOptions[]`, single_choice) — сетки
 * пар в схеме нет. Честная адаптация на этом контракте: единственная
 * "пара" — prompt слева, верный вариант нужно найти справа среди
 * responseOptions за отведённое время. Это меньше, чем полноценный
 * speed_match макета (много пар одновременно), но не выдумывает данные,
 * которых нет. Полноценная сетка — предмет этапа 3 (аудит контента):
 * нужен новый формат данных "массив пар на сессию" для этой family.
 *
 * ВАЖНО (Performance Bible / находка аудита): таймер — useSharedValue +
 * useFrameCallback, НЕ setInterval+setState. Обратный отсчёт целиком на
 * UI-треде; текстовое отображение секунд обновляется через runOnJS с троттлом
 * раз в кадр-с-изменением-секунды, а не каждый кадр.
 */

import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../../components/ThemeContext";
import { hapticError, hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { SPEED_MATCH_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
/** Лимит раунда. Источник: 07-speed-match.html witness build использует
 * настраиваемый таймер; фиксируем разумный дефолт под один prompt вместо
 * полноценной сетки (см. комментарий "зачем" вверху файла). */
const ROUND_SECONDS = 20;

/** Таймер на UI-треде: useFrameCallback двигает shared value каждый кадр,
 * JS-состояние (для текста "N с") обновляется только когда изменилась целая
 * секунда — troттлинг вручную, чтобы не звать setState 60 раз в секунду. */
function useSpeedMatchTimerV1(active: boolean, onExpire: () => void) {
  // зачем: worklet на UI-треде не может безопасно читать/писать обычный
  // useRef.current — нужны настоящие Reanimated shared values для
  // startedAt/expired, иначе значения не переживут переход JS↔UI-тред.
  const remainingMs = useSharedValue(ROUND_SECONDS * 1000);
  const startedAt = useSharedValue<number | null>(null);
  const expired = useSharedValue(false);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);

  useFrameCallback((frameInfo) => {
    "worklet";
    if (!active || expired.value) return;
    if (startedAt.value === null) {
      startedAt.value = frameInfo.timestamp;
    }
    const elapsed = frameInfo.timestamp - (startedAt.value ?? frameInfo.timestamp);
    const next = Math.max(0, ROUND_SECONDS * 1000 - elapsed);
    const prevSeconds = Math.ceil(remainingMs.value / 1000);
    remainingMs.value = next;
    const nextSeconds = Math.ceil(next / 1000);
    // зачем: троттлинг вручную — runOnJS(setSecondsLeft) только когда целая
    // секунда реально изменилась, а не каждый кадр (иначе 60 setState/сек).
    if (nextSeconds !== prevSeconds) {
      runOnJS(setSecondsLeft)(nextSeconds);
    }
    if (next <= 0 && !expired.value) {
      expired.value = true;
      runOnJS(onExpire)();
    }
  }, active);

  useEffect(() => {
    if (!active) {
      startedAt.value = null;
      expired.value = false;
      remainingMs.value = ROUND_SECONDS * 1000;
      setSecondsLeft(ROUND_SECONDS);
    }
  }, [active, remainingMs, startedAt, expired]);

  return secondsLeft;
}

function SpeedMatchCardV1({
  label,
  side,
  picked,
  verdict,
  reducedMotion,
  disabled,
  onPress,
  bg,
  pickedBg,
  textColor,
}: {
  readonly label: string;
  readonly side: "left" | "right";
  readonly picked: boolean;
  readonly verdict: "none" | "ok" | "bad" | "void";
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly bg: string;
  readonly pickedBg: string;
  readonly textColor: string;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (verdict === "ok") {
      scale.value = reducedMotion
        ? 1
        : withSequence(
            withTiming(1.06, { duration: MOTION.matchSquashMs * 0.5, easing: EASE }),
            withTiming(1, { duration: MOTION.matchSquashMs * 0.5, easing: EASE }),
          );
      opacity.value = withTiming(0, {
        duration: reducedMotion ? 1 : MOTION.matchFadeOutMs,
        easing: EASE,
      });
    } else if (verdict === "bad") {
      opacity.value = withSequence(
        withTiming(0.5, { duration: MOTION.mismatchTintMs / 2, easing: EASE }),
        withTiming(1, { duration: MOTION.mismatchTintMs / 2, easing: EASE }),
      );
    } else if (verdict === "void") {
      opacity.value = 0;
    } else {
      opacity.value = withTiming(1, { duration: 160, easing: EASE });
    }
  }, [verdict, reducedMotion, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: picked ? -3 : 0 }] as const,
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: picked, disabled }}
        disabled={disabled || verdict === "void"}
        onPressIn={() => void hapticLightImpact()}
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: picked ? pickedBg : bg },
        ]}
      >
        <Text style={[styles.cardText, { color: textColor }]} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function SpeedMatchModeV1(props: LearningV2ModeCommonPropsV1) {
  const { theme: t } = useTheme();
  const {
    prompt,
    options,
    selectedChoiceId,
    reducedMotion,
    resolved,
    explanation,
    onPick,
    phase,
  } = props;

  const [expired, setExpired] = useState(false);
  const active = !resolved && phase !== "success" && !expired;
  const secondsLeft = useSpeedMatchTimerV1(active, () => setExpired(true));

  const announcedRef = useRef(false);
  useEffect(() => {
    if (phase === "success" && !announcedRef.current) {
      announcedRef.current = true;
      void hapticSuccess();
      if (reducedMotion) AccessibilityInfo.announceForAccessibility?.(prompt);
    }
    if (phase === "needs_work") void hapticError();
    if (phase !== "success") announcedRef.current = false;
  }, [phase, reducedMotion, prompt]);

  const timerLow = secondsLeft <= 5;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={[styles.taskLabel, { color: t.textMuted }]}>Найди пару быстро</Text>
        <View
          style={[
            styles.timerPill,
            { backgroundColor: timerLow ? t.wrong + "22" : t.bgSurface2 },
          ]}
        >
          <Text style={[styles.timerText, { color: timerLow ? t.wrong : t.textMuted }]}>
            {secondsLeft}с
          </Text>
        </View>
      </View>

      <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>

      <View style={styles.grid}>
        {options.map((option) => {
          const picked = selectedChoiceId === option.responseId;
          const verdict: "none" | "ok" | "bad" | "void" =
            phase === "success" && picked
              ? "ok"
              : phase === "needs_work" && picked
                ? "bad"
                : "none";
          return (
            <SpeedMatchCardV1
              key={option.responseId}
              label={option.text}
              side="right"
              picked={picked}
              verdict={verdict}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing" || expired}
              onPress={() => onPick(option.responseId)}
              bg={t.bgCard}
              pickedBg={t.accentBg}
              textColor={
                verdict === "ok"
                  ? t.correctText
                  : verdict === "bad"
                    ? t.wrong
                    : t.textPrimary
              }
            />
          );
        })}
      </View>

      {expired && !resolved && (
        <View style={[styles.feedbackLane, { backgroundColor: t.wrong + "1A" }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>
            Время вышло — выбери вариант, чтобы продолжить.
          </Text>
        </View>
      )}
      {explanation && (
        <View style={[styles.feedbackLane, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

export default SpeedMatchModeV1;

const styles = StyleSheet.create({
  root: { gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taskLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  timerPill: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  timerText: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  hero: { fontSize: 22, lineHeight: 28, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: "45%",
    flexGrow: 1,
  },
  cardText: { fontSize: 15.5, fontWeight: "700" },
  feedbackLane: { borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
