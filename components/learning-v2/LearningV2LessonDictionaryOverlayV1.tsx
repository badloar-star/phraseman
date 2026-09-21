import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";

import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import { ttsLocaleForStudyTarget } from "../../app/phrase_target_utils";
import type { StudyTargetLang } from "../../app/study_target_lang_dev";
import { triLang } from "../../constants/i18n";
import { useAudio } from "../../hooks/use-audio";
import AddToFlashcard from "../AddToFlashcard";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";

type Props = Readonly<{
  /**
   * Урок, если словарь открыт ВНУТРИ одного урока. Для словаря всего курса
   * (кнопка в шапке карты) передаётся null: заголовок тогда говорит про курс,
   * а урок называет каждая секция списка.
   */
  lessonOrdinal: number | null;
  words: readonly LearningV2UnlockedLessonWordV1[];
  onClose: () => void;
}>;

/** Строка списка: заголовок урока либо само слово. */
type DictionaryRow =
  | Readonly<{ kind: "lesson"; lessonOrdinal: number; count: number }>
  | Readonly<{ kind: "word"; word: LearningV2UnlockedLessonWordV1 }>;

/** Ключ строки: вынесен, чтобы ссылка не менялась между рендерами. */
const dictionaryRowKey = (row: DictionaryRow) =>
  row.kind === "lesson" ? `lesson-${row.lessonOrdinal}` : row.word.lexicalItemId;

