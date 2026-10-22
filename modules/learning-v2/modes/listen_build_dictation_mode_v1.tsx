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
import { AccessibilityInfo, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { LearningV2AudioReplayPressableV1 } from "./audio_replay_pressable_v1";
import { useScaledTextStyles } from "../../../hooks/useLineScale";
import { learningV2SessionCopy } from "../../../app/learning_v2_session_copy";

import { useLearningV2CompactPractice } from "../../../components/learning-v2/LearningV2PracticeViewport";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Lv2Chip, Lv2Explain, useLv2Glass } from "../../../components/learning-v2/LearningV2Glass";
import { hapticError, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import {
  LISTEN_BUILD_DICTATION_MOTION_V1 as MOTION,
  MODE_SPRING_MICRO_V1,
  MODE_SPRING_UI_V1,
  learningV2RingFillMsForPhraseV1,
} from "./mode_motion_tokens_v1";
import { learningV2ModeAudioCopyV1, learningV2ModeCheckLabelV1 } from "./mode_copy_v1";
import type { Lang } from "../../../constants/i18n";
import { lv2TaskAnswerLineShadow, lv2TaskTokens } from "../../../components/learning-v2/learning_v2_task_theme_tokens";
import { LearningV2TaskCta, LearningV2TaskLead, useLearningV2TaskParts } from "../../../components/learning-v2/LearningV2TaskBody";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// `.play.s` в «Предлагаем»: кнопка 96, значок 36 (вместо 128); svg.rg viewBox 128 масштабируется. Прежде: `.playb` 128 + svg.rg viewBox 128, r 60, stroke 5 — кольцо по краю самой кнопки (как в «Слушай и выбирай»).
const RING_VIEW = 128;
const PLAY_SIZE = 96;
const PLAY_ICON = 36;
const RING_RADIUS = 60;
const RING_LEN = 2 * Math.PI * RING_RADIUS;

function DictationRingButtonV1({
  playing,
  fillMs,
  speechProgress,
  hasPlayedOnce,
  reducedMotion,
  disabled,
  accessibilityLabel,
  onPress,
  accent,
  track,
  surface,
}: {
  readonly playing: boolean;
  readonly fillMs: number;
  /** Кольцо по настоящей речи (плеер); null — по оценке fillMs. */
  readonly speechProgress: SharedValue<number> | null;
  readonly hasPlayedOnce: boolean;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly accent: string;
  readonly track: string;
  readonly surface: string;
}) {
  const compact = useLearningV2CompactPractice();
  const plateShadow = lv2TaskTokens(useLv2Glass()).taskPlateShadow;
  const progress = useSharedValue(0);
  useEffect(() => {
    // зачем (владелец 22.10, «строго по длине аудио»): есть ход настоящей речи — кольцо ведёт он, оценка длины не нужна
    if (speechProgress) return;
    if (!playing) {
      // зачем (learning-v2.html ld, ring: 1): прослушанная фраза — полное кольцо, не сброс в ноль.
      progress.value = withTiming(hasPlayedOnce ? 1 : 0, { duration: reducedMotion ? 1 : 120 });
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: fillMs, easing: Easing.linear });
  }, [fillMs, hasPlayedOnce, playing, progress, reducedMotion, speechProgress]);
  // зачем (кольцо по речи): ход речи живёт в плеере и переживает смену задания — эта кнопка показывает его только с
  // первого своего проигрыша, иначе новое задание на миг показало бы полное кольцо прошлой фразы.
  const heard = useSharedValue(0);
  useEffect(() => {
    if (playing) heard.value = 1;
  }, [heard, playing]);
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - (speechProgress ? (heard.value > 0 ? speechProgress.value : 0) : progress.value)),
  }));
  return (
    <View style={[styles.ringWrap, compact && { width: 80, height: 80 }]}>
      <LearningV2AudioReplayPressableV1
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        contentStyle={[styles.ringBtn, compact && { width: 80, height: 80, borderRadius: 40 }, { backgroundColor: surface, boxShadow: plateShadow as ViewStyle["boxShadow"], opacity: disabled ? 0.45 : 1 }]}
        disabled={disabled}
        onPress={onPress}
        reducedMotion={reducedMotion}
      >
        {/* зачем (владелец 19.10): на всех заданиях большая кнопка — динамик и всегда нажимается для повтора озвучки */}
          <Ionicons name="volume-high" size={PLAY_ICON} color={accent} />
      </LearningV2AudioReplayPressableV1>
      {/* зачем (владелец 19.10 «большая круглая кнопка не нажимается»): на iOS корневой Svg игнорирует pointerEvents="none" и кольцо поверх кнопки съедало нажатие — оборачиваем в View, который точно пропускает касания */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg pointerEvents="none" width={compact ? 80 : PLAY_SIZE} height={compact ? 80 : PLAY_SIZE} viewBox={`0 0 ${RING_VIEW} ${RING_VIEW}`} style={StyleSheet.absoluteFill}>
        <Circle cx={RING_VIEW / 2} cy={RING_VIEW / 2} r={RING_RADIUS} stroke={track} strokeWidth={5} fill="none" />
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

interface ChipProps {
  readonly label: string;
  readonly index: number;
  readonly verdict: "none" | "ok" | "bad";
  readonly nudgeToken: number;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly variant: "bank" | "answer";
  /** `.chip.ghost`: взятое слово остаётся тенью .22 на своём месте в банке. */
  readonly ghost?: boolean;
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
  ghost = false,
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
    opacity: ghost ? 0.22 : enter.value,
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
        disabled={disabled || ghost}
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
    if (!onPlayFullPhraseAudio) return;
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

  const sx = useScaledTextStyles(styles);
  // зачем (колонка «Предлагаем»): части строки задания — по правилам Learning V2 (task_prompt_parts_v1); ситуация теперь видна
  const parts = useLearningV2TaskParts({ family: props.family, prompt, interfaceLocale, modePayload });
  return (
    // зачем (сверка с learning-v2.html ld, 05.10): как «Слушай и выбирай» + «Собери фразу» — заголовок слева 600,
    // кнопка 128 в 26, подпись 14, фраза 18, строка ответа 22 с подсказкой, банк 22 с тенями, разбор 18, «Проверить» 22.
    <View style={sx.root}>
      <LearningV2TaskLead lang={interfaceLocale as Lang} parts={parts} />
      <View style={[sx.playRow, compact && { marginTop: 8 }]}>
      <DictationRingButtonV1
        playing={playing}
        fillMs={learningV2RingFillMsForPhraseV1(modePayload?.family === "listen_build_dictation" ? modePayload.hiddenTargetPhrase : null)}
        speechProgress={props.referenceSpeechProgress ?? null}
        hasPlayedOnce={hasPlayedOnce}
        reducedMotion={reducedMotion}
        disabled={!onPlayFullPhraseAudio}
        accessibilityLabel={hasPlayedOnce ? audioCopy.replay : audioCopy.play}
        onPress={handlePlay}
        accent={g.text}
        track={g.opaqueControl}
        surface={g.opaqueCard}
      />
      </View>

      {/* Фраза раскрывается после успеха или разбора (learning-v2.html ld-2/ld-4) — до этого честный диктант. */}
      {(phase === "success" || resolved) && (
        <Text style={[sx.revealText, { color: g.text }]}>
          {modePayload?.family === "listen_build_dictation"
            ? modePayload.hiddenTargetPhrase
            : prompt}
        </Text>
      )}

      <View style={[sx.answerRow, compact && { minHeight: 48, marginTop: 10, paddingTop: 4, paddingBottom: 4, gap: 6 }, { boxShadow: lv2TaskAnswerLineShadow(g) as ViewStyle["boxShadow"] }]}>
        {answerChips.length === 0 ? (
          <Text style={[sx.placeholder, { color: g.mutedText }]}>
            {learningV2SessionCopy(interfaceLocale as Parameters<typeof learningV2SessionCopy>[0]).tapWords}
          </Text>
        ) : null}
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

      <View style={[sx.bank, compact && { gap: 6, marginTop: 10 }]}>
        {options
          .map((option, index) => (
            <DictationChipV1
              key={option.responseId}
              label={option.text}
              index={index}
              variant="bank"
              ghost={usedIds.has(option.responseId)}
              verdict="none"
              nudgeToken={0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onAppendToken(option.responseId)}
            />
          ))}
      </View>

      {explanation ? <Lv2Explain style={sx.feedbackLane}>{explanation}</Lv2Explain> : null}

      <LearningV2TaskCta
        disabled={!canSubmit || resolved || phase === "processing"}
        onPress={onSubmit}
        style={[sx.submit, compact && { marginTop: 10 }]}
      >
        {learningV2ModeCheckLabelV1(interfaceLocale)}
      </LearningV2TaskCta>
    </View>
  );
}

export default ListenBuildDictationModeV1;

const styles = StyleSheet.create({
  root: {},
  playRow: { alignItems: "center", marginTop: 18 },
  ringWrap: { width: PLAY_SIZE, height: PLAY_SIZE, alignItems: "center", justifyContent: "center" },
  ringBtn: { width: PLAY_SIZE, height: PLAY_SIZE, borderRadius: PLAY_SIZE / 2, alignItems: "center", justifyContent: "center" },
  revealText: { fontSize: 24, lineHeight: 30, fontWeight: "700", textAlign: "center", letterSpacing: -0.3, marginTop: 18 },
  answerRow: {
    minHeight: 64,
    width: "100%",
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
  },
  placeholder: { fontSize: 16, lineHeight: 21 },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-start", width: "100%", marginTop: 22 },
  feedbackLane: { width: "100%", marginTop: 18 },
  submit: { width: "100%", marginTop: 22 },
});
