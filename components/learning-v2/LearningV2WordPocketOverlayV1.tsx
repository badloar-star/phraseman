import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import CollectionDeckView from "../../app/flashcards/CollectionDeckView";
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from "../../app/flashcards/types";
import { projectLearningV2UnlockedWordsToCardsV1 } from "../../app/learning_v2_unlocked_word_cards_v1";
import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import { inferExpoSpeechLanguage, type SpeakOpts } from "../../hooks/use-audio";
import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";
import { triLang } from "../../constants/i18n";
import AddToFlashcard from "../AddToFlashcard";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";
import { lv2CardStyle, useLv2Glass } from "./LearningV2Glass";
import { nestedBoxShadow } from "../v2/ShadowSurface";
import { useScaledTextStyles } from "../../hooks/useLineScale";

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
  // зачем (learning-v2.html, pocket): экран кармана — на токенах Liquid Glass (`g`); `t` нужен
  // только общей колоде CollectionDeckView, чей контракт темы живёт в другом модуле.
  const { theme: t, f } = useTheme();
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const [deckIndex, setDeckIndex] = useState<number | null>(null);
  const cards = useMemo(
    () => [...projectLearningV2UnlockedWordsToCardsV1({ unlocked: words })],
    [words],
  );
  const cardContentLang = (lang === "en" ? "ru" : lang) as FlashcardContentLang;
  const copy = {
    eyebrow: triLang(lang, {
      ru: "СЛОВА УРОКА", uk: "СЛОВА УРОКУ", en: "LESSON WORDS", es: "PALABRAS DE LA LECCIÓN",
      "pt-BR": "PALAVRAS DA LIÇÃO", vi: "TỪ TRONG BÀI", id: "KATA PELAJARAN", tr: "DERSİN KELİMELERİ", pl: "SŁOWA Z LEKCJI",
    }),
    title: triLang(lang, {
      ru: "Карман слов", uk: "Кишеня слів", en: "Word pocket", es: "Bolsillo de palabras",
      "pt-BR": "Bolso de palavras", vi: "Túi từ", id: "Kantong kata", tr: "Kelime cebi", pl: "Kieszeń słów",
    }),
    opened: triLang(lang, {
      ru: "Открыто", uk: "Відкрито", en: "Unlocked", es: "Abiertas",
      "pt-BR": "Abertas", vi: "Đã mở", id: "Terbuka", tr: "Açık", pl: "Odblokowane",
    }),
    close: triLang(lang, {
      ru: "Закрыть карман слов", uk: "Закрити кишеню слів", en: "Close word pocket", es: "Cerrar el bolsillo de palabras",
      "pt-BR": "Fechar o bolso de palavras", vi: "Đóng túi từ", id: "Tutup kantong kata", tr: "Kelime cebini kapat", pl: "Zamknij kieszeń słów",
    }),
    empty: triLang(lang, {
      ru: "Новые слова появятся здесь после знакомства с ними.", uk: "Нові слова з’являться тут після знайомства з ними.", en: "New words will appear here after you meet them.", es: "Las palabras nuevas aparecerán aquí después de conocerlas.",
      "pt-BR": "As palavras novas aparecerão aqui depois que você as conhecer.", vi: "Từ mới sẽ xuất hiện ở đây sau khi bạn làm quen với chúng.", id: "Kata baru akan muncul di sini setelah kamu mengenalnya.", tr: "Yeni kelimelerle tanıştıktan sonra burada görünür.", pl: "Nowe słowa pojawią się tutaj, gdy je poznasz.",
    }),
    speak: (word: string) => triLang(lang, {
      ru: `Озвучить слово ${word}`, uk: `Озвучити слово ${word}`, en: `Play ${word}`, es: `Escuchar ${word}`,
      "pt-BR": `Ouvir ${word}`, vi: `Phát âm ${word}`, id: `Putar ${word}`, tr: `${word} kelimesini dinle`, pl: `Odtwórz słowo ${word}`,
    }),
  };
  const handleBack = useCallback(() => {
    if (deckIndex !== null) setDeckIndex(null);
    else onClose();
    return true;
  }, [deckIndex, onClose]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => subscription.remove();
  }, [handleBack]);

  const sx = useScaledTextStyles(styles);
  return (
    // зачем (сверка с learning-v2.html pocket, 05.10): шапка как у словаря (.dh: 8 под статус-баром, линия 1 px в полях 20,
    // крестик .rb.sq 36), список .stack.g13 в 18, строка r16 от 88 с полями 0/16/0/20, звук 38, пустое — сверху в 120.
    <View
      testID="learning-v2-word-pocket-overlay"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.overlay, { backgroundColor: g.bg }]}
    >
      <View
        style={[
          sx.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: g.line,
          },
        ]}
      >
        <View>
          <Text style={[sx.eyebrow, { color: g.secondary }]}>{copy.eyebrow}</Text>
          <Text style={[sx.title, { color: g.text }]}>{copy.title}</Text>
          <Text style={[sx.count, { color: g.secondary }]}>{copy.opened}: {cards.length}</Text>
        </View>
        <Pressable
          testID="learning-v2-word-pocket-close"
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [
            sx.close,
            { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g), opacity: pressed ? 0.7 : 1 }, // зачем («Тень» 12.10): кнопка закрытия — вложенная плитка, не контур
          ]}
        >
          <Ionicons name="close" size={18} color={g.text} />
        </Pressable>
      </View>

      {cards.length && deckIndex !== null ? (
        <CollectionDeckView
          initialIndex={deckIndex}
          cards={cards}
          lang={cardContentLang}
          cardContentLang={cardContentLang}
          t={t}
          f={f as unknown as Record<string, number>}
          onSpeak={onSpeak}
          onIndexChanged={() => undefined}
          onFlipTracked={() => undefined}
          onExitToList={() => setDeckIndex(null)}
          renderTopCardAction={(card: CardItem) => (
            <View style={sx.bookmark}>
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
      ) : cards.length ? (
        <FlatList removeClippedSubviews={false}
          testID="learning-v2-pulse-word-list"
          data={cards}
          keyExtractor={card => card.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 24, gap: 13 }}
          renderItem={({ item: card, index }) => {
            const meaning = resolveFlashcardBackText(card, cardContentLang);
            return <View style={[lv2CardStyle(g), sx.wordRow]}>
              <Pressable accessibilityRole="button" accessibilityLabel={card.en} onPress={() => setDeckIndex(index)} style={sx.wordCopy}>
                <Text style={[sx.word, { color: g.text }]}>{card.en}</Text>
                <Text style={[sx.meaning, { color: g.secondary }]}>{meaning}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.speak(card.en)} hitSlop={4} onPress={() => onSpeak(card.en, { language: inferExpoSpeechLanguage(card.en, card.packLanguage) })} style={[sx.wordSpeak, { backgroundColor: g.buttonFill }]}>
                <Ionicons name="volume-high" size={18} color={g.text} />
              </Pressable>
              <View style={sx.wordTool}><AddToFlashcard en={card.en} ru={card.ru} uk={card.uk} es={card.es} sourceLocales={card.sourceLocales} source="lesson" sourceId={card.sourceId} size={22} /></View>
            </View>;
          }}
        />
      ) : (
        <View style={sx.empty}>
          <Ionicons name="albums-outline" size={36} color={g.mutedText} />
          <Text style={[sx.emptyText, { color: g.secondary }]}>{copy.empty}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wordRow: { borderRadius: 16, minHeight: 88, paddingLeft: 20, paddingRight: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 16 },
  wordCopy: { flex: 1, minWidth: 0, minHeight: 64, justifyContent: "center", gap: 4 },
  word: { fontSize: 24, lineHeight: 30, fontWeight: "600" },
  meaning: { fontSize: 16, lineHeight: 22 },
  wordTool: { minWidth: 30, minHeight: 44, alignItems: "center", justifyContent: "center" },
  // звук .rb 38 #262628 без кромки; зона нажатия добирается hitSlop.
  wordSpeak: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
  },
  header: {
    marginHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1, // shadow-ok: разделитель-линия под шапкой, не контейнер
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  count: { marginTop: 4, fontSize: 16, lineHeight: 21 },
  close: {
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    right: 14,
    bottom: 14,
  },
  // `.empty`: сверху в 120, поля 30, gap 14.
  empty: {
    flex: 1,
    alignItems: "center",
    gap: 14,
    paddingTop: 120,
    paddingHorizontal: 30,
  },
  emptyText: {
    maxWidth: 320,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    textAlign: "center",
  },
});
