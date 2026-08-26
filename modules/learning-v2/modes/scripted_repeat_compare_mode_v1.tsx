/**
 * Активный режим 6/6 — Повтор за моделью. Источник вёрстки/анимаций:
 * docs/v2/mockups/14-repeat-compare.html.
 *
 * зачем: голосовые повторы нуждаются в capture-зоне (готов/запись/обработка)
 * и волне word-chip'ов вместо текстовой карточки ordered_tokens/single_choice.
 *
 * Реальный voice-flow — hold-to-talk в центральном футере плеера. Capture-зона
 * только показывает готовность, запись и распознанный результат; второй
 * конкурирующей mic-кнопки внутри карточки нет.
 *
 * Данные: голосовой вердикт (PASS_CONFIDENT/NEEDS_WORK_CONFIDENT/UNCERTAIN/
 * INVALID из макета) сегодня не приходит отдельным полем — evaluate()
 * получает transcript и возвращает бинарный correct/wrong через тот же
 * V2LocalEvaluatorResponseV1, что и текстовые режимы. Четырёхветочный вердикт
 * макета — предмет этапа 3 (аудит контента/эволюции evaluator'а), здесь
 * рендерится честный бинарный расклад на реальном контракте.
 */

import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../../components/ThemeContext";
import { V2Card } from "../../../components/ui/v2_ui";
import { useTournamentPalette } from "../../../components/ui/v2_theme";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import type { LearningV2LocalHoldToTalkStatusV1 } from "../../../hooks/use_learning_v2_local_hold_to_talk_v1";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeRepeatCompareCopyV1 } from "./mode_copy_v1";
import { SCRIPTED_REPEAT_COMPARE_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Пропсы этого режима шире общего контракта — voice-состояние не нужно
 * остальным 6 режимам, поэтому не раздувает mode_contract_v1. */
export interface ScriptedRepeatCompareModePropsV1 extends LearningV2ModeCommonPropsV1 {
  readonly voiceStatus: LearningV2LocalHoldToTalkStatusV1;
  readonly transcript: string;
  readonly instruction: string | null;
  /** Canonical app SpeakingPanel. The mode owns the lesson framing while the
   * shared panel owns permission, capture, equalizer, recognition and retry. */
  readonly capturePanel?: React.ReactNode;
}

function WaveformBarsV1({ active, reducedMotion }: { readonly active: boolean; readonly reducedMotion: boolean }) {
  const bars = [0, 1, 2, 3, 4, 5];
  return (
    <View
      style={styles.waveform}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((i) => (
        <WaveformBarV1 key={i} /* guard-ok: статичный массив [0..5], без reorder/insert */ index={i} active={active} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

function WaveformBarV1({
  index,
  active,
  reducedMotion,
}: {
  readonly index: number;
  readonly active: boolean;
  readonly reducedMotion: boolean;
}) {
  const height = useSharedValue(0.3);
  useEffect(() => {
    if (!active || reducedMotion) {
      height.value = withTiming(0.3, { duration: 160 });
      return;
    }
    // зачем: столбики амплитуды — декоративная индикация "идёт запись", НЕ
    // реальный уровень звука (его на этом контракте нет). Reanimated
    // withRepeat вместо setTimeout-цикла (правило проекта: анимация — на
    // UI-треде, не через JS-таймер).
    height.value = withDelay(
      index * 40,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: MOTION.waveformStepMs, easing: EASE }),
          withTiming(0.35, { duration: MOTION.waveformStepMs, easing: EASE }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(height);
    };
  }, [active, reducedMotion, height, index]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: height.value }] as const }));
  return <Animated.View style={[styles.waveBar, style]} />;
}

