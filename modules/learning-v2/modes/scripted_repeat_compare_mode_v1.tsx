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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../../components/ThemeContext";
import { V2Card } from "../../../components/ui/v2_ui";
import { useTournamentPalette } from "../../../components/ui/v2_theme";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2LocalHoldToTalkStatusV1 } from "../../../hooks/use_learning_v2_local_hold_to_talk_v1";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeRepeatCompareCopyV1 } from "./mode_copy_v1";
import { SCRIPTED_REPEAT_COMPARE_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

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

  const recording = voiceStatus === "listening";
  const requesting = voiceStatus === "requesting" || voiceStatus === "finishing";
  const referencePlaying = referenceAudioState === "playing";
  const referenceLoading = referenceAudioState === "loading";
  const copy = learningV2ModeRepeatCompareCopyV1(interfaceLocale);
  const audioPulse = useSharedValue(1);
  useEffect(() => {
    audioPulse.value = referencePlaying && !reducedMotion
      ? withRepeat(
          withSequence(
            withTiming(1.08, { duration: 540, easing: EASE }),
            withTiming(1, { duration: 540, easing: EASE }),
          ),
          -1,
          true,
        )
      : withTiming(1, { duration: reducedMotion ? 1 : 140 });
  }, [audioPulse, reducedMotion, referencePlaying]);
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
      <View style={styles.heroRow}>
        <Text style={[styles.targetPhrase, { color: t.accent }]}>
          {modePayload?.family === "scripted_repeat_compare"
            ? modePayload.targetPhrase
            : ""}
        </Text>
        {onPlayFullPhraseAudio && !recording && (
          <Animated.View style={audioPulseStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.listenReference}
              accessibilityState={{ disabled: referenceLoading, busy: referenceLoading }}
              disabled={referenceLoading}
              hitSlop={10}
              onPress={onPlayFullPhraseAudio}
              style={[
                styles.audioBtn,
                {
                  backgroundColor: t.bgSurface2,
                  opacity: referenceLoading ? 0.55 : 1,
                },
              ]}
            >
              <Text style={{ color: t.accent, fontSize: 18, fontWeight: "900" }}>
                {referencePlaying ? "Ⅱ" : "▶"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

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
              <WaveformBarsV1 active={recording} reducedMotion={reducedMotion} />
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
  root: { gap: 14 },
  taskLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  targetPhrase: { flex: 1, fontSize: 26, lineHeight: 32, fontWeight: "900" },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  instruction: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  capture: {
    minHeight: 96,
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
  feedbackLane: { borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
