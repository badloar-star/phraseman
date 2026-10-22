// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_lesson_words.tsx — «Слова» урока Learning V2: слова ЭТОГО урока, вид 1:1 как у «Слов урока» основного курса.
//
// зачем (владелец 22.10: «„СЛОВА“ НАЖИМАЮ, ОТКРЫВАЕТСЯ РАЗДЕЛ КАРТОЧКИ»; координатор): кнопка «Слова» на обложке Сезона вела в раздел «Карточки». Теперь она открывает слова урока —
// тот же заголовок («‹» и «Слова урока N») и тот же список карточек-слов, что на экране основного курса (WordList из app/lesson_words.tsx: слово, перевод, озвучка по тапу, «в карточки»).
// Данные — слова, которые человек уже встретил в занятиях этого урока (app/learning_v2_unlocked_lesson_words_v1.ts, хук use_learning_v2_unlocked_lesson_words_v1): читаются с телефона (AsyncStorage),
// сеть и Firestore не трогаются. Нет слов — пустое состояние словами, без спиннера. Журнал [SEASON-WORDS]: вход, слова (сколько, откуда), пустой список, «назад».
// ═══════════════════════════════════════════════════════════════════════════
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { PracticeHeaderTitle } from '../components/practice/PracticeChrome';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE } from '../components/v2/ScreenBackButton';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { triLang } from '../constants/i18n';
import { useLearningV2UnlockedLessonWordsV1 } from '../hooks/use_learning_v2_unlocked_lesson_words_v1';
import { hapticTap } from '../hooks/use-haptics';
import type { LearningV2UnlockedLessonWordV1 } from './learning_v2_unlocked_lesson_words_v1';
import { WordList, type Word } from './lesson_words';
import { safeRouterBack } from './navigation_back';
// зачем (координатор 22.10): «Ещё N слов откроются в эпизодах урока» — закрытые слова числом из каталога фабрики, без чтений
import { learningV2ClosedWordsLineV1, learningV2LessonNewWordTotalV1 } from './learning_v2_lesson_words_closed_v1';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const LOG = '[SEASON-WORDS]';
const NO_COUNTS: Record<string, number> = Object.freeze({});

/** Слово Learning V2 → строка списка основного курса: слово, перевод на 9 языков; части речи у этих слов нет — список плоский. */
export function learningV2LessonWordToListWord(item: LearningV2UnlockedLessonWordV1): Word {
  const meaning = item.encounter.save.meaningByLocale;
  return {
    en: item.encounter.save.targetText,
    ru: meaning.ru,
    uk: meaning.uk,
    es: meaning.es,
    'pt-BR': meaning['pt-BR'],
    vi: meaning.vi,
    id: meaning.id,
    tr: meaning.tr,
    pl: meaning.pl,
    pos: 'phrases',
  };
}

/** Порядок — как слова встречались: сначала по занятию, потом по месту в занятии. */
export function learningV2LessonWordsOrdered(items: readonly LearningV2UnlockedLessonWordV1[]): readonly LearningV2UnlockedLessonWordV1[] {
  return [...items].sort((a, b) => a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession);
}

