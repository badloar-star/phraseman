/**
 * Активный режим 5/6 — Пары на скорость. Источник вёрстки/анимаций:
 * docs/v2/mockups/07-speed-match.html.
 *
 * зачем: форма (irregular verbs и т.п.) должна доводиться до автоматизма —
 * таймер плюс сетка карточек создают давление скорости, которого нет в
 * остальных режимах.
 *
 * Данные: modePayload несёт настоящую pairGrid и отдельно заданный порядок
 * правой колонки. Задание завершается только после сопоставления всех пар.
 *
 * ВАЖНО (Performance Bible / находка аудита): таймер — useSharedValue +
 * useFrameCallback, НЕ setInterval+setState. Обратный отсчёт целиком на
 * UI-треде; текстовое отображение секунд обновляется через scheduleOnRN с троттлом
 * раз в кадр-с-изменением-секунды, а не каждый кадр.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { V2Chip } from "../../../components/ui/v2_ui";

import { useTheme } from "../../../components/ThemeContext";
import { useTournamentPalette } from "../../../components/ui/v2_theme";
import { useArenaSound } from "../../../hooks/use_arena_sound";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeSpeedMatchCopyV1 } from "./mode_copy_v1";
import { SPEED_MATCH_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";
import {
  createLearningV2SpeedMatchRoundStateV1,
  learningV2SpeedMatchCanPickV1,
} from "./speed_match_runtime_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
/** Лимит раунда. Источник: 07-speed-match.html witness build использует
 * настраиваемый таймер; фиксируем разумный дефолт под один prompt вместо
 * полноценной сетки (см. комментарий "зачем" вверху файла). */
const ROUND_SECONDS = 60;

/** Таймер на UI-треде: useFrameCallback двигает shared value каждый кадр,
 * JS-состояние (для текста "N с") обновляется только когда изменилась целая
 * секунда — troттлинг вручную, чтобы не звать setState 60 раз в секунду. */
function useSpeedMatchTimerV1(
  active: boolean,
  resetToken: number,
  onExpire: () => void,
) {
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
    // зачем: троттлинг вручную — scheduleOnRN(setSecondsLeft) только когда целая
    // секунда реально изменилась, а не каждый кадр (иначе 60 setState/сек).
    if (nextSeconds !== prevSeconds) {
      scheduleOnRN(setSecondsLeft, nextSeconds);
    }
    if (next <= 0 && !expired.value) {
      expired.value = true;
      scheduleOnRN(onExpire);
    }
  }, active);

  useEffect(() => {
    startedAt.value = null;
    expired.value = false;
    remainingMs.value = ROUND_SECONDS * 1000;
    setSecondsLeft(ROUND_SECONDS);
  }, [resetToken, remainingMs, startedAt, expired]);

  return secondsLeft;
}

function SpeedMatchCardV1({
  label,
  picked,
  verdict,
  reducedMotion,
  disabled,
  onPress,
  textColor,
}: {
  readonly label: string;
  readonly side: "left" | "right";
  readonly picked: boolean;
  readonly verdict: "none" | "ok" | "bad";
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
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
      // Keep completed words visible as durable progress while making it clear
      // that these tiles are no longer interactive.
      opacity.value = withTiming(0.62, {
        duration: reducedMotion ? 1 : MOTION.matchFadeOutMs,
        easing: EASE,
      });
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
      <V2Chip
        accessibilityLabel={label}
        disabled={disabled || verdict === "ok"}
        onPress={onPress}
        selected={picked}
        singleLine
        style={styles.card}
        textStyle={[styles.cardText, { color: textColor }]}
        verdict={verdict === "ok" ? "ok" : verdict === "bad" ? "bad" : "idle"}
      >
        {label}
      </V2Chip>
    </Animated.View>
  );
}

