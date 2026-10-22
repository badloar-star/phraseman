import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";

import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import { ttsLocaleForStudyTarget } from "../../app/phrase_target_utils";
import { createLearningV2PreviewSpeechGenerationGuardV1 } from "../../app/learning_v2_preview_speech_watchdog_v1";
import type { StudyTargetLang } from "../../app/study_target_lang_dev";
import { triLang } from "../../constants/i18n";
import { useAudio } from "../../hooks/use-audio";
import AddToFlashcard from "../AddToFlashcard";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";
import { useLv2Glass } from "./LearningV2Glass";
import { nestedBoxShadow } from "../v2/ShadowSurface";
import { useLineScale, useScaledTextStyles } from '../../hooks/useLineScale';

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
  const sx = useScaledTextStyles(styles);
  const lh = useLineScale();
  const { lang } = useLang();
  const { f } = useTheme();
  // зачем (learning-v2.html, dict): словарь курса — на токенах Liquid Glass активной темы.
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechGuardRef = useRef(createLearningV2PreviewSpeechGenerationGuardV1());
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
      ru: "Здесь появятся только слова, которые тебе уже встречались.",
      uk: "Тут з’являться лише слова, які тобі вже траплялися.",
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
      speechGuardRef.current.cancelCurrent();
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
      speechGuardRef.current.cancelCurrent();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setSpeakingId(null);
      stopAudio();
      const request = speechGuardRef.current.begin(id);
      const clear = () => {
        if (!speechGuardRef.current.clear(request)) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setSpeakingId((current) => (current === id ? null : current));
      };
      timerRef.current = setTimeout(clear, 2_500);
      speakAudio(word.encounter.save.targetText, undefined, {
        language: ttsLocaleForStudyTarget(
          word.targetLanguage as StudyTargetLang,
        ),
        systemTtsOnly: true,
        onStart: () => {
          if (speechGuardRef.current.isCurrent(request)) setSpeakingId(id);
        },
        onDone: clear,
        onStopped: clear,
        onError: clear,
      });
    },
    [speakAudio, stopAudio],
  );

  // зачем: вынесено из JSX в стабильную ссылку. При наборе в поиске состояние
  // меняется на каждый символ, и инлайновый renderItem заставлял FlatList
  // считать себя новым и перерисовывать ВСЕ видимые строки — на словаре курса
  // это сотни слов.
  const renderRow = useCallback(
    ({ item }: { item: DictionaryRow }) => {
      if (item.kind === "lesson") {
        return (
          <View style={sx.lessonHeading}>
            <Text style={[sx.lessonHeadingText, { color: g.secondary }]}>
              {lessonLabel(item.lessonOrdinal)}
            </Text>
            <Text style={[sx.lessonHeadingCount, { color: g.secondary }]}>
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
        // зачем (learning-v2.html `.wrow`): строка 66 с линией снизу; слово 19/600, транскрипция и перевод --sec;
        // справа круглая кнопка звука 38 (#262628, без кромки) и закладка 22 в карточки.
        <View style={[sx.row, { borderBottomColor: g.line }]}>
          <View style={sx.wordCopy}>
            {/* зачем: 19 из макета с учётом выбранного размера шрифта (f.bodyLg = 16 × масштаб). */}
            <Text style={[sx.target, { color: g.text, fontSize: Math.round((19 * f.bodyLg) / 16), lineHeight: lh(Math.round((24 * f.bodyLg) / 16)) }]}>{target}</Text>
            <Text style={[sx.meta, { color: g.secondary }]}>
              {encounter.transcription} · {translation}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listenLabel(target)}
            onPress={() => replay(word)}
            hitSlop={4}
            style={({ pressed }) => [
              sx.speak,
              { backgroundColor: active || pressed ? g.selected : g.buttonFill },
            ]}
          >
            <Ionicons name={active ? "volume-high" : "volume-medium"} size={18} color={g.text} />
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
            size={22}
          />
        </View>
      );
    },
    [f.bodyLg, g, lang, lessonLabel, lh, listenLabel, replay, speakingId, sx],
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
      style={[sx.overlay, {
        backgroundColor: g.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }]}
    >
      <View style={[sx.header, { borderBottomColor: g.line }]}>
        <View style={sx.headerCopy}>
          <Text style={[sx.eyebrow, { color: g.secondary }]}>{copy.lesson}</Text>
          <Text style={[sx.title, { color: g.text }]}>{copy.title}</Text>
          <Text style={[sx.count, { color: g.secondary }]}>{copy.count}</Text>
        </View>
        <Pressable
          testID="learning-v2-map-dictionary-close"
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

      {/* Поиск показываем только когда искать есть в чём: на десятке слов
          строка поиска — лишний элемент, который просто занимает экран. */}
      {words.length >= 12 ? (
        <View style={[sx.searchRow, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="search" size={18} color={g.secondary} />
          <TextInput
            testID="learning-v2-map-dictionary-search"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={copy.search}
            placeholder={copy.search}
            placeholderTextColor={g.mutedText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[sx.searchInput, { color: g.text }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.clearSearch}
              onPress={() => setQuery("")}
              hitSlop={10}
            >
              <Ionicons name="close" size={16} color={g.secondary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList removeClippedSubviews={false}
        data={rows}
        keyExtractor={dictionaryRowKey}
        contentContainerStyle={sx.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={sx.empty}>
            <Ionicons name={normalizedQuery ? "search" : "book-outline"} size={36} color={g.mutedText} />
            <Text style={[sx.emptyText, { color: g.secondary }]}>
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
    marginHorizontal: 20,
    // зачем (`.scr > .in` padding-top 52 ≈ 8 под статус-баром; `.dh` линия 1 px внутри полей страницы).
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1, // shadow-ok: разделитель-линия `.dh` под шапкой, не контейнер
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerCopy: { gap: 0 },
  eyebrow: { fontSize: 13, lineHeight: 17, fontWeight: "700", letterSpacing: 3 },
  title: { marginTop: 6, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.5 },
  count: { marginTop: 4, fontSize: 16, lineHeight: 21, fontWeight: "400" },
  // `.rb.sq`: 36, r12; «Тень» 12.10 — тон и малая тень вместо кромки.
  close: { marginTop: 8, width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 44 },
  // Поиск: тон подложки, без обводки контейнера (закон владельца).
  searchRow: {
    marginHorizontal: 20,
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "400", paddingVertical: 0 },
  // Заголовок урока внутри списка. Он же служит разделителем секций, поэтому
  // отдельная линия-разделитель между словами больше не нужна.
  lessonHeading: {
    // `.dsec` margin 26px 2px 8px внутри полей 20.
    paddingTop: 26,
    paddingBottom: 8,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  lessonHeadingText: { fontSize: 13, lineHeight: 17, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase" },
  lessonHeadingCount: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  row: {
    marginHorizontal: 20,
    minHeight: 66,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 2,
    paddingRight: 6,
    borderBottomWidth: 1, // shadow-ok: разделитель-линия между строками словаря
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  speak: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  wordCopy: { flex: 1, minWidth: 0 },
  target: { fontWeight: "600" },
  meta: { marginTop: 3, fontSize: 13, lineHeight: 18, fontWeight: "400" },
  empty: { paddingTop: 120, paddingHorizontal: 30, alignItems: "center", gap: 14 },
  emptyText: { maxWidth: 320, fontSize: 16, lineHeight: 22, fontWeight: "400", textAlign: "center" },
});
