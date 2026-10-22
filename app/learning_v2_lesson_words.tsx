// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_lesson_words.tsx — «Слова» урока Learning V2: слова ЭТОГО урока, вид 1:1 как у «Слов урока» основного курса.
//
// зачем (владелец 22.10: «„СЛОВА“ НАЖИМАЮ, ОТКРЫВАЕТСЯ РАЗДЕЛ КАРТОЧКИ»; координатор): кнопка «Слова» на обложке Сезона вела в раздел «Карточки». Теперь она открывает слова урока —
// тот же заголовок («‹» и «Слова урока N») и тот же список карточек-слов, что на экране основного курса (WordList из app/lesson_words.tsx: слово, перевод, озвучка по тапу, «в карточки»).
// Данные — слова, которые человек уже встретил в занятиях этого урока (app/learning_v2_unlocked_lesson_words_v1.ts, хук use_learning_v2_unlocked_lesson_words_v1): читаются с телефона (AsyncStorage),
// сеть и Firestore не трогаются. Нет слов — пустое состояние словами, без спиннера. Журнал [SEASON-WORDS]: вход, слова (сколько, откуда), пустой список, «назад».
// ═══════════════════════════════════════════════════════════════════════════
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { useLearningV2CourseUnlockedWordsV1 } from '../hooks/use_learning_v2_course_unlocked_words_v1';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import V2Pressable from '../components/v2/V2Pressable';
import { hapticTap } from '../hooks/use-haptics';
import type { LearningV2UnlockedLessonWordV1 } from './learning_v2_unlocked_lesson_words_v1';
import { WordList, type Word } from './lesson_words';
import { safeRouterBack } from './navigation_back';
// зачем (координатор 22.10): «Ещё N слов откроются в эпизодах урока» — закрытые слова числом из каталога фабрики, без чтений
import { learningV2ClosedWordsLineV1, learningV2LessonNewWordTotalV1 } from './learning_v2_lesson_words_closed_v1';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

const LOG = '[SEASON-WORDS]';
const NO_COUNTS: Record<string, number> = Object.freeze({});
// 32 урока курса: ключи слов лежат по уроку, все локальные (один multiGet), Firestore не трогается
const COURSE_LESSON_ORDINALS: readonly number[] = Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1));
type WordsScope = 'lesson' | 'course';

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