export function ScriptedRepeatCompareModeV1(props: ScriptedRepeatCompareModePropsV1) {
  const { theme: t } = useTheme();
  const palette = useTournamentPalette();
  const {
    prompt,
    interfaceLocale,
    reducedMotion,
    resolved,
    explanation,
    onPlayFullPhraseAudio,
    voiceStatus,
    transcript,
    instruction,
    modePayload,
    phase,
    referenceAudioState,
    capturePanel,
  } = props;

  if (modePayload && modePayload.family !== "scripted_repeat_compare") {
    throw new Error("learning_v2_repeat_compare_payload_mismatch");
  }

  // зачем (аудит нагрева 2026-08-26): обе вечные анимации этого режима (полоски
  // записи и пульс эталонного аудио) были привязаны только к recording/
  // referencePlaying. Аудио проекта не глушится по AppState, поэтому при
  // сворачивании флаги оставались true и циклы грели UI-поток в кармане.
  // Гард держим ОДИН на родителя (шесть полосок получают active пропом — одна
  // подписка вместо шести) и вешаем его ТОЛЬКО на анимации: сами recording/
  // referencePlaying остаются честными, иначе при сворачивании поменялся бы
  // смысл экрана (иконка Ⅱ/▶ и подпись «идёт запись»), а не только движение.
  const runtimeActive = useRuntimeActive();
  const recording = voiceStatus === "listening";
  const requesting = voiceStatus === "requesting" || voiceStatus === "finishing";
  const referencePlaying = referenceAudioState === "playing";
  const referenceLoading = referenceAudioState === "loading";
  const referenceDisabled = referenceLoading || recording || requesting;
  const copy = learningV2ModeRepeatCompareCopyV1(interfaceLocale);
  const audioPulse = useSharedValue(1);
  const audioProgress = useSharedValue(0);
  // Кольцо — конечная анимация хода звука, ведёт только referencePlaying:
  // завязав её на runtimeActive, мы перезапускали бы кольцо с нуля при
  // возврате из фона, под звук, играющий с середины.
  useEffect(() => {
    audioProgress.value = referencePlaying
      ? withTiming(1, { duration: 1500, easing: Easing.linear })
      : withTiming(0, { duration: reducedMotion ? 1 : 120 });
    return () => {
      cancelAnimation(audioProgress);
    };
  }, [audioProgress, reducedMotion, referencePlaying]);

  // Пульс — вечная анимация, только она подчиняется runtimeActive.
  useEffect(() => {
    audioPulse.value = referencePlaying && runtimeActive && !reducedMotion
      ? withRepeat(
          withSequence(
            withTiming(1.08, { duration: 540, easing: EASE }),
            withTiming(1, { duration: 540, easing: EASE }),
          ),
          -1,
          true,
        )
      : withTiming(1, { duration: reducedMotion ? 1 : 140 });
    return () => {
      cancelAnimation(audioPulse);
    };
  }, [audioPulse, reducedMotion, referencePlaying, runtimeActive]);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * (1 - audioProgress.value),
  }));
  const audioPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: audioPulse.value }],
  }));

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

  useEffect(() => {
    if (!recording) return;
    AccessibilityInfo.announceForAccessibility?.(copy.recording);
  }, [copy.recording, recording]);

  return (
    <View style={styles.root}>
      <Text style={[styles.taskLabel, { color: palette.muted }]}>{prompt}</Text>
      {onPlayFullPhraseAudio && (
        <View style={styles.playWrap}>
          <Svg
            width={116}
            height={116}
            viewBox="0 0 116 116"
            style={StyleSheet.absoluteFill}
          >
            <Circle
              cx={58}
              cy={58}
              r={RING_RADIUS}
              stroke={t.border}
              strokeWidth={5}
              fill="none"
            />
            <AnimatedCircle
              cx={58}
              cy={58}
              r={RING_RADIUS}
              stroke={referencePlaying ? t.accent : t.correct}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_LENGTH}
              animatedProps={ringProps}
              transform="rotate(-90 58 58)"
            />
          </Svg>
          <Animated.View style={audioPulseStyle}>
            <Pressable
              testID="learning-v2-repeat-reference-play"
              accessibilityRole="button"
              accessibilityLabel={copy.listenReference}
              accessibilityState={{ disabled: referenceDisabled, busy: referenceLoading }}
              disabled={referenceDisabled}
              hitSlop={10}
              onPress={onPlayFullPhraseAudio}
              style={[
                styles.playBtn,
                {
                  backgroundColor: t.bgSurface2,
                  opacity: referenceDisabled ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[styles.playGlyph, { color: t.accent }]}>
                {referencePlaying ? "Ⅱ" : "▶"}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      <Text style={[styles.targetPhrase, { color: t.accent }]}>
        {modePayload?.family === "scripted_repeat_compare"
          ? modePayload.targetPhrase
          : ""}
      </Text>

      {instruction && (
        <Text style={[styles.instruction, { color: t.textMuted }]}>{instruction}</Text>
      )}

      {/* Capture-зона: min-height зарезервирована, первый кадр = финальная
        геометрия (Performance Bible). Ровно один из трёх режимов виден. */}
      {capturePanel ?? (
        <V2Card style={styles.capture} pad={16}>
          {requesting ? (
            <Text style={[styles.captureLine, { color: t.textMuted }]}>{copy.preparingMicrophone}</Text>
          ) : recording ? (
            <View style={styles.recordingBlock}>
              <View style={styles.recStatusRow}>
                <View style={[styles.recDot, { backgroundColor: t.wrong }]} />
                <Text style={[styles.captureLine, { color: t.textPrimary }]}>{copy.recording}</Text>
              </View>
              <WaveformBarsV1 active={recording && runtimeActive} reducedMotion={reducedMotion} />
            </View>
          ) : transcript ? (
            <Text style={[styles.captureLine, { color: t.textPrimary }]}>{transcript}</Text>
          ) : (
            <Text style={[styles.captureLine, { color: t.textMuted }]}>
              {copy.holdMicrophone}
            </Text>
          )}
        </V2Card>
      )}

      {explanation && (
        <View style={[styles.feedbackLane, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{explanation}</Text>
        </View>
      )}
      {resolved && (
        <View style={[styles.feedbackLane, { backgroundColor: t.correctBg }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{copy.success}</Text>
        </View>
      )}
    </View>
  );
}

export default ScriptedRepeatCompareModeV1;

const styles = StyleSheet.create({
  root: { gap: 14, alignItems: "center" },
  taskLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  playWrap: { width: 116, height: 116, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: { fontSize: 28, fontWeight: "700" },
  targetPhrase: {
    width: "100%",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center",
  },
  instruction: {
    width: "100%",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
  },
  capture: {
    width: "100%",
    minHeight: 120,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  captureLine: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  recordingBlock: { alignItems: "center", gap: 12 },
  recStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  waveform: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 28 },
  waveBar: { width: 4, height: 28, borderRadius: 2, backgroundColor: "currentColor" },
  feedbackLane: { width: "100%", borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
