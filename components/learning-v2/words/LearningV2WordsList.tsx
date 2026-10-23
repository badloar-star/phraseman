// ═════════════════════════════════════════════════════════════════════
// LearningV2WordsList.tsx — список «Слова»: строка со словом, кружок-динамик слева, закладка «в карточки» справа; во «Весь курс» поиск (от 12 слов) и разделы «Урок N».
//
// зачем (владелец 22.10 кнопкой, макет words-lesson-course.html, таблица words-inventory.md; каждое решение — замок tests/owner_locks_words_2026_10_22.test.ts):
//  • «кружок-динамик вместо серых точек» — три точки статуса были всегда одинаковыми и ничего не сообщали; кружок 40 слева показывает, что слово можно послушать, при звучании залит акцентом;
//  • «озвучка — на ЯЗЫКЕ изучаемого слова (сейчас жёстко en-US)» — ttsLocaleForStudyTarget(язык слова), системный голос (systemTtsOnly), один звук за раз, подсветка до 2,5 с;
//  • «транскрипции НЕТ» — под словом только перевод; «закладка передаёт все 9 переводов» — pt-BR, vi, id, tr, pl раньше терялись; «ключ строки (урок, id слова)».
// Данные — слова с телефона (сети нет), список виртуализирован (FlatList, стабильный renderItem).
// ═════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LearningV2UnlockedLessonWordV1 } from '../../../app/learning_v2_unlocked_lesson_words_v1';
import { createLearningV2PreviewSpeechGenerationGuardV1 } from '../../../app/learning_v2_preview_speech_watchdog_v1';
import { ttsLocaleForStudyTarget } from '../../../app/phrase_target_utils';
import type { StudyTargetLang } from '../../../app/study_target_lang_dev';
import type { Lang } from '../../../constants/i18n';
import { useAudio } from '../../../hooks/use-audio';
import AddToFlashcard from '../../AddToFlashcard';
import { useLang } from '../../LangContext';
import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass, type Lv2Glass } from '../LearningV2Glass';
import { lv2Mix } from '../learning_v2_task_theme_tokens';
import { wordsLessonLabel, wordsListenLabel, wordsSearchCopy } from './words_list_copy';
import { buildWordsRows, filterWordsByQuery, splitHighlight, WORDS_SEARCH_MIN, wordTranslation, type WordsRow } from './words_list_model';

const SPEAK_HIGHLIGHT_MS = 2_500;

type RowProps = Readonly<{
  word: LearningV2UnlockedLessonWordV1;
  lang: Lang;
  query: string;
  speaking: boolean;
  g: Lv2Glass;
  onSpeak: (word: LearningV2UnlockedLessonWordV1) => void;
}>;

// Текст с подсветкой совпадения поиска (макет `mark`: акцент 28 %)
function Highlighted({ text, query, color, markBg, style }: Readonly<{ text: string; query: string; color: string; markBg: string; style: object }>) {
  const parts = splitHighlight(text, query);
  if (!parts) return <Text style={[style, { color }]}>{text}</Text>;
  return (
    <Text style={[style, { color }]}>
      {parts[0]}<Text style={{ backgroundColor: markBg }}>{parts[1]}</Text>{parts[2]}
    </Text>
  );
}

const WordRow = memo(function WordRow({ word, lang, query, speaking, g, onSpeak }: RowProps) {
  const target = word.encounter.save.targetText;
  const meaning = word.encounter.save.meaningByLocale;
  const markBg = lv2Mix(g.opaqueCard, g.accent, 0.28);
  return (
    // зачем (A3.7): тап по строке — озвучка слова; закладка справа — своя кнопка (оптимистично, откат при ошибке — внутри AddToFlashcard)
    <V2Pressable
      testID={`learning-v2-word-row-${word.lessonOrdinal}-${word.lexicalItemId}`}
      accessibilityRole="button"
      accessibilityLabel={wordsListenLabel(lang, target)}
      onPress={() => onSpeak(word)}
      style={[styles.row, { backgroundColor: speaking ? lv2Mix(g.opaqueCard, g.accent, 0.16) : g.opaqueCard }]}
    >
      <View testID="learning-v2-word-speaker" style={[styles.speaker, { backgroundColor: speaking ? g.accent : g.opaqueControl }]}>
        <Ionicons name={speaking ? 'volume-high' : 'volume-medium'} size={18} color={speaking ? g.accentInk : g.accentGraphic} />
      </View>
      <View style={styles.text}>
        <Highlighted text={target} query={query} color={g.text} markBg={markBg} style={styles.target} />
        <Highlighted text={wordTranslation(word, lang)} query={query} color={g.secondary} markBg={markBg} style={styles.translation} />
      </View>
      <View style={styles.bookmark}>
        <AddToFlashcard
          en={target}
          ru={meaning.ru}
          uk={meaning.uk}
          es={meaning.es}
          // ЗАМОК ВЛАДЕЛЬЦА 22.10: «закладка передаёт все 9 переводов» — pt-BR, vi, id, tr, pl раньше терялись на экране «Слова»
          sourceLocales={{ 'pt-BR': meaning['pt-BR'], vi: meaning.vi, id: meaning.id, tr: meaning.tr, pl: meaning.pl }}
          source="lesson"
          sourceId={word.lexicalItemId}
          size={22}
        />
      </View>
    </V2Pressable>
  );
});

