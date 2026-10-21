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
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Explain, Lv2Option, lv2CardStyle, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { actionBoxShadow, plateBoxShadow } from "../../../components/v2/ShadowSurface";

import { useLearningV2CompactPractice, useLearningV2PracticeViewportHost } from "../../../components/learning-v2/LearningV2PracticeViewport";
import { useArenaSound } from "../../../hooks/use_arena_sound";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useLineScale, useScaledTextStyles } from "../../../hooks/useLineScale";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeSpeedMatchCopyV1 } from "./mode_copy_v1";
import { SPEED_MATCH_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";
import {
  createLearningV2SpeedMatchRoundStateV1,
  learningV2SpeedMatchCanPickV1,
  resolveLearningV2SpeedMatchMismatchExplanationV1,
  type LearningV2SpeedMatchMismatchExplanationV1,
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
  side,
  picked,
  verdict,
  reducedMotion,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly side: "left" | "right";
  readonly picked: boolean;
  readonly verdict: "none" | "ok" | "bad";
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  const compact = useLearningV2CompactPractice();
  const lh = useLineScale();
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
      // зачем (learning-v2.html `.mc.gone` .22, sm-1…3): найденная пара гаснет до тени — видно, что осталось,
      // и ясно, что плитки больше не нажимаются (раньше .62 и зелёная заливка, в макете зелёного нет).
      opacity.value = withTiming(0.22, {
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

  const right = side === "right";
  return (
    <Animated.View style={[styles.tileFrame, right ? styles.frameRight : styles.frameLeft, style]}>
      {/* зачем (эталон speed-match-long-pairs.html, вариант 2, владелец 21.10): слово — узкая колонка 36 %, перевод — широкая;
          длинный перевод переносится на 2–3 строки, а плитка слова в этом же ряду растягивается до той же высоты
          (ряды не разъезжаются). Слово по центру 16/700, перевод слева 16/600; плитки от 64 dp. */}
      <Lv2Option
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled || verdict === "ok"}
        onPress={onPress}
        selected={picked}
        showMark={false}
        style={[styles.card, compact && styles.cardCompact, right ? styles.cardRight : styles.cardLeft]}
        textStyle={[styles.cardText, right ? styles.cardTextRight : styles.cardTextLeft, { lineHeight: lh(21) }]}
        verdict={verdict === "bad" ? "bad" : "idle"}
        label={label}
      />
    </Animated.View>
  );
}

export function SpeedMatchModeV1(props: LearningV2ModeCommonPropsV1) {
  const compact = useLearningV2CompactPractice();
  const g = useLv2Glass();
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
  const [mismatchExplanation, setMismatchExplanation] = useState<LearningV2SpeedMatchMismatchExplanationV1 | null>(null);
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
    setMismatchExplanation(null);
  }, []);

  const showMismatch = useCallback(
    (leftPairId: string, rightPairId: string) => {
      if (mismatchResetRef.current) clearTimeout(mismatchResetRef.current);
      setWrongPairIds(new Set([leftPairId, rightPairId]));
      setMismatchExplanation(resolveLearningV2SpeedMatchMismatchExplanationV1({
        interfaceLocale,
        leftPairId,
        rightPairId,
        payload,
      }));
      playArenaSound("pairMiss");
      void hapticError();
      mismatchResetRef.current = setTimeout(() => {
        mismatchResetRef.current = null;
        setWrongPairIds(new Set());
        setMismatchExplanation(null);
        setPickedLeft(null);
        setPickedRight(null);
      }, MOTION.mismatchTintMs);
    },
    [interfaceLocale, payload, playArenaSound],
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
      showMismatch(pairId, pickedRight);
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
      showMismatch(pickedLeft, pairId);
    }
  };

  const sx = useScaledTextStyles(styles);
  return (
    // зачем (сверка с learning-v2.html sm, 05.10): заголовок 600, фраза 10, сетка пар 22 (gap 10), разбор 18;
    // таймер — пилюля .timer, на исходе краснеет только цифра и значок (`.timer.low` color), без красной заливки.
    <View style={sx.root}>
      <View style={sx.headerRow}>
        <Text style={[sx.taskLabel, { color: g.secondary }]}>{copy.title}</Text>
        {round.timerEnabled ? <View
          style={[
            sx.timerPill,
            { backgroundColor: g.opaqueControl },
          ]}
        >
          <Ionicons name="time-outline" size={16} color={timerLow ? g.bad : g.text} />
          <Text style={[sx.timerText, { color: timerLow ? g.bad : g.text }]}>
            {secondsLeft}{copy.secondsSuffix}
          </Text>
        </View> : null}
      </View>

      <Text style={[sx.hero, { color: g.text }, compact && { marginTop: 6 }]}>{prompt}</Text>

      <SpeedMatchGridV1>
        {payload.leftColumn.map((leftId, index) => {
          const leftPair = payload.pairGrid.find((entry) => entry.pairId === leftId);
          if (!leftPair) throw new Error(`learning_v2_speed_match_pair_missing:${leftId}`);
          const rightId = payload.rightColumn[index];
          const rightPair = rightId === undefined ? undefined : payload.pairGrid.find((entry) => entry.pairId === rightId);
          if (rightId !== undefined && !rightPair) throw new Error(`learning_v2_speed_match_pair_missing:${rightId}`);
          if (!rightPair) {
            // зачем (логи первым делом): колонки разной длины — ряд без перевода, а не немой пропуск
            // guard-ok: редкий сбой данных, причина обязана попасть в лог
            console.warn("[SPEED-MATCH] row without right tile", JSON.stringify({ index, leftId, left: payload.leftColumn.length, right: payload.rightColumn.length }));
          }
          const disabled = resolved || phase === "processing" || !canPick;
          const verdictOf = (pairId: string) => (matchedPairIds.has(pairId) ? "ok" : wrongPairIds.has(pairId) ? "bad" : "none");
          return (
            // зачем (эталон speed-match-long-pairs.html, вариант 2): одна строка = слово слева + перевод справа;
            // строка сама выравнивает высоту обеих плиток, поэтому длинный перевод не разводит колонки.
            <View key={`row-${leftPair.pairId}`} style={[styles.row, compact && { gap: 6 }]}>
              <SpeedMatchCardV1
                label={leftPair.target}
                side="left"
                picked={pickedLeft === leftPair.pairId}
                verdict={verdictOf(leftPair.pairId)}
                reducedMotion={reducedMotion}
                disabled={disabled}
                onPress={() => chooseLeft(leftPair.pairId)}
              />
              {rightPair ? (
                <SpeedMatchCardV1
                  label={rightPair.meaningByLocale[interfaceLocale]}
                  side="right"
                  picked={pickedRight === rightPair.pairId}
                  verdict={verdictOf(rightPair.pairId)}
                  reducedMotion={reducedMotion}
                  disabled={disabled}
                  onPress={() => chooseRight(rightPair.pairId)}
                />
              ) : null}
            </View>
          );
        })}
      </SpeedMatchGridV1>

      {mismatchExplanation ? (
        <View accessibilityLiveRegion="polite" style={sx.explainWrap}>
          <Lv2Explain>{`${mismatchExplanation.selectedTarget} + «${mismatchExplanation.selectedMeaning}»: ${mismatchExplanation.selectedTargetExplanation} ${mismatchExplanation.meaningOwnerExplanation}`}</Lv2Explain>
        </View>
      ) : null}

      {round.phase === "finish_timeout" && !resolved && (
        // зачем (learning-v2.html, sm «Время вышло»): карточка `.expl` в колонку — значок часов
        // и «Время вышло», под ней «Ещё раунд» (контур) и «Продолжить без таймера» (залитая).
        <View accessibilityLiveRegion="polite" style={[sx.timeoutCard, lv2CardStyle(g)]}>
          <View style={sx.timeoutHead}>
            <Ionicons name="time-outline" size={20} color={g.secondary} />
            <Text style={[sx.feedbackText, { color: g.text }]}>{copy.timeout}</Text>
          </View>
          <View style={sx.timeoutActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(true)}
              style={({ pressed }) => [
                sx.timeoutButton,
                { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g), opacity: pressed ? 0.72 : 1 }, // «Тень» 12.10: контурная кнопка стала плашкой с тенью
              ]}
            >
              <Text style={[sx.timeoutButtonText, { color: g.text }]}>
                {copy.again}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => restartRound(false)}
              style={({ pressed }) => [
                sx.timeoutButton,
                { backgroundColor: g.accent, boxShadow: actionBoxShadow(g), opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[sx.timeoutButtonText, { color: g.accentInk }]}>
                {copy.withoutTimer}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {explanation ? <View style={sx.explainWrap}><Lv2Explain>{explanation}</Lv2Explain></View> : null}
    </View>
  );
}

export default SpeedMatchModeV1;

function SpeedMatchGridV1({ children }: { children: React.ReactNode }): React.JSX.Element {
  const insidePractice = useLearningV2PracticeViewportHost();
  return insidePractice ? <View style={styles.grid}>{children}</View> : (
    <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // `.tlab` 15/600 --sec (D145 → 16).
  taskLabel: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  timerPill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerText: { fontSize: 16, lineHeight: 21, fontWeight: "700", fontVariant: ["tabular-nums"] },
  // `.thero` margin-top 10; `.grid2` margin-top 22.
  hero: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.3, marginTop: 10, marginBottom: 22 },
  gridScroll: { flexGrow: 0, maxHeight: 470 },
  // эталон speed-match-long-pairs.html (вариант 2): строки одна под другой, в строке слово 36 % + перевод на остаток, gap 10.
  grid: { flexDirection: "column", gap: 10, paddingBottom: 4 },
  row: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  tileFrame: { width: "100%" },
  frameLeft: { width: "36%" },
  frameRight: { flex: 1, minWidth: 0 },
  card: {
    width: "100%",
    flexGrow: 1,
    minHeight: 64,
    maxWidth: "100%",
  },
  cardCompact: { minHeight: 56 },
  // слово — по центру с полями 12; перевод — слева с полями 14, плитки в строке одной высоты
  cardLeft: { paddingHorizontal: 12 },
  cardRight: { alignItems: "flex-start", paddingHorizontal: 14 },
  cardText: { fontSize: 16, lineHeight: 21, fontWeight: "600" },
  cardTextLeft: { fontWeight: "700" },
  cardTextRight: { textAlign: "left" },
  // `.expl` margin-top 18, padding 14/16, в колонку через 14.
  timeoutCard: { paddingVertical: 14, paddingHorizontal: 16, gap: 14, marginTop: 18 },
  explainWrap: { marginTop: 18 },
  timeoutHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  feedbackText: { flex: 1, fontSize: 16, fontWeight: "700", lineHeight: 22 },
  timeoutActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeoutButton: {
    flex: 1,
    minWidth: 130,
    // `.cta.sm`: 42, r21, 16/600.
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timeoutButtonText: { fontSize: 16, lineHeight: 21, fontWeight: "600", textAlign: "center" },
});
