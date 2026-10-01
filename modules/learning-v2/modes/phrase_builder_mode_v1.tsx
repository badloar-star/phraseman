/**
 * Активный режим 1/6 — Сборка фразы (ЭТАЛОН, одобрен владельцем).
 * Источник вёрстки/анимаций: docs/v2/mockups/02-phrase-builder.html.
 *
 * зачем: раньше ordered_tokens рендерился как список чипов + текстовая
 * "собранная" строка (см. app/learning_v2_direct_session_player_v1.tsx,
 * блок practice.inputMode === "ordered_tokens" до этой правки). Владелец
 * одобрил вместо этого отдельный экран: банк слов снизу, строка ответа
 * сверху с зарезервированной высотой, FLIP-перелёт чипа между ними.
 *
 * Данные: контент сегодня даёт только `prompt` + `responseOptions[]`
 * ({responseId, text}) — без per-карточки hint/praise/link из макета
 * (macket поле `hintFor`/`hintOrder`/`link`). Подсказка после 2-й ошибки уже
 * приходит из player'а через `explanation` (auxiliary.secondErrorExplanation
 * /responseFeedbackById) — используем её напрямую, ничего не выдумываем.
 */

import React, { useEffect, useMemo, useRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useLearningV2CompactPractice } from "../../../components/learning-v2/LearningV2PracticeViewport";
import { Lv2Chip, Lv2Cta, Lv2Explain, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import {
  MODE_SPRING_MICRO_V1,
  MODE_SPRING_UI_V1,
  PHRASE_BUILDER_MOTION_V1 as MOTION,
} from "./mode_motion_tokens_v1";
import { learningV2ModeCheckLabelV1 } from "./mode_copy_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

interface ChipProps {
  readonly label: string;
  readonly index: number;
  readonly verdict: "none" | "ok" | "bad";
  readonly nudgeToken: number;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly variant: "bank" | "answer";
  readonly ghost: boolean;
}

/** Один чип (банк или строка ответа). Стаггер входа + пресс + посадка +
 * толчок при ошибке — все на UI-треде через Reanimated shared values,
 * тот же паттерн, что уже используется в LearningV2AnswerChoice. */
function PhraseBuilderChipV1({
  label,
  index,
  verdict,
  nudgeToken,
  reducedMotion,
  disabled,
  onPress,
  variant,
  ghost,
}: ChipProps) {
  const compact = useLearningV2CompactPractice();
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  const nudge = useSharedValue(0);
  const verdictScale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      index * MOTION.bankChipStaggerMs,
      withSpring(1, MODE_SPRING_UI_V1),
    );
    // зачем: стаггер входа зависит только от индекса при монтировании —
    // умышленно не следим за index в deps, иначе повторный рендер сбросит анимацию.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (verdict === "none") return;
    if (reducedMotion) {
      verdictScale.value = 1;
      return;
    }
    // okPop: 0% scale(1) → 45% scale(1.1,0.92) → 100% scale(1) — приближено
    // одной пружиной micro вместо покадрового keyframe.
    verdictScale.value = withSequence(
      withTiming(1.08, { duration: MOTION.chipLandMs * 0.4, easing: EASE }),
      withSpring(1, MODE_SPRING_MICRO_V1),
    );
  }, [verdict, reducedMotion, verdictScale]);

  useEffect(() => {
    if (nudgeToken === 0 || reducedMotion) return;
    nudge.value = withSequence(
      withTiming(-6, { duration: 60, easing: EASE }),
      withTiming(5, { duration: 60, easing: EASE }),
      withTiming(0, { duration: 60, easing: EASE }),
    );
  }, [nudgeToken, reducedMotion, nudge]);

  const style = useAnimatedStyle(() => ({
    opacity: ghost ? 0 : enter.value,
    transform: [
      { translateY: (1 - enter.value) * (variant === "bank" ? 16 : 10) },
      { translateX: nudge.value },
      { scale: verdictScale.value },
    ] as const,
  }));

  return (
    <Animated.View style={style}>
      {/* зачем (learning-v2.html, .chip): чип-слово стекла — 46 dp, радиус 14, «полка» 3 px;
          верно/неверно красят заливку и текст сами, цвет слова в идле — токен темы. */}
      <Lv2Chip
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled || ghost}
        onPress={onPress}
        verdict={verdict === "ok" ? "ok" : verdict === "bad" ? "bad" : "idle"}
      >
        {label}
      </Lv2Chip>
    </Animated.View>
  );
}

