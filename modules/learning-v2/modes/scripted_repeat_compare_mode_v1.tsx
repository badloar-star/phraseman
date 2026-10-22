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
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Lv2Explain, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useScaledTextStyles } from "../../../hooks/useLineScale";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import type { LearningV2LocalHoldToTalkStatusV1 } from "../../../hooks/use_learning_v2_local_hold_to_talk_v1";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { LearningV2AudioReplayPressableV1 } from "./audio_replay_pressable_v1";
import { learningV2ScriptedRepeatAnswerBearingContentRevealedV1 } from "../contracts/mode_native_payload_v1";
import { LearningV2ModeFeedbackLaneV1 } from "./mode_feedback_v1";
import { nestedShadowStyle } from "../../../constants/liquidGlassShadowStyle";
import { feedbackInkSoftForLight } from "../../../constants/learningV2ModeFeedbackPalette";
import { learningV2ModeRepeatCompareCopyV1 } from "./mode_copy_v1";
import type { Lang } from "../../../constants/i18n";
import { lv2TaskTokens } from "../../../components/learning-v2/learning_v2_task_theme_tokens";
import { LearningV2SayCard, LearningV2TaskLead, useLearningV2TaskParts } from "../../../components/learning-v2/LearningV2TaskBody";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

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
  const referencePlaying = referenceAudioState === "playing";
  const referenceLoading = referenceAudioState === "loading";
  // зачем (владелец 22.10 «динамик и всегда можно нажать повторно»): кнопку образца не гасим ни во время звучания, ни пока
  // ждём оценку — нажатие перезапускает фразу (обработчик плеера останавливает звук и играет заново). Единственное
  // исключение — идёт запись голоса: иначе образец попадёт в микрофон и испортит попытку.
  const referenceDisabled = recording;
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
  // зачем (колонка «Предлагаем»): части строки задания — по правилам Learning V2; разбор идёт по «видимой» строке (без ответа, пока он скрыт)
  const parts = useLearningV2TaskParts({ family: props.family, prompt: visiblePrompt, interfaceLocale, modePayload });
  const visibleParts = answerBearingContentRevealed ? parts : { ...parts, goal: null };
  const audioPulse = useSharedValue(1);
  // Кольцо — конечная анимация хода звука, ведёт только referencePlaying:
  // завязав её на runtimeActive, мы перезапускали бы кольцо с нуля при
  // возврате из фона, под звук, играющий с середины.
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
      <LearningV2TaskLead lang={interfaceLocale as Lang} parts={visibleParts} />
      {answerBearingContentRevealed && targetPhrase ? (
        <LearningV2SayCard
          primary={targetPhrase}
          secondary={parts.goal?.text ?? null}
          trailing={onPlayFullPhraseAudio ? (
            <Animated.View style={audioPulseStyle}>
              <LearningV2AudioReplayPressableV1
                accessibilityLabel={copy.listenReference}
                accessibilityState={{ disabled: referenceDisabled, busy: referenceLoading }}
                contentStyle={[sx.speaker, { backgroundColor: lv2TaskTokens(g).controlSoft, opacity: referenceDisabled ? 0.45 : 1 }]}
                disabled={referenceDisabled}
                onPress={onPlayFullPhraseAudio}
                reducedMotion={reducedMotion}
                testID="learning-v2-repeat-reference-play"
              >
                <Ionicons name="volume-high" size={18} color={g.text} />
              </LearningV2AudioReplayPressableV1>
            </Animated.View>
          ) : null}
        />
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
  // `.spk` 38 в карточке «фраза + перевод»
  speaker: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  // `.micl` макета №23: 13/17, --sec, по центру, margin-top 18
  instruction: {
    width: "100%",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 17,
    textAlign: "center",
    marginTop: 18,
  },
  feedbackLane: { width: "100%", marginTop: 18 },
  // `.verdict` margin-top 16.
  verdict: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 22, marginTop: 16 },
  verdictText: { fontSize: 16, lineHeight: 22, fontWeight: "600", flexShrink: 1 },
});
