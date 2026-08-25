/**
 * Режим 3/7 — Пары звуков. Источник вёрстки/анимаций:
 * docs/v2/mockups/04-sound-contrast.html.
 *
 * зачем: минимальные пары (ship/sheep) нуждаются в двух крупных типографских
 * карточках-словах, а не в списке строк — учить различать звук, а не читать.
 *
 * Данные: макет ожидает `{word, ipa}` на карточку. Сегодняшний контент даёт
 * только `responseOptions[].text` — используем text как отображаемое слово
 * и НЕ рисуем IPA (полей на это в контенте нет). Это ожидаемый пробел для
 * этапа 3 (аудит контента): sound_contrast без IPA хуже оригинального макета,
 * но честнее, чем выдумывать транскрипцию на клиенте. Раунд = single_choice:
 * ровно как приходит из player'а (2 варианта в responseOptions).
 */

import React, { useEffect, useRef } from "react";
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
import { SOUND_CONTRAST_MOTION_V1 as MOTION } from "./mode_motion_tokens_v1";

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

function SoundContrastCardV1({
  label,
  selected,
  verdict,
  dimmed,
  nudgeToken,
  reducedMotion,
  disabled,
  onPress,
  onListen,
  bg,
  selectedBg,
  textColor,
  accent,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly verdict: "none" | "ok" | "bad";
  readonly dimmed: boolean;
  readonly nudgeToken: number;
  readonly reducedMotion: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly onListen: () => void;
  readonly bg: string;
  readonly selectedBg: string;
  readonly textColor: string;
  readonly accent: string;
}) {
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    lift.value = withTiming(selected ? 1 : 0, {
      duration: reducedMotion ? 1 : MOTION.cardSelectMs,
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
    <Animated.View style={[styles.cardWrap, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPressIn={() => {
          if (reducedMotion) return;
          press.value = withTiming(0.97, { duration: 80, easing: EASE });
        }}
        onPressOut={() => {
          if (reducedMotion) return;
          press.value = withTiming(1, { duration: 80, easing: EASE });
        }}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor:
              verdict === "ok" ? undefined : verdict === "bad" ? undefined : selected ? selectedBg : bg,
          },
        ]}
      >
        <Text style={[styles.cardWord, { color: textColor }]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Слушать ${label}`}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            void hapticLightImpact();
            onListen();
          }}
          style={[styles.listenBtn, { backgroundColor: bg }]}
        >
          <Text style={{ color: accent, fontSize: 13 }}>♪</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export function SoundContrastModeV1(props: LearningV2ModeCommonPropsV1) {
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
    onPlaySelectableAudio,
    phase,
  } = props;

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
      <Text style={[styles.taskLabel, { color: t.textMuted }]}>Различи звуки</Text>
      <Text style={[styles.hero, { color: t.textPrimary }]}>{prompt}</Text>

      <View style={styles.pairRow}>
        {options.map((option) => {
          const selected = selectedChoiceId === option.responseId;
          const verdict: "none" | "ok" | "bad" =
            phase === "success" && selected
              ? "ok"
              : phase === "needs_work" && wrongNudge.responseId === option.responseId
                ? "bad"
                : "none";
          return (
            <SoundContrastCardV1
              key={option.responseId}
              label={option.text}
              selected={selected}
              verdict={verdict}
              dimmed={hasSelection && !selected}
              nudgeToken={wrongNudge.responseId === option.responseId ? wrongNudge.token : 0}
              reducedMotion={reducedMotion}
              disabled={resolved || phase === "processing"}
              onPress={() => onPick(option.responseId)}
              onListen={() => onPlaySelectableAudio(option.responseId)}
              bg={t.bgCard}
              selectedBg={t.accentBg}
              accent={t.accent}
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

export default SoundContrastModeV1;

const styles = StyleSheet.create({
  root: { gap: 14, alignItems: "center" },
  taskLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  hero: { fontSize: 20, lineHeight: 26, fontWeight: "800", textAlign: "center" },
  pairRow: { flexDirection: "row", gap: 12, width: "100%" },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 10,
  },
  cardWord: { fontSize: 27, fontWeight: "800" },
  listenBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackLane: { width: "100%", borderRadius: 18, padding: 12 },
  feedbackText: { fontSize: 14.5, fontWeight: "600", lineHeight: 19 },
});
