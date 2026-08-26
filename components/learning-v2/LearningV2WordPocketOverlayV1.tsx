import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import CollectionDeckView from "../../app/flashcards/CollectionDeckView";
import type { CardItem, FlashcardContentLang } from "../../app/flashcards/types";
import { projectLearningV2UnlockedWordsToCardsV1 } from "../../app/learning_v2_unlocked_word_cards_v1";
import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import type { SpeakOpts } from "../../hooks/use-audio";
import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";
import AddToFlashcard from "../AddToFlashcard";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";

type Props = Readonly<{
  words: readonly LearningV2UnlockedLessonWordV1[];
  onClose: () => void;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
}>;

export default function LearningV2WordPocketOverlayV1({
  words,
  onClose,
  onSpeak,
}: Props) {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const cards = useMemo(
    () => [...projectLearningV2UnlockedWordsToCardsV1({ unlocked: words })],
    [words],
  );
  const cardContentLang = (lang === "en" ? "ru" : lang) as FlashcardContentLang;

  return (
    <View
      testID="learning-v2-word-pocket-overlay"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.overlay, { backgroundColor: t.bgPrimary }]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            minHeight: insets.top + 78,
          },
        ]}
      >
        <View>
          <Text style={[styles.eyebrow, { color: t.accent }]}>СЛОВА УРОКА</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>Карман слов</Text>
        </View>
        <Pressable
          testID="learning-v2-word-pocket-close"
          accessibilityRole="button"
          accessibilityLabel="Закрыть карман слов"
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="close" size={25} color={t.textPrimary} />
        </Pressable>
      </View>

      {cards.length ? (
        <CollectionDeckView
          cards={cards}
          lang={cardContentLang}
          cardContentLang={cardContentLang}
          t={t}
          f={f as unknown as Record<string, number>}
          onSpeak={onSpeak}
          onIndexChanged={() => undefined}
          onFlipTracked={() => undefined}
          onExitToList={onClose}
          renderTopCardAction={(card: CardItem) => (
            <View style={styles.bookmark}>
              <AddToFlashcard
                en={card.en}
                ru={card.ru}
                uk={card.uk}
                es={card.es}
                sourceLocales={card.sourceLocales}
                source="lesson"
                sourceId={card.sourceId}
                size={22}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={36} color={t.textMuted} />
          <Text style={[styles.emptyText, { color: t.textSecond }]}>Новые слова появятся здесь после знакомства с ними.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 2,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    right: 14,
    bottom: 14,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 36,
  },
  emptyText: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
    textAlign: "center",
  },
});
