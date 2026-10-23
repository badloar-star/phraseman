// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_lesson_words.tsx — «Слова» урока Learning V2: слова ЭТОГО урока, вид 1:1 как у «Слов урока» основного курса.
//
// зачем (владелец 22.10: «„СЛОВА“ НАЖИМАЮ, ОТКРЫВАЕТСЯ РАЗДЕЛ КАРТОЧКИ»; координатор): кнопка «Слова» на обложке Сезона вела в раздел «Карточки». Теперь она открывает слова урока —
// тот же заголовок («‹» и «Слова урока N») и тот же список карточек-слов, что на экране основного курса (WordList из app/lesson_words.tsx: слово, перевод, озвучка по тапу, «в карточки»).
// Данные — слова, которые человек уже встретил в занятиях этого урока (app/learning_v2_unlocked_lesson_words_v1.ts, хук use_learning_v2_unlocked_lesson_words_v1): читаются с телефона (AsyncStorage),
// сеть и Firestore не трогаются. Нет слов — пустое состояние словами, без спиннера. Журнал [SEASON-WORDS]: вход, слова (сколько, откуда), пустой список, «назад».
// ═══════════════════════════════════════════════════════════════════════════
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE } from '../components/v2/ScreenBackButton';
import { triLang } from '../constants/i18n';
import { useLearningV2UnlockedLessonWordsV1 } from '../hooks/use_learning_v2_unlocked_lesson_words_v1';
import { useLearningV2CourseUnlockedWordsV1 } from '../hooks/use_learning_v2_course_unlocked_words_v1';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import V2PillSwitch from '../components/v2/V2PillSwitch';
import LearningV2WordsList from '../components/learning-v2/words/LearningV2WordsList';
import { hapticTap } from '../hooks/use-haptics';
// зачем (координатор 22.10): «Ещё N слов откроются в эпизодах урока» — закрытые слова числом из каталога фабрики, без чтений
import { learningV2ClosedWordsLineV1, learningV2LessonNewWordTotalV1 } from './learning_v2_lesson_words_closed_v1';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { learningV2CourseWordsOrdered, learningV2LessonWordToListWord, learningV2LessonWordsOrdered } from '../components/learning-v2/words/words_list_model';

// зачем: прежние имена остаются доступными отсюда (их читают тесты и другие экраны); сама модель — в components/learning-v2/words/words_list_model.ts
export { learningV2CourseWordsOrdered, learningV2LessonWordToListWord, learningV2LessonWordsOrdered };

const LOG = '[SEASON-WORDS]';
// 32 урока курса: ключи слов лежат по уроку, все локальные (один multiGet), Firestore не трогается
const COURSE_LESSON_ORDINALS: readonly number[] = Object.freeze(Array.from({ length: 32 }, (_, index) => index + 1));
type WordsScope = 'lesson' | 'course';


