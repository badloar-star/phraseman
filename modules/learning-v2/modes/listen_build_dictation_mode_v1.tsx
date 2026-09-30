/**
 * Активный режим 3/6 — Диктант. Источник вёрстки/анимаций:
 * docs/v2/mockups/05-listen-build.html.
 *
 * зачем: диктант отличается от phrase_builder ровно одним — вместо
 * написанного prompt ученик слышит фразу (play-кнопка с кольцом) и собирает
 * её из банка слов вслепую. Текст prompt в данных ЕСТЬ (используется для
 * hint/accessibility и это же значение обычно совпадает с озвученной
 * фразой), но на экране до успеха не показываем — только play-кнопка,
 * как в макете ("EN текст скрыт, пока не пройдёт первая попытка").
 *
 * Переиспользует ChipV1 паттерн из phrase_builder (тот же контракт токенов),
 * не импортирует компонент оттуда напрямую — независимая копия по правилу
 * "отдельный файл на режим", чтобы правка одного режима не билась о другой.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useLearningV2CompactPractice } from "../../../components/learning-v2/LearningV2PracticeViewport";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Chip, Lv2Cta, Lv2Explain, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import {
  LISTEN_BUILD_DICTATION_MOTION_V1 as MOTION,
  MODE_SPRING_MICRO_V1,
  MODE_SPRING_UI_V1,
} from "./mode_motion_tokens_v1";
import { learningV2ModeAudioCopyV1, learningV2ModeCheckLabelV1 } from "./mode_copy_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

function listenBuildTaskLabel(
  locale: LearningV2ModeCommonPropsV1["interfaceLocale"],
  phrase: boolean,
): string {
  const copy = {
    ru: phrase ? "Послушай и собери фразу" : "Послушай и собери слово",
    uk: phrase ? "Послухай і склади фразу" : "Послухай і склади слово",
    es: phrase ? "Escucha y forma la frase" : "Escucha y forma la palabra",
    "pt-BR": phrase ? "Ouça e monte a frase" : "Ouça e monte a palavra",
    vi: phrase ? "Nghe và ghép câu" : "Nghe và ghép từ",
    id: phrase ? "Dengarkan dan susun frasa" : "Dengarkan dan susun kata",
    tr: phrase ? "Dinle ve ifadeyi kur" : "Dinle ve sözcüğü kur",
    pl: phrase ? "Posłuchaj i ułóż zwrot" : "Posłuchaj i ułóż słowo",
    en: phrase ? "Listen and build the phrase" : "Listen and build the word",
  } as const;
  return copy[locale];
}
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_RADIUS = 47;
const RING_LEN = 2 * Math.PI * RING_RADIUS;

function DictationRingButtonV1({
  playing,
  reducedMotion,
  disabled,
  accessibilityLabel,
  onPress,
  accent,
  track,
  surface,
}: {
  readonly playing: boolean;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly accent: string;
  readonly track: string;
  readonly surface: string;
}) {
  const compact = useLearningV2CompactPractice();
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!playing) {
      progress.value = withTiming(0, { duration: reducedMotion ? 1 : 120 });
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: MOTION.ringFillMs, easing: Easing.linear });
  }, [playing, progress, reducedMotion]);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - progress.value),
  }));
  return (
    <View style={[styles.ringWrap, compact && { width: 80, height: 80 }]}>
      <Svg width={compact ? 80 : 128} height={compact ? 80 : 128} viewBox="0 0 104 104" style={StyleSheet.absoluteFill}>
        <Circle cx={52} cy={52} r={RING_RADIUS} stroke={track} strokeWidth={5} fill="none" />
        <AnimatedCircle
          cx={52}
          cy={52}
          r={RING_RADIUS}
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_LEN}
          animatedProps={ringProps}
          transform="rotate(-90 52 52)"
        />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={10}
        onPress={() => {
          void hapticLightImpact();
          onPress();
        }}
        style={[styles.ringBtn, compact && { width: 64, height: 64, borderRadius: 32 }, { backgroundColor: surface, opacity: disabled ? 0.45 : 1 }]}
      >
        <Ionicons name="play" size={40} color={accent} />
      </Pressable>
    </View>
  );
}

interface ChipProps {
  readonly label: string;
  readonly index: number;
  readonly verdict: "none" | "ok" | "bad";
  readonly nudgeToken: number;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly variant: "bank" | "answer";
}

function DictationChipV1({
  label,
  index,
  verdict,
  nudgeToken,
  reducedMotion,
  disabled,
  onPress,
  variant,
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
    enter.value = withDelay(index * MOTION.bankChipStaggerMs, withSpring(1, MODE_SPRING_UI_V1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (verdict === "none") return;
    if (reducedMotion) {
      verdictScale.value = 1;
      return;
    }
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
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * (variant === "bank" ? 16 : 10) },
      { translateX: nudge.value },
      { scale: verdictScale.value },
    ] as const,
  }));

  return (
    <Animated.View style={style}>
      {/* зачем (learning-v2.html, .chip): чип-слово стекла, см. LearningV2Glass. */}
      <Lv2Chip
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        verdict={verdict === "ok" ? "ok" : verdict === "bad" ? "bad" : "idle"}
      >
        {label}
      </Lv2Chip>
    </Animated.View>
  );
}

