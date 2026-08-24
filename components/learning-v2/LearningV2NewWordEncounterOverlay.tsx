import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";

import { learningV2NewWordEncounterCopy } from "../../app/learning_v2_new_word_encounter_copy";
import type {
  LearningV2NewWordAudioStateV1,
  LearningV2NewWordSaveStateV1,
} from "../../app/learning_v2_new_word_encounter_copy";
import { useTheme } from "../ThemeContext";
import { LinearGradient } from "../SafeLinearGradient";
import type { LearningV2InterfaceLocale } from "../../modules/learning-v2/content/generator_course_contract";
import type { LearningV2CourseSessionNewWordEncounterV1 } from "../../modules/learning-v2/runtime/course_session_client_children_v1";

export interface LearningV2NewWordEncounterOverlayProps {
  encounter: LearningV2CourseSessionNewWordEncounterV1;
  locale: LearningV2InterfaceLocale;
  position: number;
  total: number;
  saveState: LearningV2NewWordSaveStateV1;
  audioState: LearningV2NewWordAudioStateV1;
  onContinue: () => void;
  onToggleSave: () => void;
  onPlayAudio: () => void;
}

export default function LearningV2NewWordEncounterOverlay({
  encounter,
  locale,
  position,
  total,
  saveState,
  audioState,
  onContinue,
  onToggleSave,
  onPlayAudio,
}: LearningV2NewWordEncounterOverlayProps) {
  const { theme: t } = useTheme();
  const reduceMotion = useReducedMotion();
  const word = encounter.save.targetText;
  const copy = useMemo(
    () =>
      learningV2NewWordEncounterCopy({
        locale,
        word,
        position,
        total,
        saveState,
        audioState,
      }),
    [audioState, locale, position, saveState, total, word],
  );
  const entering = reduceMotion
    ? FadeIn.duration(160)
    : encounter.motionVariant === "lesson_hero_b"
      ? FadeInDown.springify().damping(22).stiffness(150)
      : FadeInUp.springify().damping(22).stiffness(150);
  const saved = saveState === "saved";
  const saveDisabled = saveState === "saving";
  const audioDisabled =
    audioState === "unavailable" || audioState === "autoplay_pending";

  return (
    <View
      testID="learning-v2-new-word-overlay"
      style={styles.overlay}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <View
        pointerEvents="none"
        style={[styles.backdrop, { backgroundColor: t.shadowDark }]}
      />
      <Animated.View
        entering={entering}
        style={[
          styles.card,
          {
            backgroundColor: t.bgCard,
            borderColor: t.borderLight,
            shadowColor: t.shadowDark,
          },
        ]}
      >
        {!reduceMotion ? (
          <LinearGradient
            testID="learning-v2-new-word-holo-sweep"
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            colors={[t.bgSurface2, t.accentBg, t.bgSurface2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.holo}
          />
        ) : null}

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View
              style={[styles.labelPill, { backgroundColor: t.accentBg }]}
              accessibilityRole="text"
            >
              <Text style={[styles.label, { color: t.accent }]}>
                {copy.label}
              </Text>
            </View>
            <Text style={[styles.counter, { color: t.textMuted }]}>
              {copy.counter}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.saveLabel}
              accessibilityHint={copy.saveLabel}
              accessibilityState={{ disabled: saveDisabled, selected: saved }}
              disabled={saveDisabled}
              hitSlop={8}
              onPress={onToggleSave}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: t.bgSurface2,
                  borderColor: saved ? t.accent : t.border,
                  opacity: pressed ? 0.72 : saveDisabled ? 0.55 : 1,
                },
              ]}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={23}
                color={saved ? t.accent : t.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.wordRow}>
            <Text
              testID="learning-v2-new-word-target"
              accessibilityRole="header"
              accessibilityLanguage={encounter.save.targetLanguage}
              style={[styles.target, { color: t.accent }]}
            >
              {word}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.audioLabel}
              accessibilityHint={copy.audioLabel}
              accessibilityState={{ disabled: audioDisabled }}
              disabled={audioDisabled}
              hitSlop={8}
              onPress={onPlayAudio}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: t.bgSurface2,
                  borderColor: t.border,
                  opacity: pressed ? 0.72 : audioDisabled ? 0.52 : 1,
                },
              ]}
            >
              <Ionicons
                name={
                  audioState === "playing"
                    ? "volume-high"
                    : "volume-medium-outline"
                }
                size={24}
                color={t.accent}
              />
            </Pressable>
          </View>

          <Text style={[styles.transcription, { color: t.textMuted }]}>
            {encounter.transcription}
          </Text>
          <View
            style={[
              styles.meaningBlock,
              { backgroundColor: t.bgSurface2, borderColor: t.border },
            ]}
          >
            <Text style={[styles.meaning, { color: t.textPrimary }]}>
              {encounter.save.meaningByLocale[locale]}
            </Text>
            <Text style={[styles.playful, { color: t.textSecond }]}>
              {encounter.playfulMeaningByLocale[locale]}
            </Text>
          </View>

          {copy.saveStatus ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.status, { color: t.textMuted }]}
            >
              {copy.saveStatus}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onContinue}
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor: t.accent,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.continueText, { color: t.correctText }]}>
              {copy.continue}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 28,
    shadowOpacity: 0.42,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  holo: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  content: {
    padding: 22,
    gap: 16,
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  labelPill: {
    minHeight: 32,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  counter: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "right",
  },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  target: {
    flex: 1,
    fontSize: 48,
    lineHeight: 58,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  transcription: {
    marginTop: -12,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "500",
  },
  meaningBlock: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  meaning: {
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "500",
  },
  playful: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "400",
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  continueText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
});
