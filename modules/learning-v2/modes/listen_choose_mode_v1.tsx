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
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
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
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import { useScaledTextStyles } from "../../../hooks/useLineScale";
import { useRuntimeActive } from "../../../hooks/use_runtime_active";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { learningV2ModeAudioCopyV1 } from "./mode_copy_v1";
import { LISTEN_CHOOSE_MOTION_V1 as MOTION, learningV2RingFillMsForPhraseV1 } from "./mode_motion_tokens_v1";
import { learningV2ListenChooseOptionLabelV1 } from "./listen_choose_option_label_v1";
import { LearningV2AudioReplayPressableV1 } from "./audio_replay_pressable_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// `.playb` 128 + svg.rg viewBox 128, r 60, stroke 5: кольцо лежит по краю самой кнопки.
const RING_VIEW = 128;
const RING_RADIUS = 60;
const RING_LEN = 2 * Math.PI * RING_RADIUS;

function ListenChoosePlayButtonV1({
  playing,
  fillMs,
  hasPlayedOnce,
  reducedMotion,
  disabled,
  accessibilityLabel,
  onPress,
  accent,
  surface,
  track,
}: {
  readonly playing: boolean;
  readonly fillMs: number;
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
        duration: fillMs,
        easing: Easing.linear,
      });
    } else {
      // зачем (learning-v2.html lc-3…5, ring: 1): прослушанная фраза — полное кольцо, а не сброс в ноль.
      progress.value = withTiming(hasPlayedOnce ? 1 : 0, { duration: reducedMotion ? 1 : 120 });
    }
  }, [fillMs, hasPlayedOnce, playing, reducedMotion, progress]);

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
      <Animated.View style={btnStyle}>
        <LearningV2AudioReplayPressableV1
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled }}
          contentStyle={[styles.playBtn, compact && { width: 80, height: 80, borderRadius: 40 }, { backgroundColor: surface, opacity: disabled ? 0.45 : 1 }]}
          disabled={disabled}
          onPress={onPress}
          reducedMotion={reducedMotion}
        >
          {/* зачем (владелец 19.10): на всех заданиях большая кнопка — динамик и всегда нажимается для повтора озвучки */}
          <Ionicons name="volume-high" size={44} color={accent} />
        </LearningV2AudioReplayPressableV1>
      </Animated.View>
      {/* Кольцо поверх круга кнопки (svg.rg в макете), цвет #E9E9EB — текст темы; дорожка --track. */}
      {/* зачем (владелец 19.10 «большая круглая кнопка не нажимается»): на iOS корневой Svg игнорирует pointerEvents="none" и кольцо поверх кнопки съедало нажатие — оборачиваем в View, который точно пропускает касания */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg pointerEvents="none" width={compact ? 80 : 128} height={compact ? 80 : 128} viewBox={`0 0 ${RING_VIEW} ${RING_VIEW}`} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_VIEW / 2}
          cy={RING_VIEW / 2}
          r={RING_RADIUS}
          stroke={track}
          strokeWidth={5}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_VIEW / 2}
          cy={RING_VIEW / 2}
          r={RING_RADIUS}
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_LEN}
          animatedProps={ringProps}
          transform={`rotate(-90 ${RING_VIEW / 2} ${RING_VIEW / 2})`}
        />
      </Svg>
      </View>
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
    opacity: 1,
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
        style={dimmed ? { opacity: 0.45 } : undefined}
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
    if (!onPlayFullPhraseAudio) return;
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

  const sx = useScaledTextStyles(styles);
  // зачем (learning-v2.html lc-3/lc-5): после верного ответа или разбора фраза раскрывается текстом под кнопкой.
  const revealText = resolved && modePayload?.family === "listen_choose" ? modePayload.referenceAudio?.transcript ?? null : null;

  return (
    // зачем (сверка с learning-v2.html lc, 05.10): заголовок слева 600; кнопка 128 по центру в 26; подпись 14; варианты в 26
    // через 13; затемнение .45 только у вариантов, не участвовавших в разборе.
    <View style={sx.root}>
      <Text style={[sx.taskLabel, { color: g.secondary }]}>{prompt}</Text>
      <View style={[sx.playRow, compact && { marginTop: 8 }]}>

      <ListenChoosePlayButtonV1
        playing={playing}
        fillMs={learningV2RingFillMsForPhraseV1(modePayload?.family === "listen_choose" ? modePayload.referenceAudio?.transcript : null)}
        hasPlayedOnce={hasPlayedOnce}
        reducedMotion={reducedMotion}
        disabled={!onPlayFullPhraseAudio}
        accessibilityLabel={hasPlayedOnce ? audioCopy.replay : audioCopy.play}
        onPress={handlePlay}
        accent={g.text}
        correct={g.good}
        surface={g.opaqueCard}
        track={g.opaqueControl}
      />
      </View>
      <Text style={[sx.playSub, { color: g.secondary }, compact && { marginTop: 6 }]}>
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
      {revealText ? (
        <Text testID="learning-v2-listen-choose-reveal" style={[sx.reveal, { color: g.text }]}>{revealText}</Text>
      ) : null}

      <View style={[sx.options, compact && { marginTop: 10, gap: 6, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }]}>
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
              dimmed={resolved && phase !== "success" && verdict === "none" && !selected}
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

      {explanation ? <Lv2Explain style={sx.feedbackLane}>{explanation}</Lv2Explain> : null}
    </View>
  );
}

export default ListenChooseModeV1;

const styles = StyleSheet.create({
  root: {},
  // `.tlab` 15/600 --sec, слева (D145 → 16).
  taskLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  playRow: { alignItems: "center", marginTop: 26 },
  playWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  // `.psub` 15/600 по центру, margin-top 14.
  playSub: { fontSize: 16, lineHeight: 22, fontWeight: "600", textAlign: "center", marginTop: 14 },
  // `.reveal` 24/700 по центру, margin-top 18.
  reveal: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, textAlign: "center", marginTop: 18 },
  // `.stack.g13` margin-top 26.
  options: { width: "100%", gap: 13, marginTop: 26 },
  feedbackLane: { width: "100%", marginTop: 18 },
});