export default function LearningV2LessonWordsScreen() {
  const insets = useStableSafeAreaInsets();
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
  const listWords = wordsScope === 'course' ? course.words : words;
  const shownHydrated = wordsScope === 'course' ? course.hydrated : hydrated;
  const lessonWordTotal = useMemo(() => learningV2LessonNewWordTotalV1(lessonOrdinal), [lessonOrdinal]);
  const closedCount = wordsScope === 'lesson' && hydrated ? Math.max(0, lessonWordTotal - words.length) : 0;

  useEffect(() => {
    console.log(LOG, 'вход', JSON.stringify({ lessonParam: lessonParam ?? null, lessonOrdinal, targetLanguage: scope.targetLanguage, source: 'слова урока Learning V2 с телефона (AsyncStorage), сеть не читается' })); // guard-ok: вход экрана
  }, [lessonOrdinal, lessonParam, scope.targetLanguage]);
  useEffect(() => {
    console.log(LOG, 'слова', JSON.stringify({ lessonOrdinal, scope: wordsScope, hydrated: shownHydrated, count: listWords.length, lessonWordTotal, closedCount, totalSource: 'каталог фабрики в сборке', includeAuthoringPreview: __DEV__ })); // guard-ok: значения решения «список / пусто / ещё читаем»
  }, [closedCount, lessonOrdinal, lessonWordTotal, listWords.length, shownHydrated, wordsScope]);

  const g = useLv2Glass();
  const switchLabels = triLang(lang, {
    ru: ['Этот урок', 'Весь курс'], uk: ['Цей урок', 'Весь курс'], en: ['This lesson', 'Whole course'], es: ['Esta lección', 'Todo el curso'], 'pt-BR': ['Esta lição', 'Todo o curso'],
    vi: ['Bài này', 'Cả khóa học'], id: ['Pelajaran ini', 'Seluruh kursus'], tr: ['Bu ders', 'Tüm kurs'], pl: ['Ta lekcja', 'Cały kurs'],
  }); // зачем (Переводчик 22.10): вычитано на 9 языках; pt «Todo o curso», пустые состояния ru/uk — на «ты», как весь интерфейс
  const courseTitle = triLang(lang, { ru: 'Слова курса', uk: 'Слова курсу', en: 'Course words', es: 'Palabras del curso', 'pt-BR': 'Palavras do curso', vi: 'Từ vựng khóa học', id: 'Kata dalam kursus', tr: 'Kurs kelimeleri', pl: 'Słowa kursu' });
  const courseEmptyText = triLang(lang, {
    ru: 'Слова появятся здесь, когда встретишь их в занятиях курса', uk: 'Слова з’являться тут, коли зустрінеш їх у заняттях курсу', en: 'Words will appear here as you meet them in the course',
    es: 'Las palabras aparecerán aquí cuando las encuentres en el curso', 'pt-BR': 'As palavras vão aparecer aqui quando você as encontrar no curso', vi: 'Từ sẽ xuất hiện ở đây khi bạn gặp chúng trong khóa học',
    id: 'Kata akan muncul di sini saat kamu menemuinya di kursus', tr: 'Kelimeler, kurstaki alıştırmalarda karşılaştıkça burada görünecek', pl: 'Słowa pojawią się tutaj, gdy spotkasz je w kursie',
  });
  const emptyText = triLang(lang, {
    ru: 'Слова появятся здесь, когда встретишь их в занятиях этого урока',
    uk: 'Слова з’являться тут, коли зустрінеш їх у заняттях цього уроку',
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
            <Text accessibilityRole="header" style={[styles.title, { color: g.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{wordsScope === 'course' ? courseTitle : s.words.title(lessonOrdinal)}</Text>
            {/* ЗАМОК ВЛАДЕЛЬЦА 22.10 (макет words-lesson-course): число слов у заголовка — «24» у урока, «81» у курса (в коде его не было) */}
            <Text testID="learning-v2-words-count" style={[styles.count, { color: g.secondary }]} maxFontSizeMultiplier={1.2}>{listWords.length}</Text>
          </View>
          <View style={styles.switchWrap}>
            <V2PillSwitch
              testID="learning-v2-words-scope-switch"
              cells={[{ id: 'lesson', label: switchLabels[0] }, { id: 'course', label: switchLabels[1] }]}
              selected={wordsScope}
              onSelect={(id) => { hapticTap(); console.log(LOG, 'переключатель', JSON.stringify({ from: wordsScope, to: id })); setWordsScope(id === 'course' ? 'course' : 'lesson'); }} // guard-ok: одна строка на тап
            />
          </View>
          <View style={styles.body}>
            <LearningV2WordsList
              mode={wordsScope}
              words={listWords}
              hydrated={shownHydrated}
              emptyText={wordsScope === 'course' ? courseEmptyText : emptyText}
              tailLine={closedCount > 0 ? learningV2ClosedWordsLineV1(lang, closedCount) : null}
              bottomInset={insets.bottom}
            />
          </View>
        </ContentWrap>
      </View>
      {/* зачем (закон владельца 22.10: «назад везде в одном месте»): общая кнопка слоем от верха экрана, вне отступа и ContentWrap */}
      <ScreenBackButton screen="learning_v2_lesson_words" testID="learning-v2-lesson-words-back" accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })} fallback="/(tabs)/lessons" />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // шапка основного курса «Слова урока»: «‹» и заголовок 20/700, поля 12, сверху 12
  // зачем (закон «назад в одном месте»): строка высотой с общую кнопку, заголовок справа от неё и по её центру (как .topbar макета)
  // макет `.wd-hd`: заголовок 20/700 от 80 (место под ScreenBackButton), справа число слов 16/21 вторичным
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, height: SCREEN_BACK_SIZE, paddingLeft: SCREEN_BACK_RESERVED, paddingRight: 20 },
  title: { flex: 1, fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.2 },
  count: { fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] },
  body: { flex: 1 },
  // макет `.wd-sw`: таблетка под шапкой (V2PillSwitch), поля 16
  switchWrap: { paddingHorizontal: 16, paddingTop: 12 },
});
