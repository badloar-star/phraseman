// Словарь Learning V2 — вариант A макета docs/design/v2-app/dictionary-v2.html (7f3cff3f7) «Список с уроками».
//
// зачем (владелец 21.10 через координатора): словарь остаётся списком слов (найти, послушать, сохранить), но из него можно
// тренировать отмеченные уроки или выбранные слова режимами «Карточек» и сохранять слова в «Карточки» одним тапом
// с «Отменить». Режимы — тот же лист FlashcardsTrainingModeSheet, тренировки — существующие экраны «Карточек» через колоду
// `lv2:<id>` (app/learning_v2_dictionary_training_deck_v1.ts). Слова приходят пропсом из хоста — экран не читает сеть.
// Старый оверлей LearningV2LessonDictionaryOverlayV1 не тронут: переключение хоста решается отдельно (координатор 22.10).
// Журнал [V2-DICT]: открытие, фильтр уроков, выбор, старт тренировки, сохранения (в хуке).
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import FlashcardsTrainingModeSheet from "../../app/flashcards/FlashcardsTrainingModeSheet";
import { buildCardsTrainingRoute, type CardsTrainingMode, type CardsTrainingRoute } from "../../app/flashcards/training_entry";
import { putLearningV2DictionaryTrainingDeckV1 } from "../../app/learning_v2_dictionary_training_deck_v1";
import { createLearningV2PreviewSpeechGenerationGuardV1 } from "../../app/learning_v2_preview_speech_watchdog_v1";
import type { LearningV2UnlockedLessonWordV1 } from "../../app/learning_v2_unlocked_lesson_words_v1";
import { ttsLocaleForStudyTarget } from "../../app/phrase_target_utils";
import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";
import type { StudyTargetLang } from "../../app/study_target_lang_dev";
import type { RuntimeStudyTarget } from "../../app/target_storage_keys";
import { useAudio } from "../../hooks/use-audio";
import { hapticTap } from "../../hooks/use-haptics";
import { useLearningV2DictionarySaveV1, type LearningV2DictionarySaveWordV1 } from "../../hooks/use_learning_v2_dictionary_save_v1";
import { LinearGradient } from "../SafeLinearGradient";
import { useLang } from "../LangContext";
import { actionBoxShadow, nestedBoxShadow } from "../v2/ShadowSurface";
import { lv2Alpha, Lv2Cta, useLv2Glass, type Lv2Glass } from "./LearningV2Glass";
import { learningV2DictionaryV2Copy, type LearningV2DictionaryV2Copy } from "./learning_v2_dictionary_v2_copy";

const LOG = "[V2-DICT]";

/** Урок в листе «Уроки»: название и прогресс даёт хост (карта курса); без них показываем номер и число слов. */
export type LearningV2DictionaryLessonMetaV1 = Readonly<{
  ordinal: number;
  title?: string;
  /** 0..100 — кольцо урока. */
  progressPct?: number;
  locked?: boolean;
}>;

type Props = Readonly<{
  words: readonly LearningV2UnlockedLessonWordV1[];
  lessons?: readonly LearningV2DictionaryLessonMetaV1[];
  studyTarget: RuntimeStudyTarget;
  offline?: boolean;
  onClose: () => void;
  /** Старт тренировки: хост закрывает свою модалку (если она есть) и переходит по маршруту «Карточек». */
  onNavigate: (route: CardsTrainingRoute) => void;
  /** Лимит Free на сохранение — хост открывает окно Plus. */
  onLimitReached: () => void;
  onGoToEpisodeOne?: () => void;
}>;

type Row =
  | Readonly<{ kind: "lesson"; ordinal: number; count: number }>
  | Readonly<{ kind: "word"; word: LearningV2UnlockedLessonWordV1 }>;

const rowKey = (row: Row) => (row.kind === "lesson" ? `lesson-${row.ordinal}` : row.word.lexicalItemId);