export default function LearningV2LessonDictionaryOverlayV1({
  lessonOrdinal,
  words,
  onClose,
}: Props) {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lessonLabel = useCallback(
    (ordinal: number) =>
      triLang(lang, {
        ru: `УРОК ${ordinal}`,
        uk: `УРОК ${ordinal}`,
        en: `LESSON ${ordinal}`,
        es: `LECCIÓN ${ordinal}`,
        "pt-BR": `LIÇÃO ${ordinal}`,
        vi: `BÀI ${ordinal}`,
        id: `PELAJARAN ${ordinal}`,
        tr: `DERS ${ordinal}`,
        pl: `LEKCJA ${ordinal}`,
      }),
    [lang],
  );
  // зачем: подпись строки нужна внутри renderRow. Брать её из объекта `copy`
  // нельзя — он пересоздаётся каждый рендер и обнулил бы мемоизацию списка.
  const listenLabel = useCallback(
    (target: string) =>
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
    [lang],
  );
  const copy = {
    lesson: lessonOrdinal === null
      ? triLang(lang, {
          ru: "ВЕСЬ КУРС",
          uk: "ВЕСЬ КУРС",
          en: "WHOLE COURSE",
          es: "TODO EL CURSO",
          "pt-BR": "CURSO INTEIRO",
          vi: "TOÀN KHÓA HỌC",
          id: "SELURUH KURSUS",
          tr: "TÜM KURS",
          pl: "CAŁY KURS",
        })
      : lessonLabel(lessonOrdinal),
    search: triLang(lang, {
      ru: "Поиск слова",
      uk: "Пошук слова",
      en: "Search a word",
      es: "Buscar una palabra",
      "pt-BR": "Buscar uma palavra",
      vi: "Tìm từ",
      id: "Cari kata",
      tr: "Kelime ara",
      pl: "Szukaj słowa",
    }),
    clearSearch: triLang(lang, {
      ru: "Очистить поиск",
      uk: "Очистити пошук",
      en: "Clear search",
      es: "Borrar la búsqueda",
      "pt-BR": "Limpar a busca",
      vi: "Xóa tìm kiếm",
      id: "Hapus pencarian",
      tr: "Aramayı temizle",
      pl: "Wyczyść wyszukiwanie",
    }),
    nothingFound: triLang(lang, {
      ru: "Ничего не нашлось",
      uk: "Нічого не знайшлося",
      en: "Nothing found",
      es: "No se encontró nada",
      "pt-BR": "Nada encontrado",
      vi: "Không tìm thấy gì",
      id: "Tidak ada yang ditemukan",
      tr: "Bir şey bulunamadı",
      pl: "Nic nie znaleziono",
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
  };

  useEffect(
    () => () => {
      stopAudio();
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [stopAudio],
  );

  // Поиск идёт и по слову оригинала, и по переводу: человек ищет то, что
  // помнит, а помнит он чаще перевод.
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleWords = useMemo(() => {
    if (!normalizedQuery) return words;
    return words.filter((word) => {
      const target = word.encounter.save.targetText.toLocaleLowerCase();
      const meaning = (word.encounter.save.meaningByLocale[lang] ?? "").toLocaleLowerCase();
      return target.includes(normalizedQuery) || meaning.includes(normalizedQuery);
    });
  }, [lang, normalizedQuery, words]);

  /**
   * Плоский список с заголовками уроков.
   *
   * зачем: словарь курса — это слова 32 уроков вперемешку. Без заголовков
   * человек видит кашу и не понимает, откуда слово. Сортировка внутри урока
   * осталась прежней (порядок появления в занятии), а уроки идут по возрастанию.
   * Один FlatList, а не SectionList: строки однородные и дешевле в рендере,
   * плюс не нужен отдельный путь для sticky-заголовков.
   */
  const rows = useMemo<readonly DictionaryRow[]>(() => {
    const byLesson = new Map<number, LearningV2UnlockedLessonWordV1[]>();
    for (const word of visibleWords) {
      const bucket = byLesson.get(word.lessonOrdinal);
      if (bucket) bucket.push(word);
      else byLesson.set(word.lessonOrdinal, [word]);
    }
    const result: DictionaryRow[] = [];
    const ordinals = [...byLesson.keys()].sort((left, right) => left - right);
    // Внутри одного урока заголовок не нужен — он уже стоит в шапке шторки.
    const withHeadings = lessonOrdinal === null;
    for (const ordinal of ordinals) {
      const bucket = (byLesson.get(ordinal) ?? []).slice().sort(
        (left, right) =>
          left.sourceSessionOrdinal - right.sourceSessionOrdinal ||
          left.encounter.orderWithinSession - right.encounter.orderWithinSession,
      );
      if (withHeadings) {
        result.push({ kind: "lesson", lessonOrdinal: ordinal, count: bucket.length });
      }
      for (const word of bucket) result.push({ kind: "word", word });
    }
    return result;
  }, [lessonOrdinal, visibleWords]);

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

  // зачем: вынесено из JSX в стабильную ссылку. При наборе в поиске состояние
  // меняется на каждый символ, и инлайновый renderItem заставлял FlatList
  // считать себя новым и перерисовывать ВСЕ видимые строки — на словаре курса
  // это сотни слов.
  const renderRow = useCallback(
    ({ item }: { item: DictionaryRow }) => {
      if (item.kind === "lesson") {
        return (
          <View style={styles.lessonHeading}>
            <Text style={[styles.lessonHeadingText, { color: t.accent }]}>
              {lessonLabel(item.lessonOrdinal)}
            </Text>
            <Text style={[styles.lessonHeadingCount, { color: t.textMuted }]}>
              {item.count}
            </Text>
          </View>
        );
      }
      const word = item.word;
      const encounter = word.encounter;
      const target = encounter.save.targetText;
      const translation = encounter.save.meaningByLocale[lang];
      const active = speakingId === word.lexicalItemId;
      return (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listenLabel(target)}
            onPress={() => replay(word)}
            style={({ pressed }) => [
              styles.wordAction,
              { backgroundColor: active || pressed ? `${t.accent}22` : "transparent" },
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
            sourceId={word.lexicalItemId}
            size={21}
          />
        </View>
      );
    },
    [f.bodyLg, lang, lessonLabel, listenLabel, replay, speakingId, t],
  );

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
    <View
      testID="learning-v2-map-dictionary-overlay"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.overlay, {
        backgroundColor: t.bgPrimary,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }]}
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

      {/* Поиск показываем только когда искать есть в чём: на десятке слов
          строка поиска — лишний элемент, который просто занимает экран. */}
      {words.length >= 12 ? (
        <View style={[styles.searchRow, { backgroundColor: t.bgSurface2 }]}>
          <Ionicons name="search" size={18} color={t.textMuted} />
          <TextInput
            testID="learning-v2-map-dictionary-search"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={copy.search}
            placeholder={copy.search}
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.searchInput, { color: t.textPrimary }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.clearSearch}
              onPress={() => setQuery("")}
              hitSlop={10}
            >
              <Ionicons name="close-circle" size={18} color={t.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={dictionaryRowKey}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={normalizedQuery ? "search" : "book-outline"} size={34} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textSecond }]}>
              {normalizedQuery ? copy.nothingFound : copy.empty}
            </Text>
          </View>
        }
        renderItem={renderRow}
      />
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
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
  // Поиск: тон подложки, без обводки контейнера (закон владельца).
  searchRow: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 4,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "600", paddingVertical: 0 },
  // Заголовок урока внутри списка. Он же служит разделителем секций, поэтому
  // отдельная линия-разделитель между словами больше не нужна.
  lessonHeading: {
    paddingTop: 22,
    paddingBottom: 8,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  lessonHeadingText: { fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2 },
  lessonHeadingCount: { fontSize: 13, lineHeight: 17, fontWeight: "800" },
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