export default function LearningV2LessonWordsScreen() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { lesson } = useLocalSearchParams<{ lesson?: string | string[] }>();
  const lessonParam = Array.isArray(lesson) ? lesson[0] : lesson;
  const parsed = parseInt(lessonParam ?? '1', 10);
  const lessonOrdinal = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const scope = useMemo(() => ({ targetLanguage: String(studyTarget), lessonOrdinal }), [lessonOrdinal, studyTarget]);
  const { words, hydrated } = useLearningV2UnlockedLessonWordsV1(scope, { includeAuthoringPreview: __DEV__ });
  const listWords = useMemo(() => learningV2LessonWordsOrdered(words).map(learningV2LessonWordToListWord), [words]);
  const lessonWordTotal = useMemo(() => learningV2LessonNewWordTotalV1(lessonOrdinal), [lessonOrdinal]);
  const closedCount = hydrated ? Math.max(0, lessonWordTotal - listWords.length) : 0;

  useEffect(() => {
    console.log(LOG, 'вход', JSON.stringify({ lessonParam: lessonParam ?? null, lessonOrdinal, targetLanguage: scope.targetLanguage, source: 'слова урока Learning V2 с телефона (AsyncStorage), сеть не читается' })); // guard-ok: вход экрана
  }, [lessonOrdinal, lessonParam, scope.targetLanguage]);
  useEffect(() => {
    console.log(LOG, 'слова', JSON.stringify({ lessonOrdinal, hydrated, count: listWords.length, lessonWordTotal, closedCount, totalSource: 'каталог фабрики в сборке', includeAuthoringPreview: __DEV__ })); // guard-ok: значения решения «список / пусто / ещё читаем»
  }, [closedCount, hydrated, lessonOrdinal, lessonWordTotal, listWords.length]);

  const goBack = () => {
    hapticTap();
    console.log(LOG, 'назад', JSON.stringify({ lessonOrdinal, to: '/(tabs)/lessons' })); // guard-ok: куда ведёт нажатие
    safeRouterBack(router, '/(tabs)/lessons' as never);
  };
  const emptyText = triLang(lang, {
    ru: 'Слова появятся здесь, когда вы встретите их в занятиях этого урока',
    uk: 'Слова з’являться тут, коли ви зустрінете їх у заняттях цього уроку',
    en: 'Words will appear here as you meet them in this lesson',
    es: 'Las palabras aparecerán aquí cuando las encuentres en esta lección',
    'pt-BR': 'As palavras vão aparecer aqui quando você as encontrar nesta lição',
    vi: 'Từ sẽ xuất hiện ở đây khi bạn gặp chúng trong bài này',
    id: 'Kata akan muncul di sini saat kamu menemuinya di pelajaran ini',
    tr: 'Kelimeler, bu dersteki alıştırmalarda karşılaştıkça burada görünecek',
    pl: 'Słowa pojawią się tutaj, gdy spotkasz je w tej lekcji',
  });

  return (
    <ScreenGradient>
      <View style={[styles.screen, { paddingTop: insets.top }]} testID="learning-v2-lesson-words">
        <ContentWrap>
          <View style={styles.header}>
            <PracticeHeaderTitle glass={glass} title={s.words.title(lessonOrdinal)} />
          </View>
          <View style={styles.body}>
            {listWords.length > 0 ? (
              <WordList words={listWords as Word[]} learnedCounts={NO_COUNTS} lang={lang} lessonId={lessonOrdinal} flat />
            ) : hydrated ? (
              <View style={styles.empty} testID="learning-v2-lesson-words-empty">
                <Text style={[styles.emptyText, { color: glass.secondary }]}>{emptyText}</Text>
              </View>
            ) : null}
          </View>
          {closedCount > 0 ? (
            <View style={[styles.closed, { paddingBottom: 16 + insets.bottom }]} testID="learning-v2-lesson-words-closed">
              <Text style={[styles.closedText, { color: glass.secondary }]}>{learningV2ClosedWordsLineV1(lang, closedCount)}</Text>
            </View>
          ) : null}
        </ContentWrap>
      </View>
      {/* зачем (закон владельца 22.10: «назад везде в одном месте»): общая кнопка слоем от верха экрана, вне отступа и ContentWrap */}
      <ScreenBackButton screen="learning_v2_lesson_words" testID="learning-v2-lesson-words-back" accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })} onPress={goBack} />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // шапка основного курса «Слова урока»: «‹» и заголовок 20/700, поля 12, сверху 12
  // зачем (закон «назад в одном месте»): строка высотой с общую кнопку, заголовок справа от неё и по её центру (как .topbar макета)
  header: { flexDirection: 'row', alignItems: 'center', height: SCREEN_BACK_SIZE, paddingLeft: SCREEN_BACK_RESERVED, paddingRight: 12 },
  body: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // строка закрытых слов под списком: 13/17 вторичный текст, как подписи списка слов основного курса
  closed: { paddingTop: 12, paddingHorizontal: 20, alignItems: 'center' },
  closedText: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
});
