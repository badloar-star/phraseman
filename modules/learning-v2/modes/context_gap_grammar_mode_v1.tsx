/**
 * Режим 5/7 — Контекстный пропуск. Источник вёрстки/анимаций:
 * docs/v2/mockups/06-context-gap.html.
 *
 * зачем: грамматика различима только в контексте — нужен пропуск ВНУТРИ
 * предложения (не отдельный вопрос) и ровно 3 варианта под ним.
 *
 * Данные: макет ожидает предложение, заранее разбитое на pre/slot/post.
 * Сегодняшний контент даёт единый `prompt` без разметки пропуска — мы не
 * можем безопасно угадать, где внутри текста находится пропуск (риск
 * сломать смысл). Поэтому пропуск рендерится ПОСЛЕ prompt как отдельная
 * зона (не inline), а сам prompt остаётся эталонным текстом с пропуском,
 * если он уже размечен маркером "___" в контенте, — иначе слот просто
 * добавляется под предложением. Это осознанный компромисс этапа 1;
 * этап 3 (аудит контента) должен решить, добавлять ли pre/gap/post в схему
 * специально для context_gap_grammar.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../../components/ThemeContext";
import { hapticError, hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { CONTEXT_GAP_GRAMMAR_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const GAP_MARKER = "___";

function splitPromptAtGap(prompt: string): { pre: string; hasGap: boolean; post: string } {
  const ix = prompt.indexOf(GAP_MARKER);
  if (ix === -1) return { pre: prompt, hasGap: false, post: "" };
  return {
    pre: prompt.slice(0, ix),
    hasGap: true,
    post: prompt.slice(ix + GAP_MARKER.length),
  };
}

function ContextGapVariantV1({
  label,
  selected,
  verdict,
  dimmed,
  nudgeToken,
  reducedMotion,
  disabled,
  onPress,
  bg,
  selectedBg,
  textColor,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly verdict: "none" | "ok" | "bad";
  readonly dimmed: boolean;
  readonly nudgeToken: number;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly bg: string;
  readonly selectedBg: string;
  readonly textColor: string;
}) {
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    lift.value = withTiming(selected ? 1 : 0, {
      duration: reducedMotion ? 1 : 140,
      easing: EASE,
    });
  }, [selected, reducedMotion, lift]);

  useEffect(() => {
    if (nudgeToken === 0 || reducedMotion) return;
    nudge.value = withSequence(
      withTiming(-6, { duration: 60, easing: EASE }),
      withTiming(5, { duration: 60, easing: EASE }),
      withTiming(0, { duration: 60, easing: EASE }),
    );
  }, [nudgeToken, reducedMotion, nudge]);

  const style = useAnimatedStyle(() => ({
    opacity: dimmed ? 0.82 : 1,
    transform: [
      { translateY: lift.value * -2 },
      { translateX: nudge.value },
      { scale: press.value },
    ] as const,
  }));

  return (
    <Animated.View style={[styles.variantWrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (reducedMotion) return;
          void hapticLightImpact();
          press.value = withTiming(0.97, { duration: 80, easing: EASE });
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          press.value = withTiming(1, { duration: 80, easing: EASE });
        }}
        onPress={onPress}
        style={[
          styles.variant,
          {
            backgroundColor:
              verdict === "ok" ? undefined : verdict === "bad" ? undefined : selected ? selectedBg : bg,
          },
        ]}
      >
        <Text style={[styles.variantText, { color: textColor }]} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ContextGapGrammarModeV1(props: LearningV2ModeCommonPropsV1) {
  const { theme: t } = useTheme();
  const {
    prompt,
    options,
    selectedChoiceId,
    wrongNudge,
    reducedMotion,
    resolved,
    explanation,
    onPick,
    onPlayFullPhraseAudio,
    phase,
  } = props;

  const { pre, hasGap, post } = useMemo(() => splitPromptAtGap(prompt), [prompt]);
  const filled = options.find((option) => option.responseId === selectedChoiceId)?.text ?? null;

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

  const hasSelection = selectedChoiceId !== null;

  return (
    <View style={styles.root}>
      <Text style={[styles.taskLabel, { color: t.textMuted }]}>Заполни пропуск</Text>

      <View style={styles.heroRow}>
        {hasGap ? (
          <Text style={[styles.hero, { color: t.textPrimary }]}>
            {pre}
            <Text
              style={[
                styles.gapSlot,
                {
                  color: filled ? t.correctText : t.textGhost,
                  backgroundColor: filled ? t.accentBg : t.bgSurface2,
                },
              ]}
            >
              {" "}
              {filled ?? "····"}{" "}
            </Text>
            {post}
          </Text>
        ) : (
          <>
            <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>
            <Text
              style={[
                styles.gapSlot,
                styles.gapSlotStandalone,
                {
                  color: filled ? t.correctText : t.textMuted,
                  backgroundColor: filled ? t.accentBg : t.bgSurface2,
                },
              ]}
            >
              {filled ?? "····"}
            </Text>
          </>
        )}
        {onPlayFullPhraseAudio && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Прослушать фразу"
            hitSlop={8}
            onPress={onPlayFullPhraseAudio}
            style={[styles.audioBtn, { backgroundColor: t.bgSurface2 }]}
          >
            <Text style={{ color: t.accent, fontSize: 14 }}>♪</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.variants}>
        {options.map((option) => {
          const selected = selectedChoiceId === option.responseId;
          const verdict: "none" | "ok" | "bad" =
            phase === "success" && selected
              ? "ok"
              : phase === "needs_work" && wrongNudge.responseId === option.responseId
                ? "bad"
                : "none";
          return (
            <ContextGapVariantV1
              key={option.responseId}
              label={option.text}
              selected={selected}
              verdict={verdict}
              dimmed={hasSelection && !selected}
              nudgeToken={wrongNudge.responseId === option.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onPick(option.responseId)}
              bg={t.bgCard}
              selectedBg={t.accentBg}
              textColor={
                verdict === "ok"
                  ? t.correctText
                  : verdict === "bad"
                    ? t.wrong
                    : selected
                      ? t.textPrimary
                      : t.textMuted
              }
            />
          );
        })}
      </View>

      {explanation && (
        <View style={[styles.feedbackLane, { backgroundColor: t.bgSurface2 }]}>
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{explanation}</Text>
        </View>
      )}
    </View>
  );
}

export default ContextGapGrammarModeV1;

const styles = StyleSheet.create({
  root: { gap: 14 },
  taskLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: 10 },
  hero: { flex: 1, fontSize: 21, lineHeight: 28, fontWeight: "800", minWidth: 200 },
  gapSlot: {
    fontWeight: "800",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  gapSlotStandalone: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 18,
  },
  audioBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  variants: { flexDirection: "row", gap: 10 },
  variantWrap: { flex: 1 },
  variant: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  variantText: { fontSize: 15.5, fontWeight: "700", textAlign: "center" },
  feedbackLane: { borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
