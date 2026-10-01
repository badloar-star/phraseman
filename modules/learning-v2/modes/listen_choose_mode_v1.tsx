/**
 * Активный режим 2/6 — Выбор на слух. Источник вёрстки/анимаций:
 * docs/v2/mockups/03-listen-choose.html.
 *
 * зачем: раньше single_choice для listen_choose/sound_contrast рендерился
 * идентично любому другому single_choice — список текстовых строк без
 * play-кнопки с прогресс-кольцом и без обязательного "сначала прослушай".
 * Владелец одобрил отдельный экран: play-кнопка с кольцом по центру, затем
 * варианты строками. Выбор остаётся доступен сразу: сбой или задержка аудио
 * не должны превращать упражнение в тупик.
 *
 * Данные: контент даёт `prompt` + `responseOptions[]`. Аудио уже приходит
 * через onPlayFullPhraseAudio (полная фраза) — используем его и как "play"
 * в центре экрана (тот же провайдер, что и remove-icon-button в старой
 * карточке), отдельного medленного файла (_slow) на сегодняшнем контракте
 * нет, поэтому кнопка "Медленнее" не рендерится (нечем воспроизводить) —
 * пробел зафиксирован для этапа 3 (аудит контента), а не выдуман здесь.
 */

import React, { useEffect, useRef, useState } from "react";
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
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Explain, Lv2Option, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeAudioCopyV1 } from "./mode_copy_v1";
import { LISTEN_CHOOSE_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";
import { learningV2ListenChooseOptionLabelV1 } from "./listen_choose_option_label_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_RADIUS = 54;
const RING_LEN = 2 * Math.PI * RING_RADIUS;

function ListenChoosePlayButtonV1({
  playing,
  hasPlayedOnce,
  reducedMotion,
  disabled,
  accessibilityLabel,
  onPress,
  accent,
  correct,
  surface,
  track,
}: {
  readonly playing: boolean;
  readonly hasPlayedOnce: boolean;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly accent: string;
  readonly correct: string;
  readonly surface: string;
  readonly track: string;
}) {
  const compact = useLearningV2CompactPractice();
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);
  // зачем (аудит нагрева 2026-08-26): пульс play-кнопки — withRepeat(-1), и он
  // был привязан ТОЛЬКО к playing. Аудио этого проекта не глушится по AppState,
  // поэтому при сворачивании приложения playing оставался true и цикл грел
  // UI-поток в кармане. Performance Bible требует фокус+AppState для вечных
  // анимаций — берём общий useRuntimeActive (фокус && активное приложение).
  const runtimeActive = useRuntimeActive();

  // Кольцо прогресса ведёт ТОЛЬКО playing: это конечная анимация длиной
  // ringFillMs, она отражает ход звука. Гардить её по фокусу нельзя — вернувшись
  // из фона, пользователь увидел бы перезапуск кольца с нуля под звук,
  // играющий с середины.
  useEffect(() => {
    if (playing) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: MOTION.ringFillMs,
        easing: Easing.linear,
      });
    } else {
      progress.value = withTiming(0, { duration: reducedMotion ? 1 : 120 });
    }
  }, [playing, reducedMotion, progress]);

  // Пульс — единственная ВЕЧНАЯ анимация здесь, только она подчиняется
  // runtimeActive и гаснет при уходе с экрана либо сворачивании приложения.
  useEffect(() => {
    if (playing && runtimeActive && !reducedMotion) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: MOTION.playPulseMs / 2, easing: EASE }),
          withTiming(1, { duration: MOTION.playPulseMs / 2, easing: EASE }),
        ),
        -1,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: reducedMotion ? 1 : 160, easing: EASE });
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [playing, runtimeActive, reducedMotion, pulse]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - progress.value),
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={[styles.playWrap, compact && { width: 80, height: 80 }]}>
      <Svg width={compact ? 80 : 128} height={compact ? 80 : 128} viewBox="0 0 116 116" style={StyleSheet.absoluteFill}>
        <Circle
          cx={58}
          cy={58}
          r={RING_RADIUS}
          stroke={track}
          strokeWidth={5}
          fill="none"
        />
        <AnimatedCircle
          cx={58}
          cy={58}
          r={RING_RADIUS}
          stroke={playing ? accent : correct}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_LEN}
          animatedProps={ringProps}
          transform={`rotate(-90 58 58)`}
        />
      </Svg>
      <Animated.View style={btnStyle}>
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
          style={[styles.playBtn, compact && { width: 64, height: 64, borderRadius: 32 }, { backgroundColor: surface, opacity: disabled ? 0.45 : 1 }]}
        >
          <Ionicons name={playing ? "volume-high" : "play"} size={44} color={accent} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ListenChooseOptionV1({
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
      duration: reducedMotion ? 1 : MOTION.optionSelectMs,
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
    ] as const,
  }));

  return (
    <Animated.View style={[style, compact && { width: "48%" }]}>
      {/* зачем (learning-v2.html, .opt): плита-вариант стекла — от 58 dp, слово 17/600 по центру,
          отметка верно/неверно справа; «затемнённый» невыбранный вариант остаётся нажимаемым. */}
      <Lv2Option
        compact={compact}
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        selected={selected}
        verdict={verdict === "ok" ? "ok" : verdict === "bad" ? "bad" : "idle"}
        style={dimmed ? { opacity: 0.6 } : undefined}
        textStyle={textColor ? { color: textColor } : undefined}
        label={label}
      />
    </Animated.View>
  );
}