export function SpeedMatchModeV1(props: LearningV2ModeCommonPropsV1) {
  const { theme: t } = useTheme();
  const palette = useTournamentPalette();
  const playArenaSound = useArenaSound();
  const {
    prompt,
    interfaceLocale,
    modePayload,
    reducedMotion,
    resolved,
    explanation,
    onModeNativeComplete,
    phase,
  } = props;

  if (!modePayload) {
    throw new Error("learning_v2_speed_match_payload_missing");
  }
  if (modePayload.family !== "speed_match") {
    throw new Error("learning_v2_speed_match_payload_mismatch");
  }
  const payload = modePayload;
  const copy = learningV2ModeSpeedMatchCopyV1(interfaceLocale);
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [pickedRight, setPickedRight] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [wrongPairIds, setWrongPairIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const mismatchResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
    },
    [],
  );

  const clearMismatch = useCallback(() => {
    if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
    mismatchResetRef.current = null;
    setWrongPairIds(new Set());
  }, []);

  const showMismatch = useCallback(
    (pairIds: readonly string[]) => {
      if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
      setWrongPairIds(new Set(pairIds));
      playArenaSound("pairMiss");
      void hapticError();
      mismatchResetRef.current = setTimeout(() => {
        mismatchResetRef.current = null;
        setWrongPairIds(new Set());
        setPickedLeft(null);
        setPickedRight(null);
      }, MOTION.mismatchTintMs);
    },
    [playArenaSound],
  );

  const [round, setRound] = useState(() => createLearningV2SpeedMatchRoundStateV1());
  const [timerResetToken, setTimerResetToken] = useState(0);
  const canPick = learningV2SpeedMatchCanPickV1(round);
  const active = !resolved && phase !== "success" && canPick && round.timerEnabled;
  const secondsLeft = useSpeedMatchTimerV1(active, timerResetToken, () => {
    setRound((current) => current.expire());
  });

  const restartRound = useCallback((timerEnabled: boolean) => {
    clearMismatch();
    setPickedLeft(null);
    setPickedRight(null);
    setMatchedPairIds(new Set());
    setWrongPairIds(new Set());
    setRound((current) => current.restart({ timerEnabled }));
    setTimerResetToken((value) => value + 1);
  }, [clearMismatch]);

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
  const chooseLeft = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    clearMismatch();
    setPickedLeft(pairId);
    if (!pickedRight) return;
    if (pickedRight === pairId) {
      const next = new Set(matchedPairIds).add(pairId);
      setMatchedPairIds(next);
      setPickedLeft(null);
      setPickedRight(null);
      playArenaSound("pairMatch");
      void hapticSuccess();
      if (next.size === payload.pairGrid.length) {
        onModeNativeComplete("all_pairs_matched");
      }
    } else {
      showMismatch([pairId, pickedRight]);
    }
  };
  const chooseRight = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return;
    clearMismatch();
    setPickedRight(pairId);
    if (!pickedLeft) return;
    if (pickedLeft === pairId) {
      const next = new Set(matchedPairIds).add(pairId);
      setMatchedPairIds(next);
      setPickedLeft(null);
      setPickedRight(null);
      playArenaSound("pairMatch");
      void hapticSuccess();
      if (next.size === payload.pairGrid.length) {
        onModeNativeComplete("all_pairs_matched");
      }
    } else {
      showMismatch([pickedLeft, pairId]);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={[styles.taskLabel, { color: palette.muted }]}>{copy.title}</Text>
        {round.timerEnabled ? <View
          style={[
            styles.timerPill,
            { backgroundColor: timerLow ? t.wrong + "22" : t.bgSurface2 },
          ]}
        >
          <Text style={[styles.timerText, { color: timerLow ? t.wrong : t.textMuted }]}>
            {secondsLeft}{copy.secondsSuffix}
          </Text>
        </View> : null}
      </View>

      <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>

      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          {payload.leftColumn.map((pairId) => {
            const pair = payload.pairGrid.find((entry) => entry.pairId === pairId);
            if (!pair) throw new Error(`learning_v2_speed_match_pair_missing:${pairId}`);
            return (
            <SpeedMatchCardV1
              key={`left-${pair.pairId}`}
              label={pair.target}
              side="left"
              picked={pickedLeft === pair.pairId}
              verdict={matchedPairIds.has(pair.pairId) ? "ok" : wrongPairIds.has(pair.pairId) ? "bad" : "none"}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing" || !canPick}
              onPress={() => chooseLeft(pair.pairId)}
              textColor={wrongPairIds.has(pair.pairId) ? t.wrong : t.accent}
            />
            );
          })}
        </View>
        <View style={styles.column}>
          {payload.rightColumn.map((pairId) => {
            const pair = payload.pairGrid.find((entry) => entry.pairId === pairId);
            if (!pair) throw new Error(`learning_v2_speed_match_pair_missing:${pairId}`);
            return (
              <SpeedMatchCardV1
                key={`right-${pair.pairId}`}
                label={pair.meaningByLocale[interfaceLocale]}
                side="right"
                picked={pickedRight === pair.pairId}
                verdict={matchedPairIds.has(pair.pairId) ? "ok" : wrongPairIds.has(pair.pairId) ? "bad" : "none"}
                reducedMotion={reducedMotion}
                disabled={resolved || phase === "processing" || !canPick}
                onPress={() => chooseRight(pair.pairId)}
                textColor={wrongPairIds.has(pair.pairId) ? t.wrong : t.textPrimary}
              />
            );
          })}
        </View>
      </ScrollView>

      {round.phase === "finish_timeout" && !resolved && (
        <View style={[styles.feedbackLane, { backgroundColor: t.wrong + "1A" }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>
            {copy.timeout}
          </Text>
          <View style={styles.timeoutActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(true)}
              style={({ pressed }) => [
                styles.timeoutButton,
                { backgroundColor: t.bgCard, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.timeoutButtonText, { color: t.textPrimary }]}>
                {copy.again}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(false)}
              style={({ pressed }) => [
                styles.timeoutButton,
                { backgroundColor: t.accent, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.timeoutButtonText, { color: t.correctText }]}>
                {copy.withoutTimer}
              </Text>
            </Pressable>
          </View>
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
  root: { flex: 1, gap: 14 },
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
  gridScroll: { flexGrow: 0, maxHeight: 470 },
  grid: { flexDirection: "row", gap: 10, paddingBottom: 4 },
  column: { flex: 1, gap: 10 },
  card: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { fontSize: 15.5, fontWeight: "900" },
  feedbackLane: { borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
  timeoutActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  timeoutButton: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  timeoutButtonText: { fontSize: 14, fontWeight: "800" },
});
