/**
 * Активный режим 4/6 — Контекстный пропуск. Источник вёрстки/анимаций:
 * docs/v2/mockups/06-context-gap.html.
 *
 * зачем: грамматика различима только в контексте — нужен пропуск ВНУТРИ
 * предложения (не отдельный вопрос) и ровно 3 варианта под ним.
 *
 * Данные: modePayload несёт отдельные localizedScene, gappedTargetPhrase и
 * gapOptions. Компонент не угадывает место пропуска по общему prompt.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useLearningV2CompactPractice } from "../../../components/learning-v2/LearningV2PracticeViewport";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Explain, Lv2Option, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useScaledTextStyles } from "../../../hooks/useLineScale";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { LearningV2AudioReplayPressableV1 } from "./audio_replay_pressable_v1";
import { learningV2ModeContextGapCopyV1 } from "./mode_copy_v1";

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

/** Заливка «дырки» `.gap`: светлая при выбранном, зелёная при верном, красная при неверном. */
function lv2GapFill(
  g: ReturnType<typeof useLv2Glass>,
  phase: LearningV2ModeCommonPropsV1["phase"],
  selectedId: string | null,
  wrongId: string | null,
): { readonly bg: string; readonly ink: string } {
  if (phase === "success") return { bg: g.goodFill, ink: g.good };
  if (phase === "needs_work" && selectedId !== null && selectedId === wrongId) {
    return { bg: g.badFill, ink: g.bad };
  }
  return { bg: g.cta, ink: g.ctaInk };
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
  readonly textColor?: string;
}) {
  const compact = useLearningV2CompactPractice();
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);

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
    opacity: 1,
    transform: [
      { translateY: lift.value * -2 },
      { translateX: nudge.value },
    ] as const,
  }));

  return (
    <Animated.View style={[styles.variantWrap, style]}>
      {/* зачем (learning-v2.html, cg): три варианта — плиты `.opt` друг под другом на всю
          ширину, с отметкой верно/неверно справа; тап по ним не блокируется затемнением. */}
      <Lv2Option
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        selected={selected}
        verdict={verdict === "ok" ? "ok" : verdict === "bad" ? "bad" : "idle"}
        style={dimmed ? { opacity: 0.45 } : undefined}
        textStyle={textColor ? { color: textColor } : undefined}
        label={label}
      />
    </Animated.View>
  );
}

export function ContextGapGrammarModeV1(props: LearningV2ModeCommonPropsV1) {
  const compact = useLearningV2CompactPractice();
  const g = useLv2Glass();
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
    modePayload,
    interfaceLocale,
  } = props;
  if (modePayload && modePayload.family !== "context_gap_grammar") {
    throw new Error("learning_v2_context_gap_payload_mismatch");
  }

  const { pre, hasGap, post } = useMemo(
    () => splitPromptAtGap(
      modePayload?.family === "context_gap_grammar"
        ? modePayload.gappedTargetPhrase
        : prompt,
    ),
    [modePayload, prompt],
  );
  const filled = options.find((option) => option.responseId === selectedChoiceId)?.text ?? null;
  const copy = learningV2ModeContextGapCopyV1(interfaceLocale);
  const gapPaint = lv2GapFill(g, phase, selectedChoiceId, wrongNudge.responseId);

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

  const sx = useScaledTextStyles(styles);

  return (
    // зачем (сверка с learning-v2.html cg, 05.10): отступы макета — сцена 10, фраза с пропуском 18, варианты 26 через 13,
    // разбор 18 (было ровно 14); заголовок 600; затемнение .45 только у вариантов вне разбора (в cg-2…4 не гаснут).
    <View style={sx.root}>
      <Text style={[sx.taskLabel, { color: g.secondary }]}>{copy.title}</Text>
      <Text style={[sx.scene, { color: g.secondary }, compact && { marginTop: 4 }]}>
        {modePayload?.family === "context_gap_grammar"
          ? modePayload.localizedScene[interfaceLocale]
          : prompt}
      </Text>

      <View style={[sx.heroRow, compact && { marginTop: 8 }]}>
        {hasGap ? (
          <Text style={[sx.hero, { color: g.text }]}>
            {pre}
            <Text
              style={[
                sx.gapSlot,
                {
                  color: filled ? gapPaint.ink : g.mutedText,
                  backgroundColor: filled ? gapPaint.bg : g.opaqueControl,
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
            <Text style={[sx.hero, { color: g.text }]}>{prompt}</Text>
            <Text
              style={[
                sx.gapSlot,
                sx.gapSlotStandalone,
                {
                  color: filled ? gapPaint.ink : g.mutedText,
                  backgroundColor: filled ? gapPaint.bg : g.opaqueControl,
                },
              ]}
            >
              {filled ?? "····"}
            </Text>
          </>
        )}
        {onPlayFullPhraseAudio && (
          <LearningV2AudioReplayPressableV1
            accessibilityLabel={copy.playPhrase}
            contentStyle={[sx.audioBtn, { backgroundColor: g.opaqueControl }]}
            onPress={onPlayFullPhraseAudio}
            reducedMotion={reducedMotion}
          >
            <Ionicons name="volume-high" size={18} color={g.text} />
          </LearningV2AudioReplayPressableV1>
        )}
      </View>

      <View style={[sx.variants, compact && { gap: 6, marginTop: 10 }]}>
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
              dimmed={resolved && phase !== "success" && verdict === "none" && !selected}
              nudgeToken={wrongNudge.responseId === option.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onPick(option.responseId)}
              bg={g.opaqueCard}
              selectedBg={g.selected}
              textColor={undefined}
            />
          );
        })}
      </View>

      {explanation ? <View style={sx.explainWrap}><Lv2Explain>{explanation}</Lv2Explain></View> : null}
    </View>
  );
}

export default ContextGapGrammarModeV1;

const styles = StyleSheet.create({
  root: {},
  // `.tlab` 15/600 --sec (D145 → 16).
  taskLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  // `.scene` 16/22 --sec, margin-top 10.
  scene: { fontSize: 16, lineHeight: 22, fontWeight: "400", marginTop: 10 },
  // `.thero` margin-top 18, gap 12.
  heroRow: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginTop: 18 },
  hero: { flex: 1, fontSize: 28, lineHeight: 44, minWidth: 200, fontWeight: "700", letterSpacing: -0.3 },
  gapSlot: {
    fontWeight: "700",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  gapSlotStandalone: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  audioBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  // `.stack.g13` margin-top 26.
  variants: { gap: 13, marginTop: 26 },
  explainWrap: { marginTop: 18 },
  variantWrap: { width: "100%" },
});