/** Весь курс: по порядку уроков, внутри урока — как слова встречались. */
export function learningV2CourseWordsOrdered(items: readonly LearningV2UnlockedLessonWordV1[]): readonly LearningV2UnlockedLessonWordV1[] {
  return [...items].sort((a, b) => a.lessonOrdinal - b.lessonOrdinal || a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession);
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
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: словарь ВСЕГО курса — внутри «Слова» (переключатель «Этот урок / Весь курс»), а не кнопкой в шапке хаба; слова курса читаются ТОЛЬКО при открытии вкладки «Весь курс» (scope null — чтения нет), первый кадр хаба и этого экрана не грузятся
  const [wordsScope, setWordsScope] = useState<WordsScope>('lesson');
  const courseScope = useMemo(() => (wordsScope === 'course' ? { targetLanguage: String(studyTarget), lessonOrdinals: COURSE_LESSON_ORDINALS } : null), [studyTarget, wordsScope]);
  const course = useLearningV2CourseUnlockedWordsV1(courseScope, { includeAuthoringPreview: __DEV__ });
  const lessonListWords = useMemo(() => learningV2LessonWordsOrdered(words).map(learningV2LessonWordToListWord), [words]);
  const courseListWords = useMemo(() => learningV2CourseWordsOrdered(course.words).map(learningV2LessonWordToListWord), [course.words]);
  const listWords = wordsScope === 'course' ? courseListWords : lessonListWords;
  const shownHydrated = wordsScope === 'course' ? course.hydrated : hydrated;
  const lessonWordTotal = useMemo(() => learningV2LessonNewWordTotalV1(lessonOrdinal), [lessonOrdinal]);
  const closedCount = wordsScope === 'lesson' && hydrated ? Math.max(0, lessonWordTotal - lessonListWords.length) : 0;

  useEffect(() => {
    console.log(LOG, 'вход', JSON.stringify({ lessonParam: lessonParam ?? null, lessonOrdinal, targetLanguage: scope.targetLanguage, source: 'слова урока Learning V2 с телефона (AsyncStorage), сеть не читается' })); // guard-ok: вход экрана
  }, [lessonOrdinal, lessonParam, scope.targetLanguage]);
  useEffect(() => {
    console.log(LOG, 'слова', JSON.stringify({ lessonOrdinal, scope: wordsScope, hydrated: shownHydrated, count: listWords.length, lessonWordTotal, closedCount, totalSource: 'каталог фабрики в сборке', includeAuthoringPreview: __DEV__ })); // guard-ok: значения решения «список / пусто / ещё читаем»
  }, [closedCount, lessonOrdinal, lessonWordTotal, listWords.length, shownHydrated, wordsScope]);

  const goBack = () => {
    hapticTap();
    console.log(LOG, 'назад', JSON.stringify({ lessonOrdinal, to: '/(tabs)/lessons' })); // guard-ok: куда ведёт нажатие
    safeRouterBack(router, '/(tabs)/lessons' as never);
  };
  const g = useLv2Glass();
  const switchLabels = triLang(lang, {
    ru: ['Этот урок', 'Весь курс'], uk: ['Цей урок', 'Весь курс'], en: ['This lesson', 'Whole course'], es: ['Esta lección', 'Todo el curso'], 'pt-BR': ['Esta lição', 'Curso todo'],
    vi: ['Bài này', 'Cả khóa học'], id: ['Pelajaran ini', 'Seluruh kursus'], tr: ['Bu ders', 'Tüm kurs'], pl: ['Ta lekcja', 'Cały kurs'],
  }); // ⚠ ЖДУТ ревью «Переводчика» (10) на 7 языках
  const courseTitle = triLang(lang, { ru: 'Слова курса', uk: 'Слова курсу', en: 'Course words', es: 'Palabras del curso', 'pt-BR': 'Palavras do curso', vi: 'Từ của khóa học', id: 'Kata kursus', tr: 'Kurs kelimeleri', pl: 'Słowa kursu' });
  const courseEmptyText = triLang(lang, {
    ru: 'Слова появятся здесь, когда вы встретите их в занятиях курса', uk: 'Слова з’являться тут, коли ви зустрінете їх у заняттях курсу', en: 'Words will appear here as you meet them in the course',
    es: 'Las palabras aparecerán aquí cuando las encuentres en el curso', 'pt-BR': 'As palavras vão aparecer aqui quando você as encontrar no curso', vi: 'Từ sẽ xuất hiện ở đây khi bạn gặp chúng trong khóa học',
    id: 'Kata akan muncul di sini saat kamu menemuinya di kursus', tr: 'Kelimeler, kurstaki alıştırmalarda karşılaştıkça burada görünecek', pl: 'Słowa pojawią się tutaj, gdy spotkasz je w kursie',
  });
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
            <PracticeHeaderTitle glass={glass} title={wordsScope === 'course' ? courseTitle : s.words.title(lessonOrdinal)} />
          </View>
          <View style={styles.switchWrap} testID="learning-v2-words-scope-switch">
            <View style={[styles.switchTrack, { backgroundColor: g.opaqueControl }]}>
              {(['lesson', 'course'] as const).map((id, i) => {
                const on = wordsScope === id;
                return (
                  <V2Pressable key={id} testID={`learning-v2-words-scope-${id}`} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={switchLabels[i]}
                    onPress={() => { if (!on) { hapticTap(); console.log(LOG, 'переключатель', JSON.stringify({ from: wordsScope, to: id })); setWordsScope(id); } }} // guard-ok: одна строка на тап
                    outerStyle={styles.switchCellOuter} scaleTo={0.97} style={[styles.switchCell, { backgroundColor: on ? g.text : 'transparent' }]}>
                    <Text style={[styles.switchText, { color: on ? g.bg : g.secondary }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{switchLabels[i]}</Text>
                  </V2Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.body}>
            {listWords.length > 0 ? (
              <WordList words={listWords as Word[]} learnedCounts={NO_COUNTS} lang={lang} lessonId={lessonOrdinal} flat />
            ) : shownHydrated ? (
              <View style={styles.empty} testID="learning-v2-lesson-words-empty">
                <Text style={[styles.emptyText, { color: glass.secondary }]}>{wordsScope === 'course' ? courseEmptyText : emptyText}</Text>
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
  // переключатель «Этот урок / Весь курс»: таблетка 44 под шапкой, выбранная ячейка — «текст на фоне», как переключатель тем Диалогов
  switchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  switchTrack: { height: 44, borderRadius: 22, padding: 4, flexDirection: 'row', gap: 2 },
  switchCellOuter: { flex: 1 },
  switchCell: { height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  switchText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // строка закрытых слов под списком: 13/17 вторичный текст, как подписи списка слов основного курса
  closed: { paddingTop: 12, paddingHorizontal: 20, alignItems: 'center' },
  closedText: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
});