const saveWordOf = (word: LearningV2UnlockedLessonWordV1): LearningV2DictionarySaveWordV1 => ({
  lexicalItemId: word.lexicalItemId,
  target: word.encounter.save.targetText,
  meaningByLocale: word.encounter.save.meaningByLocale,
});

export default function LearningV2DictionaryV2({ words, lessons, studyTarget, offline = false, onClose, onNavigate, onLimitReached, onGoToEpisodeOne }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  const insets = useStableSafeAreaInsets();
  const copy = useMemo(() => learningV2DictionaryV2Copy(lang), [lang]);
  const [query, setQuery] = useState("");
  // Пустой набор = «Все уроки».
  const [lessonFilter, setLessonFilter] = useState<ReadonlySet<number>>(() => new Set());
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [lessonsSheetOpen, setLessonsSheetOpen] = useState(false);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const pendingTrainingRef = useRef<readonly LearningV2UnlockedLessonWordV1[]>([]);
  const pendingRouteRef = useRef<CardsTrainingRoute | null>(null);

  const saveWords = useMemo(() => words.map(saveWordOf), [words]);
  const { savedIds, toast, save, remove, undo } = useLearningV2DictionarySaveV1({ words: saveWords, studyTarget, onLimitReached });

  const lessonOrdinals = useMemo(() => [...new Set(words.map((word) => word.lessonOrdinal))].sort((a, b) => a - b), [words]);
  const countByLesson = useMemo(() => {
    const map = new Map<number, number>();
    for (const word of words) map.set(word.lessonOrdinal, (map.get(word.lessonOrdinal) ?? 0) + 1);
    return map;
  }, [words]);

  useEffect(() => {
    console.log(`${LOG} open`, JSON.stringify({ words: words.length, lessons: lessonOrdinals, offline, lang })); // guard-ok: строка на открытие
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleWords = useMemo(() => words.filter((word) => {
    if (lessonFilter.size > 0 && !lessonFilter.has(word.lessonOrdinal)) return false;
    if (!normalizedQuery) return true;
    const target = word.encounter.save.targetText.toLocaleLowerCase();
    const meaning = (word.encounter.save.meaningByLocale[lang] ?? "").toLocaleLowerCase();
    return target.includes(normalizedQuery) || meaning.includes(normalizedQuery);
  }), [lang, lessonFilter, normalizedQuery, words]);

  const rows = useMemo<readonly Row[]>(() => {
    const byLesson = new Map<number, LearningV2UnlockedLessonWordV1[]>();
    for (const word of visibleWords) {
      const bucket = byLesson.get(word.lessonOrdinal);
      if (bucket) bucket.push(word); else byLesson.set(word.lessonOrdinal, [word]);
    }
    const out: Row[] = [];
    for (const ordinal of [...byLesson.keys()].sort((a, b) => a - b)) {
      const bucket = (byLesson.get(ordinal) ?? []).slice().sort((a, b) =>
        a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession);
      out.push({ kind: "lesson", ordinal, count: bucket.length });
      for (const word of bucket) out.push({ kind: "word", word });
    }
    return out;
  }, [visibleWords]);

  // ── озвучка (та же защита от наложения, что в старом словаре) ──
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const speechGuardRef = useRef(createLearningV2PreviewSpeechGenerationGuardV1());
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    stopAudio();
    speechGuardRef.current.cancelCurrent();
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
  }, [stopAudio]);
  const replay = useCallback((word: LearningV2UnlockedLessonWordV1) => {
    const id = word.lexicalItemId;
    speechGuardRef.current.cancelCurrent();
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setSpeakingId(null);
    stopAudio();
    const request = speechGuardRef.current.begin(id);
    const clear = () => {
      if (!speechGuardRef.current.clear(request)) return;
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
      setSpeakingId((current) => (current === id ? null : current));
    };
    speechTimerRef.current = setTimeout(clear, 2_500);
    speakAudio(word.encounter.save.targetText, undefined, {
      language: ttsLocaleForStudyTarget(word.targetLanguage as StudyTargetLang),
      systemTtsOnly: true,
      onStart: () => { if (speechGuardRef.current.isCurrent(request)) setSpeakingId(id); },
      onDone: clear,
      onStopped: clear,
      onError: clear,
    });
  }, [speakAudio, stopAudio]);

  // ── выбор ──
  const toggleSelecting = useCallback(() => {
    void hapticTap();
    setSelecting((current) => {
      console.log(`${LOG} select_mode`, JSON.stringify({ on: !current })); // guard-ok: переключение выбора
      if (current) setSelectedIds(new Set());
      return !current;
    });
  }, []);
  const toggleWord = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectLesson = useCallback((ordinal: number) => {
    const ids = visibleWords.filter((word) => word.lessonOrdinal === ordinal).map((word) => word.lexicalItemId);
    setSelectedIds((current) => new Set([...current, ...ids]));
    console.log(`${LOG} select_all`, JSON.stringify({ lesson: ordinal, added: ids.length })); // guard-ok: выбор урока целиком
  }, [visibleWords]);

  // ── фильтр уроков ──
  const pickChip = useCallback((ordinal: number | "all") => {
    void hapticTap();
    const next = new Set<number>(ordinal === "all" ? [] : [ordinal]);
    console.log(`${LOG} filter`, JSON.stringify({ lessons: [...next], from: "chip" })); // guard-ok: смена фильтра
    setLessonFilter(next);
  }, []);
  const [sheetDraft, setSheetDraft] = useState<ReadonlySet<number>>(() => new Set());
  const openLessonsSheet = useCallback(() => {
    void hapticTap();
    setSheetDraft(lessonFilter.size > 0 ? lessonFilter : new Set(lessonOrdinals));
    setLessonsSheetOpen(true);
  }, [lessonFilter, lessonOrdinals]);
  const applyLessonsSheet = useCallback(() => {
    // Отмечены все открытые уроки — это то же самое, что «Все уроки».
    const next = sheetDraft.size === lessonOrdinals.length ? new Set<number>() : sheetDraft;
    console.log(`${LOG} filter`, JSON.stringify({ lessons: [...next], from: "sheet" })); // guard-ok: смена фильтра
    setLessonFilter(next);
    setLessonsSheetOpen(false);
  }, [lessonOrdinals.length, sheetDraft]);
  const sheetWordCount = useMemo(
    () => [...sheetDraft].reduce((sum, ordinal) => sum + (countByLesson.get(ordinal) ?? 0), 0),
    [countByLesson, sheetDraft],
  );

  // ── тренировка ──
  const selectedWords = useMemo(() => words.filter((word) => selectedIds.has(word.lexicalItemId)), [selectedIds, words]);
  const trainingWords = selecting ? selectedWords : visibleWords;
  const startTraining = useCallback(() => {
    if (trainingWords.length === 0) return;
    void hapticTap();
    pendingTrainingRef.current = trainingWords;
    setModeSheetOpen(true);
  }, [trainingWords]);
  const onModeSelected = useCallback((mode: CardsTrainingMode) => {
    const list = pendingTrainingRef.current;
    const token = putLearningV2DictionaryTrainingDeckV1(list.map(saveWordOf));
    const route = token ? buildCardsTrainingRoute(mode, [token as `lv2:${string}`]) : null;
    console.log(`${LOG} train`, JSON.stringify({ mode, words: list.length, token, route: route?.pathname ?? null })); // guard-ok: старт тренировки
    pendingRouteRef.current = route;
    setModeSheetOpen(false);
  }, []);
  // Переход — после того, как лист режимов уехал (иначе новый экран открывается под шторкой).
  const onModeSheetDismissed = useCallback(() => {
    const route = pendingRouteRef.current;
    pendingRouteRef.current = null;
    if (route) onNavigate(route);
  }, [onNavigate]);

  const saveSelected = useCallback(() => {
    if (selectedWords.length === 0) return;
    void hapticTap();
    save(selectedWords.map(saveWordOf), "batch");
  }, [save, selectedWords]);

  const toggleBookmark = useCallback((word: LearningV2UnlockedLessonWordV1) => {
    void hapticTap();
    const item = saveWordOf(word);
    if (savedIds.has(word.lexicalItemId)) remove([item], "bookmark"); else save([item], "bookmark");
  }, [remove, save, savedIds]);

  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === "lesson") {
      const allSelected = selecting && visibleWords.filter((word) => word.lessonOrdinal === item.ordinal).every((word) => selectedIds.has(word.lexicalItemId));
      return (
        <View style={styles.dsec}>
          <Text style={[styles.dsecText, { color: g.secondary }]}>
            {copy.lesson(item.ordinal).toLocaleUpperCase()}
            <Text style={styles.dsecCount}>{` · ${item.count}`}</Text>
          </Text>
          {selecting && !allSelected ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => selectLesson(item.ordinal)} testID={`learning-v2-dict-select-all-${item.ordinal}`}>
              <Text style={[styles.dsecAction, { color: g.text }]}>{copy.selectAll(item.count)}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    return (
      <WordRow
        word={item.word}
        g={g}
        copy={copy}
        lang={lang}
        selecting={selecting}
        checked={selectedIds.has(item.word.lexicalItemId)}
        saved={savedIds.has(item.word.lexicalItemId)}
        speaking={speakingId === item.word.lexicalItemId}
        onToggle={toggleWord}
        onReplay={replay}
        onBookmark={toggleBookmark}
      />
    );
  }, [copy, g, lang, replay, savedIds, selectLesson, selectedIds, selecting, speakingId, toggleBookmark, toggleWord, visibleWords]);

  const empty = words.length === 0;
  const headerTitle = selecting ? copy.selected(selectedIds.size) : copy.title;
  const headerCount = empty
    ? copy.noWordsYet
    : selecting
      ? (lessonFilter.size === 1 ? copy.lesson([...lessonFilter][0]!) : copy.summary(words.length, lessonOrdinals.length))
      : lessonFilter.size === 1
        ? copy.lessonSummary([...lessonFilter][0]!, visibleWords.length)
        : copy.summary(lessonFilter.size > 1 ? visibleWords.length : words.length, lessonFilter.size > 1 ? lessonFilter.size : lessonOrdinals.length);
  const lessonMeta = useMemo(() => new Map((lessons ?? []).map((lesson) => [lesson.ordinal, lesson])), [lessons]);
  const sheetLessons = useMemo(() => {
    const open = lessonOrdinals.map((ordinal) => lessonMeta.get(ordinal) ?? { ordinal });
    const locked = (lessons ?? []).filter((lesson) => lesson.locked && !countByLesson.has(lesson.ordinal));
    return [...open, ...locked];
  }, [countByLesson, lessonMeta, lessonOrdinals, lessons]);

  return (
    <View testID="learning-v2-dictionary-v2" style={[styles.screen, { backgroundColor: g.bg, paddingTop: insets.top }]}>
      {/* шапка `.dh.nob`: заголовок 34, счётчик 16, справа «Выбрать» / «Готово» (`.btn2.dv-small` 40) и закрыть */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: g.text }]} numberOfLines={1}>{headerTitle}</Text>
          <Text style={[styles.count, { color: g.secondary }]}>{headerCount}</Text>
        </View>
        <View style={styles.headerActions}>
          {empty ? null : (
            <Pressable
              testID="learning-v2-dict-select"
              accessibilityRole="button"
              onPress={toggleSelecting}
              style={({ pressed }) => [styles.smallBtn, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g), transform: [{ scale: pressed ? 0.96 : 1 }] }]}
            >
              <Text style={[styles.smallBtnText, { color: g.text }]}>{selecting ? copy.done : copy.select}</Text>
            </Pressable>
          )}
          <Pressable
            testID="learning-v2-dict-close"
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g), opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="close" size={18} color={g.text} />
          </Pressable>
        </View>
      </View>

      {offline ? (
        <View style={[styles.offline, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="cloud-offline-outline" size={20} color={g.text} />
          <Text style={[styles.offlineText, { color: g.text }]}>
            <Text style={styles.bold}>{copy.offlineBold}</Text> {copy.offlineRest}
          </Text>
        </View>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: g.opaqueControl }]}>
            <Ionicons name="book-outline" size={32} color={g.text} />
          </View>
          <Text style={[styles.emptyTitle, { color: g.text }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.emptyBody, { color: g.secondary }]}>{copy.emptyBody}</Text>
          {onGoToEpisodeOne ? (
            <Lv2Cta onPress={onGoToEpisodeOne} style={styles.emptyCta} testID="learning-v2-dict-to-episode-1">
              {copy.toEpisodeOne}
            </Lv2Cta>
          ) : null}
        </View>
      ) : (
        <>
          {/* чипы `.chips`: фильтр-лист, «Все уроки», «Урок N» */}
          {/* guard-ok: чипов не больше числа уроков курса (≤ 32) — виртуализация не нужна */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
            <Chip g={g} label="" icon="filter" on={false} onPress={openLessonsSheet} testID="learning-v2-dict-lessons-sheet" accessibilityLabel={copy.lessonsFilter} />
            <Chip g={g} label={copy.allLessons} on={lessonFilter.size === 0} onPress={() => pickChip("all")} testID="learning-v2-dict-chip-all" />
            {lessonOrdinals.map((ordinal) => (
              <Chip key={ordinal} g={g} label={copy.lesson(ordinal)} on={lessonFilter.has(ordinal)} onPress={() => pickChip(ordinal)} testID={`learning-v2-dict-chip-${ordinal}`} />
            ))}
          </ScrollView>
          {/* поиск `.srch` 46 — тон подложки, без обводки */}
          <View style={[styles.search, { backgroundColor: g.opaqueControl }]}>
            <Ionicons name="search" size={18} color={g.mutedText} />
            <TextInput
              testID="learning-v2-dict-search"
              value={query}
              onChangeText={setQuery}
              placeholder={copy.search}
              placeholderTextColor={g.mutedText}
              accessibilityLabel={copy.search}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.searchInput, { color: g.text }]}
            />
            {query.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={copy.clearSearch} onPress={() => setQuery("")} hitSlop={10}>
                <Ionicons name="close" size={16} color={g.secondary} />
              </Pressable>
            ) : null}
          </View>
          <FlatList
            style={styles.list}
            removeClippedSubviews={false}
            data={rows}
            keyExtractor={rowKey}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: selecting ? 190 : 130 }}
            ListEmptyComponent={
              <View style={styles.nothing}>
                <Ionicons name="search" size={32} color={g.mutedText} />
                <Text style={[styles.nothingText, { color: g.secondary }]}>{copy.nothingFound}</Text>
              </View>
            }
          />
          {/* низ `.dock`: растворение в фон, главная «Тренировать · N», в выборе — ещё «В карточки · N» */}
          <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <LinearGradient pointerEvents="none" colors={[lv2Alpha(g.bg, 0), g.bg]} locations={[0, 0.46]} style={StyleSheet.absoluteFill} />
            {toast ? (
              <View testID="learning-v2-dict-toast" style={[styles.toast, { backgroundColor: g.ctaFill, boxShadow: actionBoxShadow(g) }]}>
                <Text style={[styles.toastText, { color: g.ctaFillInk }]} numberOfLines={2}>
                  {toast.words.length === 1 ? copy.toastOne(toast.words[0]!) : copy.toastMany(toast.words.length)}
                </Text>
                <Pressable testID="learning-v2-dict-undo" accessibilityRole="button" onPress={undo} hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }} style={[styles.undo, { backgroundColor: lv2Alpha(g.ctaFillInk, 0.12) }]}>
                  <Text style={[styles.undoText, { color: g.ctaFillInk }]}>{copy.undo}</Text>
                </Pressable>
              </View>
            ) : null}
            <Lv2Cta
              testID="learning-v2-dict-train"
              disabled={trainingWords.length === 0}
              onPress={startTraining}
              right={null}
              left="play"
            >
              {selecting ? copy.trainShort(selectedWords.length) : copy.train(visibleWords.length)}
            </Lv2Cta>
            {selecting ? (
              <Pressable
                testID="learning-v2-dict-save-selected"
                accessibilityRole="button"
                accessibilityState={{ disabled: selectedWords.length === 0 }}
                disabled={selectedWords.length === 0}
                onPress={saveSelected}
                style={({ pressed }) => [styles.btn2, {
                  backgroundColor: selectedWords.length === 0 ? g.buttonFillDisabled : g.buttonFill,
                  boxShadow: nestedBoxShadow(g),
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }]}
              >
                <Ionicons name="bookmark-outline" size={18} color={selectedWords.length === 0 ? g.buttonInkDisabled : g.text} />
                <Text style={[styles.btn2Text, { color: selectedWords.length === 0 ? g.buttonInkDisabled : g.text }]}>{copy.saveMany(selectedWords.length)}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {/* лист «Уроки»: отметить несколько, «Показать N слов» */}
      <Modal visible={lessonsSheetOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setLessonsSheetOpen(false)}>
        <Pressable style={styles.dim} onPress={() => setLessonsSheetOpen(false)} accessibilityLabel={copy.close} />
        <View style={[styles.sheet, { backgroundColor: g.opaqueCard, paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={[styles.grab, { backgroundColor: g.mutedText }]} />
          <Text style={[styles.sheetTitle, { color: g.text }]}>{copy.lessonsFilter}</Text>
          <Text style={[styles.sheetSub, { color: g.secondary }]}>{copy.lessonsSheetSub}</Text>
          <View style={styles.sheetList}>
            {sheetLessons.map((lesson, index) => {
              const locked = lesson.locked === true && !countByLesson.has(lesson.ordinal);
              const on = sheetDraft.has(lesson.ordinal);
              return (
                <Pressable
                  key={lesson.ordinal}
                  testID={`learning-v2-dict-lesson-row-${lesson.ordinal}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: locked }}
                  disabled={locked}
                  onPress={() => setSheetDraft((current) => {
                    const next = new Set(current);
                    if (next.has(lesson.ordinal)) next.delete(lesson.ordinal); else next.add(lesson.ordinal);
                    return next;
                  })}
                  style={[styles.lrow, index < sheetLessons.length - 1 ? { borderBottomColor: g.line, borderBottomWidth: 1 } : null]} // shadow-ok: разделитель строк `.dv-lrow`
                >
                  <Check g={g} on={on} dim={locked} />
                  <LessonRing g={g} pct={lesson.progressPct ?? 0} label={String(lesson.ordinal)} />
                  <View style={styles.lrowText}>
                    <Text style={[styles.lrowTitle, { color: locked ? g.mutedText : g.text }]}>{copy.lesson(lesson.ordinal)}</Text>
                    {lesson.title ? <Text style={[styles.lrowMeta, { color: locked ? g.mutedText : g.secondary }]} numberOfLines={1}>{lesson.title}</Text> : null}
                  </View>
                  {locked
                    ? <Ionicons name="lock-closed-outline" size={16} color={g.secondary} />
                    : <Text style={[styles.lrowRight, { color: g.secondary }]}>{countByLesson.get(lesson.ordinal) ?? 0}</Text>}
                </Pressable>
              );
            })}
          </View>
          <Lv2Cta testID="learning-v2-dict-lessons-apply" disabled={sheetDraft.size === 0} onPress={applyLessonsSheet} style={styles.sheetCta}>
            {copy.showWords(sheetWordCount)}
          </Lv2Cta>
        </View>
      </Modal>

      <FlashcardsTrainingModeSheet
        visible={modeSheetOpen}
        lang={lang}
        onClose={() => setModeSheetOpen(false)}
        onDismissed={onModeSheetDismissed}
        onSelect={onModeSelected}
      />
    </View>
  );
}

const Chip = memo(function Chip({ g, label, icon, on, onPress, testID, accessibilityLabel }: Readonly<{
  g: Lv2Glass; label: string; icon?: keyof typeof Ionicons.glyphMap; on: boolean; onPress: () => void; testID: string; accessibilityLabel?: string;
}>) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, icon ? styles.chipIcon : null, {
        backgroundColor: on ? g.ctaFill : g.buttonFill,
        boxShadow: on ? actionBoxShadow(g) : nestedBoxShadow(g),
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={g.text} /> : null}
      {label ? <Text style={[styles.chipText, { color: on ? g.ctaFillInk : g.text }]}>{label}</Text> : null}
    </Pressable>
  );
});

const Check = memo(function Check({ g, on, dim }: Readonly<{ g: Lv2Glass; on: boolean; dim?: boolean }>) {
  // `.ck`: кольцо 2 px (внутренняя тень, не обводка контейнера) или заливка главной кнопки с галочкой.
  return (
    <View style={[styles.ck, {
      opacity: dim ? 0.4 : 1,
      backgroundColor: on ? g.ctaFill : "transparent",
      boxShadow: on ? undefined : [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: g.mutedText }], // shadow-ok: чекбокс-индикатор `.ck`, не обводка контейнера
    }]}>
      {on ? <Ionicons name="checkmark" size={15} color={g.ctaFillInk} /> : null}
    </View>
  );
});

const LessonRing = memo(function LessonRing({ g, pct, label }: Readonly<{ g: Lv2Glass; pct: number; label: string }>) {
  // `.ring` 40: кольцо прогресса урока (верно-зелёный по тону подложки) и номер урока в центре.
  const size = 40;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={styles.ring}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={g.opaqueControl} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={g.good} strokeWidth={stroke} fill="none"
            strokeDasharray={`${(c * clamped) / 100} ${c}`} strokeLinecap="butt" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      <Text style={[styles.ringText, { color: g.text }]}>{label}</Text>
    </View>
  );
});

const WordRow = memo(function WordRow({ word, g, copy, lang, selecting, checked, saved, speaking, onToggle, onReplay, onBookmark }: Readonly<{
  word: LearningV2UnlockedLessonWordV1;
  g: Lv2Glass;
  copy: LearningV2DictionaryV2Copy;
  lang: string;
  selecting: boolean;
  checked: boolean;
  saved: boolean;
  speaking: boolean;
  onToggle: (id: string) => void;
  onReplay: (word: LearningV2UnlockedLessonWordV1) => void;
  onBookmark: (word: LearningV2UnlockedLessonWordV1) => void;
}>) {
  const target = word.encounter.save.targetText;
  const meaning = word.encounter.save.meaningByLocale[lang as "ru"] ?? word.encounter.save.meaningByLocale.ru ?? "";
  const body = (
    <>
      {selecting ? <Check g={g} on={checked} /> : null}
      <View style={styles.wc}>
        <Text style={[styles.w, { color: g.text }]}>{target}</Text>
        <Text style={[styles.m, { color: g.secondary }]}>
          {meaning}
          {saved && !selecting ? (
            <Text style={[styles.savedTag, { color: g.good }]}>{`  ✓ ${copy.savedTag}`}</Text>
          ) : null}
        </Text>
      </View>
      {selecting ? null : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.listen(target)}
            onPress={() => onReplay(word)}
            hitSlop={4}
            style={({ pressed }) => [styles.rb, { backgroundColor: speaking || pressed ? g.selected : g.buttonFill, boxShadow: nestedBoxShadow(g) }]}
          >
            <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={18} color={g.text} />
          </Pressable>
          <Pressable
            testID={`learning-v2-dict-bookmark-${word.lexicalItemId}`}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            accessibilityLabel={copy.saveWord(target)}
            onPress={() => onBookmark(word)}
            style={styles.bk}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? g.text : g.secondary} />
          </Pressable>
        </>
      )}
    </>
  );
  if (selecting) {
    return (
      <Pressable
        testID={`learning-v2-dict-row-${word.lexicalItemId}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onToggle(word.lexicalItemId)}
        style={[styles.wrow, { borderBottomColor: g.line }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View testID={`learning-v2-dict-row-${word.lexicalItemId}`} style={[styles.wrow, { borderBottomColor: g.line }]}>{body}</View>;
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  title: { marginTop: 6, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.5 },
  count: { marginTop: 2, fontSize: 16, lineHeight: 21 },
  smallBtn: { height: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  offline: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12, marginHorizontal: 20 },
  offlineText: { flex: 1, fontSize: 13, lineHeight: 18 },
  bold: { fontWeight: "700" },
  // зачем (Сверка 22.10, dict_side_D1): ряд чипов ужимался до ~32 dp и резал «Все уроки» снизу — соседний список с длинным содержимым забирал высоту; ряд не сжимается (высота чипа 40)
  chipsScroll: { flexGrow: 0, flexShrink: 0, minHeight: 40, marginTop: 12 },
  chips: { gap: 8, paddingHorizontal: 20 },
  chip: { height: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6 },
  chipIcon: { paddingHorizontal: 12 },
  chipText: { fontSize: 13, lineHeight: 17, fontWeight: "600" },
  list: { flex: 1 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, borderRadius: 14, paddingHorizontal: 14, marginTop: 16, marginHorizontal: 20 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 0 },
  dsec: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 6, marginHorizontal: 22 },
  dsecText: { fontSize: 13, lineHeight: 17, letterSpacing: 2.4, fontWeight: "700" },
  dsecCount: { letterSpacing: 0 },
  dsecAction: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  wrow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 66, paddingVertical: 8, paddingLeft: 2, paddingRight: 6, marginHorizontal: 20, borderBottomWidth: 1 }, // shadow-ok: разделитель строк `.wrow`
  wc: { flex: 1, minWidth: 0 },
  w: { fontSize: 19, lineHeight: 24, fontWeight: "600" },
  m: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  savedTag: { fontSize: 13, fontWeight: "600" },
  rb: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  bk: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -8 },
  ck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  nothing: { alignItems: "center", gap: 14, paddingTop: 80 },
  nothingText: { fontSize: 16, lineHeight: 22 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 28, paddingHorizontal: 20, gap: 12 },
  toast: { minHeight: 54, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 8, paddingVertical: 7, marginBottom: 4 },
  toastText: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  undo: { height: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  undoText: { fontSize: 16, fontWeight: "700" },
  btn2: { height: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  btn2Text: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 64, paddingHorizontal: 20 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 18, fontSize: 22, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  emptyBody: { marginTop: 8, maxWidth: 300, fontSize: 16, lineHeight: 23, textAlign: "center" },
  emptyCta: { marginTop: 22, alignSelf: "stretch" },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" }, // theme-exempt: затемнение под шторкой — как `.dv-dim` в макете
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 20 },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 16, opacity: 0.6 },
  sheetTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  sheetSub: { marginTop: 4, fontSize: 16, lineHeight: 21, textAlign: "center" },
  sheetList: { marginTop: 12 },
  lrow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 2 },
  lrowText: { flex: 1, minWidth: 0 },
  lrowTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  lrowMeta: { marginTop: 1, fontSize: 13, lineHeight: 18 },
  lrowRight: { fontSize: 13, lineHeight: 17 },
  ring: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  ringText: { fontSize: 13, fontWeight: "700" },
  sheetCta: { marginTop: 18 },
});