/**
 * Сборка фразы: банк слов снизу, строка ответа сверху. Тап по слову банка
 * добавляет его в конец собираемой последовательности (onAppendToken); тап
 * по любому слову в строке ответа возвращает именно этот чип в банк
 * (onRemoveTokenAt), как в owner-макете.
 */
export function PhraseBuilderModeV1(props: LearningV2ModeCommonPropsV1) {
  const compact = useLearningV2CompactPractice();
  const g = useLv2Glass();
  const {
    prompt,
    options,
    orderedResponseIds,
    wrongNudge,
    reducedMotion,
    resolved,
    explanation,
    onAppendToken,
    onRemoveTokenAt,
    onPlayFullPhraseAudio,
    phase,
    modePayload,
    onSubmit,
    canSubmit,
    interfaceLocale,
  } = props;
  if (modePayload && modePayload.family !== "phrase_builder") {
    throw new Error("learning_v2_phrase_builder_payload_mismatch");
  }

  const usedIds = useMemo(() => new Set(orderedResponseIds), [orderedResponseIds]);
  const answerChips = useMemo(
    () =>
      orderedResponseIds
        .map((responseId) => options.find((option) => option.responseId === responseId))
        .filter((entry): entry is (typeof options)[number] => entry !== undefined),
    [orderedResponseIds, options],
  );

  const announcedRef = useRef(false);
  useEffect(() => {
    if (phase !== "success" || announcedRef.current) return;
    announcedRef.current = true;
    void hapticSuccess();
    if (!reducedMotion) return;
    // Reduced motion: волна по чипам заменяется мгновенным состоянием —
    // объявляем результат вслух, чтобы обратная связь не потерялась молча.
    AccessibilityInfo.announceForAccessibility?.(prompt);
  }, [phase, reducedMotion, prompt]);
  useEffect(() => {
    if (phase !== "success") announcedRef.current = false;
  }, [phase]);

  return (
    <View style={[styles.root, compact && { gap: 6 }]}>
      <Text style={[styles.taskLabel, { color: g.secondary }]}>{prompt}</Text>
      <View style={styles.heroRow}>
        <Text style={[styles.hero, { color: g.text }]}>
          {modePayload?.family === "phrase_builder"
            ? modePayload.localizedMeaning[interfaceLocale]
            : ""}
        </Text>
        {onPlayFullPhraseAudio && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onPlayFullPhraseAudio}
            style={[styles.audioBtn, { backgroundColor: g.opaqueControl }]}
          >
            <Ionicons name="volume-high" size={18} color={g.text} />
          </Pressable>
        )}
      </View>

      {/* Строка ответа: min-height зарезервирована, первый кадр = финальная
        геометрия (Performance Bible — никаких прыжков при появлении чипов). */}
      <View style={[styles.answerRow, compact && { minHeight: 48, paddingBottom: 4, gap: 6 }, { borderBottomColor: g.line }]}>
        {answerChips.length === 0 ? (
          <Text style={[styles.placeholder, { color: g.mutedText }]}>
            {" "}
          </Text>
        ) : (
          answerChips.map((chip, index) => (
            <PhraseBuilderChipV1
              key={`${chip.responseId}-${index}`}
              label={chip.text}
              index={index}
              variant="answer"
              ghost={false}
              verdict={
                phase === "success"
                  ? "ok"
                  : phase === "needs_work" && chip.responseId === wrongNudge.responseId
                    ? "bad"
                    : "none"
              }
              nudgeToken={wrongNudge.responseId === chip.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onRemoveTokenAt(index)}
            />
          ))
        )}
      </View>

      <View style={[styles.bank, compact && { gap: 6 }]}>
        {options
          .filter((option) => !usedIds.has(option.responseId))
          .map((option, index) => (
            <PhraseBuilderChipV1
              key={option.responseId}
              label={option.text}
              index={index}
              variant="bank"
              ghost={false}
              verdict="none"
              nudgeToken={0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onAppendToken(option.responseId)}
            />
          ))}
      </View>

      {explanation ? <Lv2Explain>{explanation}</Lv2Explain> : null}

      <Lv2Cta
        disabled={!canSubmit || resolved || phase === "processing"}
        onPress={onSubmit}
      >
        {learningV2ModeCheckLabelV1(interfaceLocale)}
      </Lv2Cta>
    </View>
  );
}

export default PhraseBuilderModeV1;

const styles = StyleSheet.create({
  root: { gap: 14 },
  taskLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hero: { flex: 1, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.3 },
  audioBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  answerRow: {
    minHeight: 64,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 8,
    paddingBottom: 10,
  },
  placeholder: { fontSize: 16 },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" },
});
