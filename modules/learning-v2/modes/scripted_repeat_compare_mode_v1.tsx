/**
 * Режим 7/7 — Повтор за моделью (голос, WIP). Источник вёрстки/анимаций:
 * docs/v2/mockups/14-repeat-compare.html (сам макет помечен WIP).
 *
 * зачем: голосовые повторы нуждаются в capture-зоне (готов/запись/обработка)
 * и волне word-chip'ов вместо текстовой карточки ordered_tokens/single_choice.
 *
 * ОСТОРОЖНО (прямое требование владельца): этот компонент НЕ трогает
 * app/learning_v2_direct_session_player_v1.tsx рядом с существующей
 * mic-веткой (кнопка старта/стопа в ActionDock, ~строки 1620-1690, и хук
 * useLearningV2LocalHoldToTalkV1). Реальный voice-flow приложения — HOLD-TO-
 * TALK (onPressIn начинает запись, onPressOut останавливает), а НЕ tap-to-
 * start/tap-to-stop, как в макете 14. Вместо переделки жеста под макет —
 * этот компонент только заменяет ВНУТРЕННЕЕ содержимое карточки (текст-
 * инструкция + транскрипт), сохраняя существующий hold-to-talk жест и саму
 * mic-кнопку в ActionDock БЕЗ ИЗМЕНЕНИЙ. Оба места читают один и тот же
 * localVoice.status, поэтому визуально они остаются согласованы.
 *
 * Данные: голосовой вердикт (PASS_CONFIDENT/NEEDS_WORK_CONFIDENT/UNCERTAIN/
 * INVALID из макета) сегодня не приходит отдельным полем — evaluate()
 * получает transcript и возвращает бинарный correct/wrong через тот же
 * V2LocalEvaluatorResponseV1, что и текстовые режимы. Четырёхветочный вердикт
 * макета — предмет этапа 3 (аудит контента/эволюции evaluator'а), здесь
 * рендерится честный бинарный расклад на реальном контракте.
 */

import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
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
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2LocalHoldToTalkStatusV1 } from "../../../hooks/use_learning_v2_local_hold_to_talk_v1";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { SCRIPTED_REPEAT_COMPARE_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Пропсы этого режима шире общего контракта — voice-состояние не нужно
 * остальным 6 режимам, поэтому не раздувает mode_contract_v1. */
export interface ScriptedRepeatCompareModePropsV1 extends LearningV2ModeCommonPropsV1 {
  readonly voiceStatus: LearningV2LocalHoldToTalkStatusV1;
  readonly transcript: string;
  readonly instruction: string | null;
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
  const {
    prompt,
    reducedMotion,
    resolved,
    explanation,
    onPlayFullPhraseAudio,
    voiceStatus,
    transcript,
    instruction,
    phase,
  } = props;

  const recording = voiceStatus === "listening";
  const requesting = voiceStatus === "requesting" || voiceStatus === "finishing";

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
    AccessibilityInfo.announceForAccessibility?.("Идёт запись");
  }, [recording]);

  return (
    <View style={styles.root}>
      <View style={styles.heroRow}>
        <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>
        {onPlayFullPhraseAudio && !recording && (
          <Animated.View
            accessibilityLabel="Прослушать эталон"
            style={[styles.audioBtn, { backgroundColor: t.bgSurface2 }]}
            onTouchEnd={onPlayFullPhraseAudio}
          >
            <Text style={{ color: t.accent, fontSize: 14 }}>♪</Text>
          </Animated.View>
        )}
      </View>

      {instruction && (
        <Text style={[styles.instruction, { color: t.textMuted }]}>{instruction}</Text>
      )}

      {/* Capture-зона: min-height зарезервирована, первый кадр = финальная
        геометрия (Performance Bible). Ровно один из трёх режимов виден. */}
      <View style={[styles.capture, { backgroundColor: t.bgCard }]}>
        {requesting ? (
          <Text style={[styles.captureLine, { color: t.textMuted }]}>Готовим микрофон…</Text>
        ) : recording ? (
          <View style={styles.recordingBlock}>
            <View style={styles.recStatusRow}>
              <View style={[styles.recDot, { backgroundColor: t.wrong }]} />
              <Text style={[styles.captureLine, { color: t.textPrimary }]}>Идёт запись</Text>
            </View>
            <WaveformBarsV1 active={recording} reducedMotion={reducedMotion} />
          </View>
        ) : transcript ? (
          <Text style={[styles.captureLine, { color: t.textPrimary }]}>{transcript}</Text>
        ) : (
          <Text style={[styles.captureLine, { color: t.textMuted }]}>
            Когда будешь готов — зажми кнопку микрофона и скажи фразу
          </Text>
        )}
      </View>

      {explanation && (
        <View style={[styles.feedbackLane, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{explanation}</Text>
        </View>
      )}
      {resolved && (
        <View style={[styles.feedbackLane, { backgroundColor: t.correctBg }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>Отлично сказано!</Text>
        </View>
      )}
    </View>
  );
}

export default ScriptedRepeatCompareModeV1;

const styles = StyleSheet.create({
  root: { gap: 14 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hero: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800" },
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
