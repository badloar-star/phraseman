import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import FlashcardListItem from "../../app/flashcards/FlashcardListItem";
import {
  UGC_CARD_THEME_IDS,
  ugcCardChrome,
} from "../../app/community_packs/ugcCardThemePresets";
import {
  FLASHCARD_LIST_ITEM_CARD_STYLE,
  resolveFlashcardListItemHeight,
} from "../../app/flashcards/FlashcardListItemChrome";
import type {
  CardItem,
  FlashcardContentLang,
} from "../../app/flashcards/types";
import { learningV2NewWordEncounterCopy } from "../../app/learning_v2_new_word_encounter_copy";
import { useAppRuntimeActive } from "../../app/runtime_app_state_store";
import type {
  LearningV2NewWordAudioStateV1,
  LearningV2NewWordSaveStateV1,
} from "../../app/learning_v2_new_word_encounter_copy";
import {
  createLearningV2NewWordAutoFlipControllerV1,
  learningV2NewWordAudioEnabledV1,
} from "../../app/learning_v2_new_word_card_runtime_v1";
import type { LearningV2InterfaceLocale } from "../../modules/learning-v2/content/generator_course_contract";
import { learningV2NewWordFlipHintV1 } from "../../modules/learning-v2/modes/mode_copy_v1";
import type { LearningV2CourseSessionNewWordEncounterV1 } from "../../modules/learning-v2/runtime/course_session_client_children_v1";
import { useTheme } from "../ThemeContext";
import { V2Cta } from "../ui/v2_ui";

export const NEW_WORD_AUTO_FLIP_MS = 3_000;
const NEW_WORD_FLIP_MS = 180;

export type LearningV2WindowPointV1 = Readonly<{ x: number; y: number }>;

function measureViewCenterInWindow(view: View | null): Promise<LearningV2WindowPointV1 | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite)) {
        resolve(null);
        return;
      }
      resolve({ x: x + width / 2, y: y + height / 2 });
    });
  });
}

export interface LearningV2NewWordEncounterOverlayProps {
  encounter: LearningV2CourseSessionNewWordEncounterV1;
  locale: LearningV2InterfaceLocale;
  position: number;
  total: number;
  saveState: LearningV2NewWordSaveStateV1;
  audioState: LearningV2NewWordAudioStateV1;
  /** Persist the unlock before any decorative motion starts. */
  onContinue: () => void | Promise<void>;
  onFlightComplete: () => void;
  onToggleSave: () => void;
  onPlayAudio: () => void;
  measurePocketTarget: () => Promise<LearningV2WindowPointV1 | null>;
}

