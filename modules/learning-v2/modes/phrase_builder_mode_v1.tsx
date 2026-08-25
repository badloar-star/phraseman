/**
 * Режим 1/7 — Сборка фразы (ЭТАЛОН, одобрен владельцем).
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

import { useTheme } from "../../../components/ThemeContext";
import { hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import {
  MODE_SPRING_MICRO_V1,
  MODE_SPRING_UI_V1,
  PHRASE_BUILDER_MOTION_V1 as MOTION,
} from "./mode_motion_tokens_v1";

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
  readonly bg: string;
  readonly edgeColor: string;
  readonly textColor: string;
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
  bg,
  edgeColor,
  textColor,
}: ChipProps) {
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  const press = useSharedValue(1);
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
      { scale: press.value * verdictScale.value },
    ] as const,
  }));

  const verdictBg = verdict === "ok" ? undefined : verdict === "bad" ? undefined : bg;

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || ghost }}
        disabled={disabled || ghost}
        onPressIn={() => {
          if (reducedMotion) return;
          void hapticLightImpact();
          press.value = withTiming(0.96, { duration: MOTION.chipPressMs, easing: EASE });
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          press.value = withTiming(1, { duration: MOTION.chipPressMs, easing: EASE });
        }}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor:
              verdict === "ok" ? "transparent" : verdict === "bad" ? "transparent" : (verdictBg ?? bg),
            borderBottomWidth: 3,
            borderBottomColor: edgeColor,
          },
        ]}
      >
        <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Сборка фразы: банк слов снизу, строка ответа сверху. Тап по слову банка
 * добавляет его в конец собираемой последовательности (onAppendToken); тап
 * по последнему добавленному слову в строке ответа убирает его (onUndoToken)
 * — упрощение относительно макета (там можно убрать любое слово из середины),
 * оправданное тем, что responseOptions не несёт позиционного смысла кроме
 * порядка добавления, а player хранит только последовательность id.
 */
export function PhraseBuilderModeV1(props: LearningV2ModeCommonPropsV1) {
  const { theme: t } = useTheme();
  const {
    prompt,
    options,
    orderedResponseIds,
    wrongNudge,
    reducedMotion,
    resolved,
    explanation,
    onAppendToken,
    onUndoToken,
    onPlayFullPhraseAudio,
    phase,
  } = props;

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
    <View style={styles.root}>
      <View style={styles.heroRow}>
        <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>
        {onPlayFullPhraseAudio && (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onPlayFullPhraseAudio}
            style={[styles.audioBtn, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={[styles.audioGlyph, { color: t.accent }]}>♪</Text>
          </Pressable>
        )}
      </View>

      {/* Строка ответа: min-height зарезервирована, первый кадр = финальная
        геометрия (Performance Bible — никаких прыжков при появлении чипов). */}
      <View style={[styles.answerRow, { borderBottomColor: t.bgSurface2 }]}>
        {answerChips.length === 0 ? (
          <Text style={[styles.placeholder, { color: t.textMuted }]}>
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
              onPress={index === answerChips.length - 1 ? onUndoToken : () => {}}
              bg={t.bgCard}
              edgeColor={t.bgSurface2}
              textColor={
                phase === "success"
                  ? t.correctText
                  : phase === "needs_work" && chip.responseId === wrongNudge.responseId
                    ? t.wrong
                    : t.textPrimary
              }
            />
          ))
        )}
      </View>

      <View style={styles.bank}>
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
              bg={t.bgCard}
              edgeColor={t.bgSurface2}
              textColor={t.textPrimary}
            />
          ))}
      </View>

      {explanation && (
        <View style={[styles.feedbackLane, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>
            {explanation}
          </Text>
        </View>
      )}
    </View>
  );
}

export default PhraseBuilderModeV1;

const styles = StyleSheet.create({
  root: { gap: 14 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  hero: { flex: 1, fontSize: 24, lineHeight: 30, fontWeight: "800" },
  audioBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioGlyph: { fontSize: 16, fontWeight: "700" },
  answerRow: {
    minHeight: 64,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 8,
    paddingBottom: 10,
  },
  placeholder: { fontSize: 15 },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  chip: { borderRadius: 16, paddingVertical: 11, paddingHorizontal: 16 },
  chipText: { fontSize: 16.5, fontWeight: "700" },
  feedbackLane: { borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