export function ListenBuildDictationModeV1(props: LearningV2ModeCommonPropsV1) {
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
    referenceAudioState,
  } = props;
  if (modePayload && modePayload.family !== "listen_build_dictation") {
    throw new Error("learning_v2_listen_build_payload_mismatch");
  }
  const audioCopy = learningV2ModeAudioCopyV1(interfaceLocale);

  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const wasPlayingRef = useRef(false);
  const playing = referenceAudioState === "playing";
  const loading = referenceAudioState === "loading";
  useEffect(() => {
    if (playing) {
      wasPlayingRef.current = true;
      return;
    }
    if (wasPlayingRef.current) setHasPlayedOnce(true);
    wasPlayingRef.current = false;
  }, [playing]);

  const handlePlay = () => {
    if (!onPlayFullPhraseAudio || playing || loading) return;
    onPlayFullPhraseAudio();
  };

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
    if (phase === "success" && !announcedRef.current) {
      announcedRef.current = true;
      void hapticSuccess();
      if (reducedMotion) AccessibilityInfo.announceForAccessibility?.(prompt);
    }
    if (phase === "needs_work") void hapticError();
    if (phase !== "success") announcedRef.current = false;
  }, [phase, reducedMotion, prompt]);

  return (
    <View style={[styles.root, compact && { gap: 6 }]}>
      <Text style={[styles.taskLabel, { color: g.secondary }]}>
        {listenBuildTaskLabel(
          interfaceLocale,
          (modePayload?.family === "listen_build_dictation"
            ? modePayload.hiddenTargetPhrase.trim().split(/\s+/u).length
            : 2) > 1,
        )}
      </Text>
      <DictationRingButtonV1
        playing={playing}
        reducedMotion={reducedMotion}
        disabled={!onPlayFullPhraseAudio || loading}
        accessibilityLabel={hasPlayedOnce ? audioCopy.replay : audioCopy.play}
        onPress={handlePlay}
        accent={g.text}
        track={g.opaqueControl}
        surface={g.opaqueCard}
      />
      <Text style={[styles.playSub, { color: g.secondary }]}>
        {!onPlayFullPhraseAudio
          ? audioCopy.unavailable
          : loading
            ? audioCopy.loading
            : playing
            ? audioCopy.playing
            : hasPlayedOnce
              ? audioCopy.replay
              : audioCopy.play}
      </Text>

      {/* Перевод/EN раскрывается только после успеха — до этого честный диктант. */}
      {phase === "success" && (
        <Text style={[styles.revealText, { color: g.text }]}>
          {modePayload?.family === "listen_build_dictation"
            ? modePayload.hiddenTargetPhrase
            : prompt}
        </Text>
      )}

      <View style={[styles.answerRow, compact && { minHeight: 48, paddingBottom: 4, gap: 6 }, { borderBottomColor: g.line }]}>
        {answerChips.map((chip, index) => (
          <DictationChipV1
            key={`${chip.responseId}-${index}`}
            label={chip.text}
            index={index}
            variant="answer"
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
        ))}
      </View>

      <View style={[styles.bank, compact && { gap: 6 }]}>
        {options
          .filter((option) => !usedIds.has(option.responseId))
          .map((option, index) => (
            <DictationChipV1
              key={option.responseId}
              label={option.text}
              index={index}
              variant="bank"
              verdict="none"
              nudgeToken={0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onAppendToken(option.responseId)}
            />
          ))}
      </View>

      {explanation ? <Lv2Explain style={styles.feedbackLane}>{explanation}</Lv2Explain> : null}

      <Lv2Cta
        disabled={!canSubmit || resolved || phase === "processing"}
        onPress={onSubmit}
        style={styles.submit}
      >
        {learningV2ModeCheckLabelV1(interfaceLocale)}
      </Lv2Cta>
    </View>
  );
}

export default ListenBuildDictationModeV1;

const styles = StyleSheet.create({
  root: { gap: 14, alignItems: "center" },
  taskLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  ringWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
  ringBtn: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  playSub: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  revealText: { fontSize: 24, lineHeight: 30, fontWeight: "700", textAlign: "center", letterSpacing: -0.3 },
  answerRow: {
    minHeight: 64,
    width: "100%",
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 10,
  },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start", width: "100%" },
  feedbackLane: { width: "100%" },
  submit: { width: "100%" },
});