type Props = Readonly<{
  mode: 'lesson' | 'course';
  words: readonly LearningV2UnlockedLessonWordV1[];
  /** false — чтение ещё не завершилось: пока пустое место, без спиннера и без «пусто». */
  hydrated: boolean;
  emptyText: string;
  /** «Ещё N слов откроются в эпизодах урока» — только «Этот урок»; под списком или внизу пустого экрана. */
  tailLine: string | null;
  bottomInset: number;
}>;

function LearningV2WordsList({ mode, words, hydrated, emptyText, tailLine, bottomInset }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  const { speak, stop } = useAudio();
  const [query, setQuery] = useState('');
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardRef = useRef(createLearningV2PreviewSpeechGenerationGuardV1());
  const search = useMemo(() => wordsSearchCopy(lang), [lang]);

  // поиск — только «Весь курс» и только от WORDS_SEARCH_MIN слов; при смене вкладки запрос сбрасывается
  const searchShown = mode === 'course' && words.length >= WORDS_SEARCH_MIN;
  useEffect(() => { setQuery(''); }, [mode]);
  const visible = useMemo(() => (searchShown ? filterWordsByQuery(words, query, lang) : words), [lang, query, searchShown, words]);
  const rows = useMemo(() => buildWordsRows(visible, mode), [mode, visible]);
  const activeQuery = searchShown ? query : '';

  useEffect(() => () => {
    stop();
    guardRef.current.cancelCurrent();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [stop]);

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «озвучка — на ЯЗЫКЕ изучаемого слова (сейчас жёстко en-US)»: язык озвучки берётся у самого слова, а не зашит
  const onSpeak = useCallback((word: LearningV2UnlockedLessonWordV1) => {
    const key = `${word.lessonOrdinal}:${word.lexicalItemId}`;
    guardRef.current.cancelCurrent();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setSpeakingKey(null);
    stop();
    const request = guardRef.current.begin(key);
    const clear = () => {
      if (!guardRef.current.clear(request)) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      setSpeakingKey((current) => (current === key ? null : current));
    };
    timerRef.current = setTimeout(clear, SPEAK_HIGHLIGHT_MS);
    speak(word.encounter.save.targetText, undefined, {
      language: ttsLocaleForStudyTarget(word.targetLanguage as StudyTargetLang),
      systemTtsOnly: true,
      onStart: () => { if (guardRef.current.isCurrent(request)) setSpeakingKey(key); },
      onDone: clear,
      onStopped: clear,
      onError: clear,
    });
  }, [speak, stop]);

  const renderItem = useCallback(({ item }: { item: WordsRow }) => {
    if (item.kind === 'section') {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: g.text }]} maxFontSizeMultiplier={1.2}>{wordsLessonLabel(lang, item.lessonOrdinal)}</Text>
          <Text style={[styles.sectionCount, { color: g.secondary }]} maxFontSizeMultiplier={1.2}>{item.count}</Text>
        </View>
      );
    }
    return <WordRow word={item.word} lang={lang} query={activeQuery} speaking={speakingKey === item.key} g={g} onSpeak={onSpeak} />;
  }, [activeQuery, g, lang, onSpeak, speakingKey]);

  const footer = tailLine ? <Text testID="learning-v2-lesson-words-closed" style={[styles.tail, { color: g.secondary }]}>{tailLine}</Text> : null;
  const emptyList = hydrated && words.length === 0;
  const nothingFound = hydrated && words.length > 0 && rows.length === 0;

  return (
    <View style={styles.flex} testID="learning-v2-words-list">
      {searchShown ? (
        <View style={[styles.searchRow, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="search" size={18} color={g.secondary} />
          <TextInput
            testID="learning-v2-words-search"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={search.placeholder}
            placeholder={search.placeholder}
            placeholderTextColor={g.mutedText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.searchInput, { color: g.text }]}
          />
          {query.length > 0 ? (
            <V2Pressable accessibilityRole="button" accessibilityLabel={search.clear} onPress={() => setQuery('')} hitSlop={10} scaleTo={0.9} style={styles.clear}>
              <Ionicons name="close-circle" size={20} color={g.secondary} />
            </V2Pressable>
          ) : null}
        </View>
      ) : null}
      {rows.length > 0 ? (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderItem}
          extraData={speakingKey}
          style={styles.flex}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 16 }]}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={footer}
        />
      ) : emptyList ? (
        <View style={styles.flex}>
          <View style={styles.empty} testID="learning-v2-lesson-words-empty">
            <Ionicons name="albums-outline" size={36} color={g.secondary} />
            <Text style={[styles.emptyText, { color: g.secondary }]}>{emptyText}</Text>
          </View>
          {tailLine ? <View style={[styles.emptyTail, { paddingBottom: bottomInset + 16 }]}>{footer}</View> : null}
        </View>
      ) : nothingFound ? (
        <View style={styles.empty} testID="learning-v2-words-nothing-found">
          <Ionicons name="search" size={36} color={g.secondary} />
          <Text style={[styles.emptyText, { color: g.secondary }]}>{search.nothingFound}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // макет `.wd-row`: мин. 58, радиус 16, поля 7·8, зазор 12; между строками 8
  row: { minHeight: 58, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  speaker: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  target: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  translation: { fontSize: 13, lineHeight: 17 },
  bookmark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 2, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  sectionCount: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  tail: { paddingTop: 4, paddingHorizontal: 8, textAlign: 'center', fontSize: 13, lineHeight: 17 },
  emptyTail: { alignItems: 'center', paddingHorizontal: 20 },
  searchRow: { marginHorizontal: 16, marginTop: 12, height: 48, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21, paddingVertical: 0 },
  clear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
});

export default memo(LearningV2WordsList);