export function ListenChooseModeV1(props: LearningV2ModeCommonPropsV1) {
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
    referenceAudioState,
    interfaceLocale,
  } = props;
  if (modePayload && modePayload.family !== "listen_choose") {
    throw new Error("learning_v2_listen_choose_payload_mismatch");
  }

  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const audioCopy = learningV2ModeAudioCopyV1(interfaceLocale);
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
    <View style={[styles.root, compact && { gap: 6 }]}>
      <Text style={[styles.taskLabel, { color: g.secondary }]}>{prompt}</Text>

      <ListenChoosePlayButtonV1
        playing={playing}
        hasPlayedOnce={hasPlayedOnce}
        reducedMotion={reducedMotion}
        disabled={!onPlayFullPhraseAudio || loading}
        accessibilityLabel={hasPlayedOnce ? audioCopy.replay : audioCopy.play}
        onPress={handlePlay}
        accent={g.text}
        correct={g.good}
        surface={g.opaqueCard}
        track={g.opaqueControl}
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

      <View style={[styles.options, compact && { gap: 6, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }]}>
        {options.map((option) => {
          const authoredChoice = modePayload?.family === "listen_choose"
            ? modePayload.localizedMeaningChoices.find(
                (choice) => choice.responseId === option.responseId,
              )
            : null;
          const targetLanguageText = authoredChoice?.meaningByLocale === null;
          const label = learningV2ListenChooseOptionLabelV1({
            fallbackText: option.text,
            interfaceLocale,
            meaningByLocale: authoredChoice?.meaningByLocale ?? null,
          });
          const selected = selectedChoiceId === option.responseId;
          const verdict: "none" | "ok" | "bad" =
            phase === "success" && selected
              ? "ok"
              : phase === "needs_work" && wrongNudge.responseId === option.responseId
                ? "bad"
                : "none";
          return (
            <ListenChooseOptionV1
              key={option.responseId}
              label={label}
              selected={selected}
              verdict={verdict}
              dimmed={hasSelection && !selected}
              nudgeToken={wrongNudge.responseId === option.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onPick(option.responseId)}
              bg={g.opaqueCard}
              selectedBg={g.selected}
              textColor={targetLanguageText && verdict === "none" ? g.text : undefined}
            />
          );
        })}
      </View>

      {explanation ? <Lv2Explain style={styles.feedbackLane}>{explanation}</Lv2Explain> : null}
    </View>
  );
}

export default ListenChooseModeV1;

const styles = StyleSheet.create({
  root: { gap: 14, alignItems: "center" },
  taskLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  playWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  playSub: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  options: { width: "100%", gap: 10 },
  feedbackLane: { width: "100%" },
});
