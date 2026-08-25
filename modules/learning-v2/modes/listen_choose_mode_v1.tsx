/**
 * Режим 2/7 — Выбор на слух. Источник вёрстки/анимаций:
 * docs/v2/mockups/03-listen-choose.html.
 *
 * зачем: раньше single_choice для listen_choose/sound_contrast рендерился
 * идентично любому другому single_choice — список текстовых строк без
 * play-кнопки с прогресс-кольцом и без обязательного "сначала прослушай".
 * Владелец одобрил отдельный экран: play-кнопка с кольцом по центру, затем
 * варианты строками, "Проверить" заблокирована до первого прослушивания.
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
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../../../components/ThemeContext";
import { hapticError, hapticLightImpact, hapticSuccess } from "../../../hooks/use-haptics";
import type { LearningV2ModeCommonPropsV1 } from "./mode_contract_v1";
import { LISTEN_CHOOSE_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_RADIUS = 54;
const RING_LEN = 2 * Math.PI * RING_RADIUS;

function ListenChoosePlayButtonV1({
  playing,
  hasPlayedOnce,
  reducedMotion,
  onPress,
  accent,
  correct,
  surface,
  track,
}: {
  readonly playing: boolean;
  readonly hasPlayedOnce: boolean;
  readonly reducedMotion: boolean;
  readonly onPress: () => void;
  readonly accent: string;
  readonly correct: string;
  readonly surface: string;
  readonly track: string;
}) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (playing) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: MOTION.ringFillMs,
        easing: Easing.linear,
      });
      if (!reducedMotion) {
        pulse.value = withRepeat(
          withSequence(
            withTiming(1.03, { duration: MOTION.playPulseMs / 2, easing: EASE }),
            withTiming(1, { duration: MOTION.playPulseMs / 2, easing: EASE }),
          ),
          -1,
        );
      }
    } else {
      pulse.value = withTiming(1, { duration: 160, easing: EASE });
    }
  }, [playing, reducedMotion, progress, pulse]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - progress.value),
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.playWrap}>
      <Svg width={116} height={116} viewBox="0 0 116 116" style={StyleSheet.absoluteFill}>
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
          accessibilityLabel={hasPlayedOnce ? "Прослушать ещё раз" : "Прослушать фразу"}
          hitSlop={10}
          onPress={() => {
            void hapticLightImpact();
            onPress();
          }}
          style={[styles.playBtn, { backgroundColor: surface }]}
        >
          <Text style={[styles.playGlyph, { color: accent }]}>
            {playing ? "▶" : "▶"}
          </Text>
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
      { scale: press.value },
    ] as const,
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (reducedMotion) return;
          press.value = withTiming(0.98, { duration: 80, easing: EASE });
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          press.value = withTiming(1, { duration: 80, easing: EASE });
        }}
        onPress={onPress}
        style={[
          styles.option,
          {
            backgroundColor:
              verdict === "ok" ? undefined : verdict === "bad" ? undefined : selected ? selectedBg : bg,
          },
        ]}
      >
        <Text style={[styles.optionText, { color: textColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ListenChooseModeV1(props: LearningV2ModeCommonPropsV1) {
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

  const [playing, setPlaying] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
  }, []);

  const handlePlay = () => {
    if (!onPlayFullPhraseAudio || playing) return;
    setPlaying(true);
    onPlayFullPhraseAudio();
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    // зачем: у полного аудио-плеера нет колбэка "закончилось" в этом
    // контракте (onPlayFullPhraseAudio — fire-and-forget по дизайну
    // player'а), поэтому кольцо/пульс гасим по истечении заявленной
    // длительности макета — тот же приём, что и веб-витрина использует как
    // fallback при отсутствии событий реального <audio>.
    playTimerRef.current = setTimeout(() => {
      setPlaying(false);
      setHasPlayedOnce(true);
    }, MOTION.ringFillMs);
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
    <View style={styles.root}>
      <Text style={[styles.taskLabel, { color: t.textMuted }]}>Что ты слышишь?</Text>

      <ListenChoosePlayButtonV1
        playing={playing}
        hasPlayedOnce={hasPlayedOnce}
        reducedMotion={reducedMotion}
        onPress={handlePlay}
        accent={t.accent}
        correct={t.correct}
        surface={t.bgSurface2}
        track={t.bgSurface2}
      />
      <Text style={[styles.playSub, { color: t.textMuted }]}>
        {playing ? "Звучит…" : hasPlayedOnce ? "Прослушать ещё раз" : "Нажми, чтобы послушать"}
      </Text>

      <View style={styles.options}>
        {options.map((option) => {
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
              label={option.text}
              selected={selected}
              verdict={verdict}
              dimmed={hasSelection && !selected}
              nudgeToken={wrongNudge.responseId === option.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || !hasPlayedOnce || phase === "processing"}
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
          <Text style={[styles.feedbackText, { color: t.textPrimary }]}>
            {explanation}
          </Text>
        </View>
      )}
    </View>
  );
}

export default ListenChooseModeV1;

const styles = StyleSheet.create({
  root: { gap: 14, alignItems: "center" },
  taskLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  playWrap: { width: 116, height: 116, alignItems: "center", justifyContent: "center" },
  playBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: { fontSize: 28, fontWeight: "700" },
  playSub: { fontSize: 14, fontWeight: "700" },
  options: { width: "100%", gap: 10 },
  option: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  optionText: { fontSize: 17, fontWeight: "700" },
  feedbackLane: { width: "100%", borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
