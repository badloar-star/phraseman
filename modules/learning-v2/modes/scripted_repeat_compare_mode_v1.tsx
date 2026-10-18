/**
 * Активный режим 6/6 — Повтор за моделью. Источник вёрстки/анимаций:
 * docs/v2/mockups/14-repeat-compare.html.
 *
 * зачем: режим отвечает только за эталон, целевую фразу и учебный feedback.
 * Реальный voice-flow и его визуальные состояния принадлежат общему
 * `SpeakingPanel`, а крупный hold-to-talk target расположен рядом с заданием.
 * Отдельной декоративной «записи» здесь нет: эквалайзер, transcript и звёзды
 * обязаны совпадать с рабочим режимом «Устно».
 *
 * Данные: голосовой вердикт (PASS_CONFIDENT/NEEDS_WORK_CONFIDENT/UNCERTAIN/
 * INVALID из макета) сегодня не приходит отдельным полем — evaluate()
 * получает transcript и возвращает бинарный correct/wrong через тот же
 * V2LocalEvaluatorResponseV1, что и текстовые режимы. Четырёхветочный вердикт
 * макета — предмет этапа 3 (аудит контента/эволюции evaluator'а), здесь
 * рендерится честный бинарный расклад на реальном контракте.
 */

import React, { useEffect, useRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useLearningV2CompactPractice } from "../../../components/learning-v2/LearningV2PracticeViewport";
import { Lv2Explain, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useScaledTextStyles } from "../../../hooks/useLineScale";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import type { LearningV2LocalHoldToTalkStatusV1 } from "../../../hooks/use_learning_v2_local_hold_to_talk_v1";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ScriptedRepeatAnswerBearingContentRevealedV1 } from "../contracts/mode_native_payload_v1";
import { LearningV2ModeFeedbackLaneV1 } from "./mode_feedback_v1";
import { nestedShadowStyle } from "../../../constants/liquidGlassShadowStyle";
import { feedbackInkSoftForLight } from "../../../constants/learningV2ModeFeedbackPalette";
import { learningV2ModeRepeatCompareCopyV1 } from "./mode_copy_v1";

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
  /** True only after the host has received a scored/submitted learner attempt. */
  readonly attemptSubmitted?: boolean;
}

