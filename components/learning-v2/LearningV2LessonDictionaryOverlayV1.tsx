import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import { ttsLocaleForStudyTarget } from "../../app/phrase_target_utils";
import type { StudyTargetLang } from "../../app/study_target_lang_dev";
import { triLang } from "../../constants/i18n";
import { useAudio } from "../../hooks/use-audio";
import AddToFlashcard from "../AddToFlashcard";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";

type Props = Readonly<{
  lessonOrdinal: number;
  words: readonly LearningV2UnlockedLessonWordV1[];
  onClose: () => void;
}>;

export default function LearningV2LessonDictionaryOverlayV1({
  lessonOrdinal,
  words,
  onClose,
}: Props) {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = {
    lesson: triLang(lang, {
      ru: `УРОК ${lessonOrdinal}`,
      uk: `УРОК ${lessonOrdinal}`,
      en: `LESSON ${lessonOrdinal}`,
      es: `LECCIÓN ${lessonOrdinal}`,
      "pt-BR": `LIÇÃO ${lessonOrdinal}`,
      vi: `BÀI ${lessonOrdinal}`,
      id: `PELAJARAN ${lessonOrdinal}`,
      tr: `DERS ${lessonOrdinal}`,
      pl: `LEKCJA ${lessonOrdinal}`,
    }),
    title: triLang(lang, {
      ru: "Словарь",
      uk: "Словник",
      en: "Dictionary",
      es: "Diccionario",
      "pt-BR": "Dicionário",
      vi: "Từ điển",
      id: "Kamus",
      tr: "Sözlük",
      pl: "Słownik",
    }),
    count: triLang(lang, {
      ru: `Открыто: ${words.length}`,
      uk: `Відкрито: ${words.length}`,
      en: `Unlocked: ${words.length}`,
      es: `Desbloqueadas: ${words.length}`,
      "pt-BR": `Desbloqueadas: ${words.length}`,
      vi: `Đã mở: ${words.length}`,
      id: `Terbuka: ${words.length}`,
      tr: `Açılan: ${words.length}`,
      pl: `Odblokowane: ${words.length}`,
    }),
    close: triLang(lang, {
      ru: "Закрыть словарь",
      uk: "Закрити словник",
      en: "Close dictionary",
      es: "Cerrar diccionario",
      "pt-BR": "Fechar dicionário",
      vi: "Đóng từ điển",
      id: "Tutup kamus",
      tr: "Sözlüğü kapat",
      pl: "Zamknij słownik",
    }),
    empty: triLang(lang, {
      ru: "Здесь появятся только слова, которые вы уже встретили.",
      uk: "Тут з’являться лише слова, які ви вже зустріли.",
      en: "Only words you have already met will appear here.",
      es: "Aquí aparecerán solo las palabras que ya hayas visto.",
      "pt-BR": "Aqui aparecerão apenas as palavras que você já encontrou.",
      vi: "Chỉ những từ bạn đã gặp mới xuất hiện ở đây.",
      id: "Hanya kata yang sudah kamu temui yang akan muncul di sini.",
      tr: "Burada yalnızca daha önce karşılaştığın kelimeler görünür.",
      pl: "Tutaj pojawią się tylko słowa, które już znasz z lekcji.",
    }),
    listen: (target: string) =>
      triLang(lang, {
        ru: `Прослушать ${target}`,
        uk: `Прослухати ${target}`,
        en: `Listen to ${target}`,
        es: `Escuchar ${target}`,
        "pt-BR": `Ouvir ${target}`,
        vi: `Nghe ${target}`,
        id: `Dengarkan ${target}`,
        tr: `${target} kelimesini dinle`,
        pl: `Posłuchaj ${target}`,
      }),
  };

  useEffect(
    () => () => {
      stopAudio();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [stopAudio],
  );

  const replay = useCallback(
    (word: LearningV2UnlockedLessonWordV1) => {
      const id = word.lexicalItemId;
      if (timerRef.current) clearTimeout(timerRef.current);
      setSpeakingId(id);
      const clear = () => setSpeakingId((current) => (current === id ? null : current));
      timerRef.current = setTimeout(clear, 2_500);
      speakAudio(word.encounter.save.targetText, undefined, {
        language: ttsLocaleForStudyTarget(
          word.targetLanguage as StudyTargetLang,
        ),
        onDone: clear,
        onStopped: clear,
        onError: clear,
      });
    },
    [speakAudio],
  );

  return (
    <View
      testID="learning-v2-map-dictionary-overlay"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.overlay, { backgroundColor: t.bgPrimary }]}
    >
      <View style={[styles.header, { borderBottomColor: t.border }]}> 
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: t.accent }]}>{copy.lesson}</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>{copy.title}</Text>
          <Text style={[styles.count, { color: t.textMuted }]}>{copy.count}</Text>
        </View>
        <Pressable
          testID="learning-v2-map-dictionary-close"
          accessibilityRole="button"
          accessibilityLabel={copy.close}
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

      <FlatList
        data={[...words].sort(
          (left, right) =>
            left.encounter.orderWithinSession - right.encounter.orderWithinSession,
        )}
        keyExtractor={(item) => item.lexicalItemId}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: t.border }]} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={34} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textSecond }]}>{copy.empty}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const encounter = item.encounter;
          const target = encounter.save.targetText;
          const translation = encounter.save.meaningByLocale[lang];
          const active = speakingId === item.lexicalItemId;
          return (
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.listen(target)}
                onPress={() => replay(item)}
                style={({ pressed }) => [
                  styles.wordAction,
                  {
                    backgroundColor:
                      active || pressed ? `${t.accent}22` : "transparent",
                  },
                ]}
              >
                <View style={styles.wordCopy}>
                  <Text
                    style={[
                      styles.target,
                      { color: active ? t.accent : t.textPrimary, fontSize: f.bodyLg },
                    ]}
                  >
                    {target}
                  </Text>
                  <Text style={[styles.meta, { color: t.textMuted }]}> 
                    {encounter.transcription} · {translation}
                  </Text>
                </View>
                <Ionicons
                  name={active ? "volume-high" : "volume-medium-outline"}
                  size={21}
                  color={active ? t.accent : t.textMuted}
                />
              </Pressable>
              <AddToFlashcard
                en={target}
                ru={encounter.save.meaningByLocale.ru}
                uk={encounter.save.meaningByLocale.uk}
                es={encounter.save.meaningByLocale.es}
                sourceLocales={{
                  "pt-BR": encounter.save.meaningByLocale["pt-BR"],
                  vi: encounter.save.meaningByLocale.vi,
                  id: encounter.save.meaningByLocale.id,
                  tr: encounter.save.meaningByLocale.tr,
                  pl: encounter.save.meaningByLocale.pl,
                }}
                source="lesson"
                sourceId={item.lexicalItemId}
                size={21}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 160 },
  header: {
    minHeight: 104,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: { gap: 1 },
  eyebrow: { fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 1.3 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: "900" },
  count: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  close: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 44 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 24 },
  row: {
    minHeight: 76,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordCopy: { flex: 1 },
  target: { fontWeight: "800" },
  meta: { marginTop: 2, fontSize: 14, lineHeight: 19, fontWeight: "500" },
  empty: { paddingTop: 120, paddingHorizontal: 34, alignItems: "center", gap: 12 },
  emptyText: { maxWidth: 320, fontSize: 16, lineHeight: 23, fontWeight: "600", textAlign: "center" },
});