export default function LearningV2NewWordEncounterOverlay({
  encounter,
  locale,
  position,
  total,
  saveState,
  audioState,
  onContinue,
  onFlightComplete,
  onToggleSave,
  onPlayAudio,
  measurePocketTarget,
}: LearningV2NewWordEncounterOverlayProps) {
  const { theme: t, f, uiScale, isDark } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const appActive = useAppRuntimeActive();
  const word = encounter.save.targetText;
  // Legacy wire name; this is the manually authored, dictionary-precise
  // definition shown below the card, never on the translation side.
  const editorialDefinition = encounter.playfulMeaningByLocale[locale];
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
  const saved = saveState === "saved";
  const saveDisabled = saveState === "saving";
  // New-word cards belong to the user's permanent Cards collection, so their
  // material is stable across lesson themes. Only the surrounding lesson keeps
  // the active palette.
  const cardTheme = useMemo(() => {
    // Exact palettes from the Cards editor, rotated deterministically so a
    // new encounter feels new without changing colour on a rerender.
    const available = UGC_CARD_THEME_IDS.filter(
      (themeId) => themeId !== "violet_nebula",
    );
    const themeId = available[(Math.max(1, position) - 1) % available.length];
    const chrome = ugcCardChrome(themeId, {
      isLight: !isDark,
      bgCard: t.bgCard,
      bgSurface: t.bgSurface,
    });
    return {
      ...t,
      border: chrome.borderAccent,
      accent: chrome.accent,
      cardGradient: chrome.frontGradient,
    };
  }, [isDark, position, t]);
  const cardLocale: FlashcardContentLang = locale === "en" ? "ru" : locale;
  // Reverse side is deliberately the exact short translation. The playful
  // editorial line belongs to teaching copy, never to the flashcard back.
  const exactMeaningByLocale = encounter.save.meaningByLocale;
  const exactTranslation = exactMeaningByLocale[locale];
  const cardItem = useMemo<CardItem>(
    () => ({
      id: `learning-v2-new-word-${encounter.lexicalItemId}`,
      en: word,
      ru: exactTranslation,
      uk: exactTranslation,
      es: exactTranslation,
      sourceLocales: { [cardLocale]: exactTranslation },
      transcription: encounter.transcription,
      categoryId: "saved",
      isSystem: true,
    }),
    [cardLocale, encounter.lexicalItemId, encounter.transcription, exactTranslation, word],
  );
  const cardHeight = resolveFlashcardListItemHeight(
    screenHeight,
    0,
    0,
    uiScale,
  );
  const flipAnim = useRef(new RNAnimated.Value(0)).current;
  const overlayAnim = useRef(new RNAnimated.Value(0)).current;
  const deleteOpacity = useRef(new RNAnimated.Value(1)).current;
  const deleteScale = useRef(new RNAnimated.Value(1)).current;
  const pocketFlight = useRef(new RNAnimated.Value(0)).current;
  const pocketFlightX = useRef(new RNAnimated.Value(0)).current;
  const pocketFlightY = useRef(new RNAnimated.Value(0)).current;
  const entranceProgress = useRef(new RNAnimated.Value(0)).current;
  const hintPulse = useRef(new RNAnimated.Value(1)).current;
  const [continuing, setContinuing] = useState(false);
  const continuingRef = useRef(false);
  const cardFlightOriginRef = useRef<View>(null);
  const flippedRef = useRef(false);
  const autoFlipControllerRef = useRef<ReturnType<
    typeof createLearningV2NewWordAutoFlipControllerV1
  > | null>(null);
  useEffect(() => {
    continuingRef.current = false;
    setContinuing(false);
    pocketFlight.setValue(0);
    pocketFlightX.setValue(0);
    pocketFlightY.setValue(0);
  }, [encounter.lexicalItemId, pocketFlight, pocketFlightX, pocketFlightY]);
  const animateFlipTo = useCallback(
    (next: boolean) => {
      flippedRef.current = next;
      flipAnim.stopAnimation();
      RNAnimated.timing(flipAnim, {
        toValue: next ? 1 : 0,
        duration: reduceMotion ? 0 : NEW_WORD_FLIP_MS,
        useNativeDriver: true,
      }).start();
    },
    [flipAnim, reduceMotion],
  );
  const onFlipFromCardsComponent = useCallback(() => {
    autoFlipControllerRef.current?.manualFlip();
    animateFlipTo(!flippedRef.current);
  }, [animateFlipTo]);
  useEffect(() => {
    const controller = createLearningV2NewWordAutoFlipControllerV1({
      delayMs: NEW_WORD_AUTO_FLIP_MS,
      schedule: (callback, delayMs) => setTimeout(callback, delayMs),
      cancel: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      onAutoFlip: () => {
        if (!flippedRef.current) animateFlipTo(true);
      },
    });
    autoFlipControllerRef.current = controller;
    controller.arm();
    return () => {
      controller.dispose();
      if (autoFlipControllerRef.current === controller) {
        autoFlipControllerRef.current = null;
      }
    };
  }, [animateFlipTo]);
  useEffect(() => {
    entranceProgress.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    const entrance = RNAnimated.timing(entranceProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [entranceProgress, reduceMotion]);
  // зачем (аудит нагрева 2026-08-26): пульс подсказки — RNAnimated.loop без
  // конца. Оверлей размонтируется при закрытии, но при сворачивании приложения
  // остаётся смонтированным, и цикл грел UI-поток в кармане. Performance Bible
  // требует AppState-гард для вечных анимаций; фокус экрана здесь избыточен —
  // оверлей живёт только поверх активного экрана урока.
  useEffect(() => {
    hintPulse.setValue(1);
    if (reduceMotion || !appActive) return;
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(hintPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        RNAnimated.timing(hintPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      hintPulse.setValue(1);
    };
  }, [hintPulse, reduceMotion, appActive]);
  const onSpeakFromCardsComponent = useCallback(() => {
    onPlayAudio();
  }, [onPlayAudio]);
  const continueToPocket = useCallback(async () => {
    if (continuingRef.current) return;
    continuingRef.current = true;
    setContinuing(true);
    try {
      await onContinue();
    } catch {
      continuingRef.current = false;
      setContinuing(false);
      return;
    }
    if (reduceMotion) {
      onFlightComplete();
      return;
    }
    const [origin, target] = await Promise.all([
      measureViewCenterInWindow(cardFlightOriginRef.current),
      measurePocketTarget(),
    ]);
    if (!origin || !target) {
      onFlightComplete();
      return;
    }
    pocketFlightX.setValue(0);
    pocketFlightY.setValue(0);
    RNAnimated.parallel([
      RNAnimated.timing(pocketFlight, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pocketFlightX, {
        toValue: target.x - origin.x,
        duration: 230,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pocketFlightY, {
        toValue: target.y - origin.y,
        duration: 230,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFlightComplete();
      else {
        continuingRef.current = false;
        setContinuing(false);
      }
    });
  }, [
    measurePocketTarget,
    onContinue,
    onFlightComplete,
    pocketFlight,
    pocketFlightX,
    pocketFlightY,
    reduceMotion,
  ]);

  return (
    <View
      testID="learning-v2-new-word-overlay"
      pointerEvents="auto"
      style={styles.overlay}
      accessibilityViewIsModal
      importantForAccessibility="yes"
    >
      <View
        pointerEvents="none"
        style={[styles.backdrop, { backgroundColor: t.shadowDark }]}
      />
      <RNAnimated.View
        pointerEvents="auto"
        style={[
          styles.sheet,
          {
            opacity: entranceProgress,
            transform: [{
              translateY: entranceProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [reduceMotion ? 0 : 12, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.label, { color: t.textPrimary }]}>
            {copy.label}
          </Text>
          <Text style={[styles.counter, { color: t.textMuted }]}>
            {copy.counter}
          </Text>
        </View>

        <ScrollView
          style={styles.cardScroll}
          contentContainerStyle={styles.cardScrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        >
        <View ref={cardFlightOriginRef} collapsable={false}>
        <RNAnimated.View
          testID="learning-v2-new-word-compact-card"
          style={[
            styles.cardWrap,
            {
              opacity: pocketFlight.interpolate({
                inputRange: [0, 0.9, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                { translateX: pocketFlightX },
                { translateY: pocketFlightY },
                {
                  scale: pocketFlight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.18],
                  }),
                },
              ],
            },
          ]}
        >
          <FlashcardListItem
          item={cardItem}
          itemIdx={0}
          lang={cardLocale}
          activeCat="saved"
          deletingId={null}
          longPressedId={null}
          t={cardTheme}
          f={f as unknown as Record<string, number>}
          sourceLabels={{}}
          deleteLabel=""
          voiceLabel={copy.audioLabel}
          voiceDisabled={!learningV2NewWordAudioEnabledV1(audioState)}
          cardHeight={cardHeight}
          cardStyle={FLASHCARD_LIST_ITEM_CARD_STYLE}
          sourceBadgeStyle={{}}
          sourceBadgeTextStyle={{}}
          getCardFlipAnim={() => flipAnim}
          getOverlayAnim={() => overlayAnim}
          getDeleteAnim={() => ({ opacity: deleteOpacity, scale: deleteScale })}
          onFlipCard={onFlipFromCardsComponent}
          flipOnPressIn
          onOpenDelete={() => undefined}
          onCloseDelete={() => undefined}
          onDeleteCard={() => undefined}
          onSpeak={onSpeakFromCardsComponent}
          strength={null}
        />
          <Pressable
            testID="learning-v2-new-word-save"
            accessibilityRole="button"
            accessibilityLabel={copy.saveLabel}
            accessibilityState={{ disabled: saveDisabled, selected: saved }}
            disabled={saveDisabled}
            hitSlop={8}
            onPress={onToggleSave}
            style={({ pressed }) => [
              styles.cardBookmark,
              {
                opacity: saveDisabled ? 0.45 : pressed ? 0.68 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={saved ? cardTheme.accent : cardTheme.textPrimary}
            />
          </Pressable>
        </RNAnimated.View>
        </View>

        <Text
          testID="learning-v2-new-word-definition"
          style={[styles.editorialDefinition, { color: t.textPrimary }]}
        >
          {editorialDefinition}
        </Text>

        <RNAnimated.Text
          style={[
            styles.flipHint,
            { color: t.textPrimary },
            {
              opacity: hintPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.58, 1],
              }),
            },
          ]}
        >
          {learningV2NewWordFlipHintV1(locale)}
        </RNAnimated.Text>
        </ScrollView>

        <View style={styles.continueRow}>
          <V2Cta
            accessibilityLabel={copy.continue}
            disabled={continuing}
            onPress={() => {
              void continueToPocket();
            }}
            style={styles.continue}
          >
            {copy.continue}
          </V2Cta>
        </View>

        {copy.saveStatus ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { color: t.textPrimary }]}
          >
            {copy.saveStatus}
          </Text>
        ) : null}
      </RNAnimated.View>
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
    opacity: 0.82,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "94%",
    gap: 10,
    overflow: "visible",
  },
  cardScroll: {
    flexShrink: 1,
    overflow: "visible",
  },
  cardScrollContent: {
    gap: 14,
    paddingBottom: 2,
    overflow: "visible",
  },
  header: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  counter: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  flipHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  editorialDefinition: {
    paddingHorizontal: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  cardWrap: {
    position: "relative",
  },
  cardBookmark: {
    position: "absolute",
    right: 12,
    bottom: 12,
    zIndex: 5,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  continueRow: {
    width: "100%",
    alignItems: "center",
  },
  continue: {
    width: "72%",
    maxWidth: 360,
  },
  status: {
    minHeight: 20,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
});