export function ScriptedRepeatCompareModeV1(props: ScriptedRepeatCompareModePropsV1) {
  const compact = useLearningV2CompactPractice();
  const g = useLv2Glass();
  const {
    prompt,
    interfaceLocale,
    reducedMotion,
    resolved,
    explanation,
    onPlayFullPhraseAudio,
    voiceStatus,
    instruction,
    learnerFeedback,
    modePayload,
    phase,
    referenceAudioState,
    attemptSubmitted,
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
  const revealPolicyValue =
    modePayload?.family === "scripted_repeat_compare"
      ? modePayload.scriptedRepeatRevealPolicy
      : undefined;
  // Any present-but-invalid policy stays hidden. Validated guided payloads omit
  // the field and retain their historical visible model-first behavior.
  const answerBearingContentRevealed =
    learningV2ScriptedRepeatAnswerBearingContentRevealedV1(
      revealPolicyValue,
      attemptSubmitted === true,
    );
  const targetPhrase =
    modePayload?.family === "scripted_repeat_compare"
      ? modePayload.targetPhrase
      : "";
  const normalizedLeakText = (value: string): string =>
    value
      .normalize("NFKC")
      .replace(/\s+/gu, " ")
      .trim()
      .toLocaleLowerCase("en");
  const normalizedTarget = normalizedLeakText(targetPhrase);
  const containsTarget = (value: string | null): boolean =>
    Boolean(
      normalizedTarget &&
        value &&
        normalizedLeakText(value).includes(normalizedTarget),
    );
  const visiblePrompt =
    !answerBearingContentRevealed && containsTarget(prompt) ? "" : prompt;
  const visibleInstruction =
    !answerBearingContentRevealed && containsTarget(instruction)
      ? null
      : instruction;
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
    AccessibilityInfo.announceForAccessibility?.(copy.listening);
  }, [copy.listening, recording]);

  const sx = useScaledTextStyles(styles);
  return (
    // зачем (сверка с learning-v2.html rc, 05.10): заголовок слева 600; эталон 22; фраза 24; подсказка 10; разбор 18;
    // вердикт 16 (раньше ровный gap 14 и всё по центру). Сама кнопка эталона — решение владельца 26.08, не меняю.
    <View style={sx.root}>
      {visiblePrompt ? (
        <Text style={[sx.taskLabel, { color: g.secondary }]}>
          {visiblePrompt}
        </Text>
      ) : null}
      {answerBearingContentRevealed && onPlayFullPhraseAudio && (
        // зачем (learning-v2.html, rc): эталон — круглая кнопка на токенах стекла с кольцом хода
        // звука (прежнее решение владельца 26.08 сохранено), значок динамика/паузы вместо текстовых
        // символов; реальное состояние аудио по-прежнему берётся из referenceAudioState.
        <View style={[sx.playWrap, compact && { width: 80, height: 80, marginTop: 8 }]}>
          <Svg
            width={compact ? 80 : 116}
            height={compact ? 80 : 116}
            viewBox="0 0 116 116"
            style={StyleSheet.absoluteFill}
          >
            <Circle
              cx={58}
              cy={58}
              r={RING_RADIUS}
              stroke={g.opaqueControl}
              strokeWidth={5}
              fill="none"
            />
            <AnimatedCircle
              cx={58}
              cy={58}
              r={RING_RADIUS}
              stroke={referencePlaying ? g.text : g.good}
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
                sx.playBtn, compact && { width: 64, height: 64, borderRadius: 32 },
                {
                  backgroundColor: g.opaqueCard,
                  opacity: referenceDisabled ? 0.45 : 1,
                },
              ]}
            >
              <Ionicons name={referencePlaying ? "pause" : "volume-high"} size={40} color={g.text} />
            </Pressable>
          </Animated.View>
        </View>
      )}

      {answerBearingContentRevealed && targetPhrase ? (
        <Text style={[sx.targetPhrase, compact && { fontSize: 26, lineHeight: 31, marginTop: 10 }, { color: g.text }]}>
          {targetPhrase}
        </Text>
      ) : null}

      {visibleInstruction && (
        <Text style={[sx.instruction, { color: g.secondary }]}>{visibleInstruction}</Text>
      )}

      {answerBearingContentRevealed && explanation ? <Lv2Explain style={sx.feedbackLane}>{explanation}</Lv2Explain> : null}
      {answerBearingContentRevealed ? (
        <LearningV2ModeFeedbackLaneV1 feedback={learnerFeedback} interfaceLocale={interfaceLocale} ink={g.text} inkSoft={g.isLight ? feedbackInkSoftForLight(g) : g.text} shadow={nestedShadowStyle(g) as never} />
      ) : null}
      {resolved && (
        // зачем (learning-v2.html, `.verdict.ok`): «Отлично сказано!» — значок-галочка и текст
        // зелёным по центру, без плашки-заливки.
        <View accessibilityLiveRegion="polite" style={sx.verdict}>
          <Ionicons name="checkmark" size={20} color={g.good} />
          <Text style={[sx.verdictText, { color: g.good }]}>{copy.success}</Text>
        </View>
      )}
    </View>
  );
}

export default ScriptedRepeatCompareModeV1;

const styles = StyleSheet.create({
  root: { alignItems: "center" },
  // `.tlab` 15/600 --sec, слева (D145 → 16).
  taskLabel: {
    alignSelf: "stretch",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  playWrap: { width: 116, height: 116, alignItems: "center", justifyContent: "center", marginTop: 22 },
  playBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  targetPhrase: {
    width: "100%",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
    marginTop: 24,
  },
  // `.scene` по центру, margin-top 10.
  instruction: {
    width: "100%",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
  feedbackLane: { width: "100%", marginTop: 18 },
  // `.verdict` margin-top 16.
  verdict: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 22, marginTop: 16 },
  verdictText: { fontSize: 16, lineHeight: 22, fontWeight: "600", flexShrink: 1 },
});
