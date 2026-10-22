// ════════════════════════════════════════════════════════════════════════════
// SeasonCourseConnected.tsx — «Сезон и карусель карт» на РЕАЛЬНЫХ данных курса: тот же набор пропсов, что у LearningV2ChaptersCourse, поэтому во вкладке
// «Уроки» (app/(tabs)/lessons.tsx) его подставляют вместо старой карты одной заменой компонента под флагом SEASON_SCENE_V2_ENABLED.
//
// зачем (Ф4, владелец 22.10 «ПОЧЕМУ РАЗДЕЛ УРОКИ ЕЩЁ НЕ СДЕЛАН? НЕ ВИЖУ»; координатор): экран «Обучение — способ 2» жил только в /dev_season_preview на моках.
// Данные — те же, что у старой карты, новых чтений Firebase и диска нет: подготовленный прогресс (preparedProgress) → строки занятий урока
// (buildLearningV2CourseAccordionMapFromPreparedProgressV1) → колода (buildSeasonDeck); названия занятий, сцены глав и арки — из session_titles_v1.generated
// (написаны только по-русски и только для написанных уроков — на других языках и там, где названия нет, подпись «Эпизод N», выдумок нет);
// нажатия ведут туда же, что у старой карты: эпизод → onSessionPress (окно запуска/замок/Plus решает вкладка), «Урок N»/«Начать с другого места» → список
// «Все уроки» (в нём остаётся «Классический курс»), «Слова» → колоды, «Теория» → шторка теории урока.
// Нет в лёгком индексе (не выдумываем): фраза с переводом на карте эпизода, слова эпизода, число и номер задания — карта показывает название занятия.
// Журнал [SEASON-WIRE]: вход, урок, глава, источник данных, куда ведёт каждое нажатие.
// ════════════════════════════════════════════════════════════════════════════
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { learningV2PassedChaptersV1 } from '../../../app/learning_v2_chapter_exam_v1';
import { loadLearningV2ChapterExamRecordsV1, peekLearningV2ChapterExamRecordsV1 } from '../../../app/learning_v2_chapter_exam_store_v1';
import { pickInitialLessonOrdinal } from '../../../app/learning_v2_last_lesson';
import { getStableId, peekStableId } from '../../../app/stable_id';
import { triLang } from '../../../constants/i18n';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../../../modules/learning-v2/content/course_topology_v1';
import { learningV2ChapterSceneV1, learningV2LessonArcV1, learningV2SessionTitleV1 } from '../../../modules/learning-v2/content/session_titles_v1.generated';
import { deriveLocalOfflineProgressAccountScopeHash } from '../../../modules/learning-v2/progress/progress_account_scope';
import { buildLearningV2CourseAccordionMapFromPreparedProgressV1, type LearningV2CourseAccordionRowV1 } from '../../../modules/learning-v2/map/course_accordion_map_model_v1';
import { hasLearningV2TheoryV1, loadLearningV2TheoryV1, learningV2TheorySectionForSessionV1 } from '../../../modules/learning-v2/theory/learning_v2_theory_v1';
import PressableHybrid from '../../PressableHybrid';
import { useTheme } from '../../ThemeContext';
import BackGlyph from '../../v2/BackGlyph';
import { learningV2ChapterIonIcon } from '../icons/learningV2IonIcons';
import LearningV2AllLessonsList, { type AllLessonsRow } from '../LearningV2AllLessonsList';
import type LearningV2ChaptersCourse from '../LearningV2ChaptersCourse';
import { useLv2Glass } from '../LearningV2Glass';
import LearningV2TheorySheet from '../LearningV2TheorySheet';
import SeasonCourse from './SeasonCourse';
import type { SeasonChapterInfo, SeasonEpisodeInfo } from './SeasonCourseView';
import { seasonEpisodeLabel, seasonText } from './season_copy';
import { buildSeasonDeck, type SeasonEpisodeCard } from './season_course_model';
import { SEASON_CHAPTER_EXAM_ENABLED } from './season_flags';

const LOG = '[SEASON-WIRE]';
type SessionRow = Extract<LearningV2CourseAccordionRowV1, { kind: 'session' }>;
export type SeasonCourseConnectedProps = React.ComponentProps<typeof LearningV2ChaptersCourse>;

function currentLessonOrdinal(currentSessionId: string | null): number {
  const match = /^lesson-(\d+):session:\d+$/.exec(currentSessionId ?? '');
  return match ? Number(match[1]) : 1;
}

function SeasonCourseConnected(props: SeasonCourseConnectedProps) {
  const { lang, scopeKey, preparedProgress, completedSessionIds, onSessionPress, isSessionMaterialAvailable, titles, onExpandedLesson } = props;
  const router = useRouter();
  const g = useLv2Glass();
  const { isDark } = useTheme();
  const canonical = currentLessonOrdinal(props.currentSessionId);
  const [requestedLesson, setRequestedLesson] = useState(() => {
    const choice = pickInitialLessonOrdinal({ remembered: props.preferredLessonOrdinal ?? null, canonical, visibleOrdinals: null });
    console.log(`${LOG} вход`, JSON.stringify({ scopeKey, remembered: props.preferredLessonOrdinal ?? null, canonical, picked: choice.ordinal, branch: choice.branch, completed: completedSessionIds.length, source: 'prepared_progress(кэш вкладки «Уроки»), сеть не читается' })); // guard-ok: вход экрана
    return choice.ordinal;
  });
  const userChoseRef = useRef(false);
  const canonicalSeenRef = useRef(canonical);
  useEffect(() => {
    if (canonicalSeenRef.current === canonical) return;
    console.log(`${LOG} текущий урок сменился`, JSON.stringify({ from: canonicalSeenRef.current, to: canonical, userChose: userChoseRef.current })); // guard-ok: ветка и значение
    canonicalSeenRef.current = canonical;
    userChoseRef.current = false;
    setRequestedLesson(canonical);
  }, [canonical]);
  const rememberedLesson = props.preferredLessonOrdinal ?? null;
  useEffect(() => {
    if (rememberedLesson === null || userChoseRef.current) return;
    setRequestedLesson((cur) => {
      if (cur !== rememberedLesson) console.log(`${LOG} запомненный урок пришёл позже`, JSON.stringify({ from: cur, to: rememberedLesson })); // guard-ok: ветка и значение
      return rememberedLesson;
    });
  }, [rememberedLesson]);

  const isVisible = useCallback((lesson: number, session: number) => isSessionMaterialAvailable?.(lesson, session) ?? true, [isSessionMaterialAvailable]);
  const visibleLessons = useMemo(
    () => titles.map((_title, i) => i + 1).filter((ordinal) => Array.from({ length: LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_x, i) => i + 1).some((s) => isVisible(ordinal, s))),
    [isVisible, titles],
  );
  const lesson = visibleLessons.includes(requestedLesson)
    ? requestedLesson
    : (visibleLessons.includes(canonical) ? canonical : (visibleLessons[visibleLessons.length - 1] ?? requestedLesson));

  const rows = useMemo(
    () => buildLearningV2CourseAccordionMapFromPreparedProgressV1({ projectionScopeKey: scopeKey, expandedLessonOrdinal: lesson, preparedProgress }).rows,
    [lesson, preparedProgress, scopeKey],
  );
  const sessionRows = useMemo(
    () => rows.filter((row): row is SessionRow => row.kind === 'session' && row.lessonOrdinal === lesson && isVisible(row.lessonOrdinal, row.sessionOrdinal)),
    [isVisible, lesson, rows],
  );
  // зачем (экзамен главы, Learning V2 22.10): сданные экзамены — карта «пройдена»; первый кадр из памяти процесса (peek), диск — фоном; сеть не читается
  const [examRecords, setExamRecords] = useState(() => {
    const id = peekStableId();
    const hash = id ? deriveLocalOfflineProgressAccountScopeHash(id) : null;
    const peeked = hash ? peekLearningV2ChapterExamRecordsV1(hash) : null;
    console.log(`${LOG} экзамены: первый кадр`, JSON.stringify({ enabled: SEASON_CHAPTER_EXAM_ENABLED, hasId: id !== null, source: peeked ? 'память' : 'нет (диск фоном)', count: peeked ? Object.keys(peeked).length : 0 })); // guard-ok: откуда данные
    return peeked;
  });
  useEffect(() => {
    if (!SEASON_CHAPTER_EXAM_ENABLED) return undefined;
    let cancelled = false;
    void getStableId()
      .then((id) => loadLearningV2ChapterExamRecordsV1(deriveLocalOfflineProgressAccountScopeHash(id)))
      .then((records) => {
        if (cancelled) return;
        console.log(`${LOG} экзамены: диск`, JSON.stringify({ count: Object.keys(records).length })); // guard-ok: откуда данные
        setExamRecords(records);
      })
      .catch((error: unknown) => { console.warn(`${LOG} экзамены: чтение не удалось`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); }); // guard-ok: catch пишет причину
    return () => { cancelled = true; };
  }, [lesson]);
  const examPassedChapters = useMemo<ReadonlySet<number>>(() => new Set(examRecords ? learningV2PassedChaptersV1(examRecords, 'en', lesson).keys() : []), [examRecords, lesson]);
  const deck = useMemo(
    () => buildSeasonDeck(sessionRows, { includeExam: SEASON_CHAPTER_EXAM_ENABLED, examAvailableWhenReached: true, examPassedChapters }),
    [examPassedChapters, sessionRows],
  );
  const chapterCount = deck.chapters.length;
  const newcomer = completedSessionIds.length === 0;
  useEffect(() => {
    const cur = deck.cards[deck.currentIndex];
    console.log(`${LOG} урок/глава`, JSON.stringify({ lesson, chapters: chapterCount, cards: deck.cards.length, currentIndex: deck.currentIndex, currentSession: cur ? cur.sessionOrdinal : null, currentChapter: cur ? cur.chapterOrdinal : null, currentState: cur ? cur.state : null, newcomer, rows: rows.length })); // guard-ok: что видит человек
  }, [chapterCount, deck, lesson, newcomer, rows.length]);

  const ruAuthored = lang === 'ru';
  const episodeInfo = useCallback((card: SeasonEpisodeCard): SeasonEpisodeInfo => {
    const authored = ruAuthored ? learningV2SessionTitleV1(card.lessonOrdinal, card.sessionOrdinal) : null;
    const label = seasonEpisodeLabel(lang, card.sessionOrdinal);
    // фразы с переводом, слов и числа заданий в лёгком индексе нет — не выдумываем: карта показывает название занятия (или «Эпизод N»)
    return { title: authored ?? label, phrase: authored ?? label, progress: null, taskLine: null, translation: null, words: [], tasksCount: null };
  }, [lang, ruAuthored]);
  const chapterInfo = useCallback((chapterOrdinal: number): SeasonChapterInfo => ({
    scene: (ruAuthored ? learningV2ChapterSceneV1(lesson, chapterOrdinal) : null) ?? seasonText(lang, 'chapterOf', { n: chapterOrdinal, m: chapterCount }),
    icon: learningV2ChapterIonIcon(lesson, chapterOrdinal),
  }), [chapterCount, lang, lesson, ruAuthored]);
  const resumeLine = useMemo(() => {
    if (newcomer) return null;
    const card = deck.cards[deck.currentIndex];
    return card && card.kind === 'episode' && ruAuthored ? learningV2SessionTitleV1(card.lessonOrdinal, card.sessionOrdinal) : null;
  }, [deck, newcomer, ruAuthored]);

  const [allLessonsOpen, setAllLessonsOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const completed = useMemo(() => new Set(completedSessionIds), [completedSessionIds]);
  const allLessonRows = useMemo<readonly AllLessonsRow[]>(() => {
    const byLesson = new Map<number, number>();
    for (const row of rows) if (row.kind === 'session' && completed.has(row.id)) byLesson.set(row.lessonOrdinal, (byLesson.get(row.lessonOrdinal) ?? 0) + 1);
    return visibleLessons.map((ordinal) => ({ ordinal, title: titles[ordinal - 1] ?? '', completedCount: byLesson.get(ordinal) ?? 0, isCurrent: ordinal === lesson, isAvailable: true, isInProgress: false }));
  }, [completed, lesson, rows, titles, visibleLessons]);

  const openLessonsList = useCallback((from: string) => {
    console.log(`${LOG} нажатие → «Все уроки»`, JSON.stringify({ from, lesson })); // guard-ok: куда ведёт нажатие
    setAllLessonsOpen(true);
  }, [lesson]);
  const openLesson = useCallback((ordinal: number) => {
    console.log(`${LOG} нажатие → урок`, JSON.stringify({ from: lesson, to: ordinal })); // guard-ok: куда ведёт нажатие
    userChoseRef.current = true;
    setRequestedLesson(ordinal);
    onExpandedLesson(ordinal);
    setAllLessonsOpen(false);
  }, [lesson, onExpandedLesson]);
  const onPrimary = useCallback((card: SeasonEpisodeCard) => {
    console.log(`${LOG} нажатие → занятие`, JSON.stringify({ lesson: card.lessonOrdinal, session: card.sessionOrdinal, chapter: card.chapterOrdinal, state: card.sourceState, to: 'onSessionPress(окно запуска/замок/Plus решает вкладка)' })); // guard-ok: куда ведёт нажатие
    onSessionPress(card.lessonOrdinal, card.sessionOrdinal, card.sourceState);
  }, [onSessionPress]);
  const onWords = useCallback(() => {
    console.log(`${LOG} нажатие → «Слова»`, JSON.stringify({ to: '/flashcards' })); // guard-ok: куда ведёт нажатие
    router.push('/flashcards' as never);
  }, [router]);
  const theory = useMemo(() => (hasLearningV2TheoryV1(lesson, lang) ? loadLearningV2TheoryV1(lesson, lang) : null), [lang, lesson]);
  const theorySection = useMemo(() => {
    const cur = deck.cards[deck.currentIndex];
    return theory ? learningV2TheorySectionForSessionV1(theory, cur ? cur.sessionOrdinal : null) : '01';
  }, [deck, theory]);
  const onTheory = useCallback(() => {
    console.log(`${LOG} нажатие → «Теория»`, JSON.stringify({ lesson, found: theory !== null, section: theorySection })); // guard-ok: куда ведёт нажатие
    if (theory) setTheoryOpen(true);
  }, [lesson, theory, theorySection]);
  const onChapterPicker = useCallback(() => {
    console.log(`${LOG} нажатие → выбор главы`, JSON.stringify({ lesson, to: 'отдельного экрана нет: главы листает веер «Вся глава»' })); // guard-ok: куда ведёт нажатие
  }, [lesson]);
  const onNotFromStart = useCallback(() => openLessonsList('not_from_start'), [openLessonsList]);
  const onLessonPicker = useCallback(() => openLessonsList('lesson_pill'), [openLessonsList]);

  if (allLessonsOpen) {
    return (
      <View testID="season-all-lessons" style={styles.root}>
        <View style={[styles.header, { paddingTop: props.topPadding ?? 0 }]}>
          <PressableHybrid variant="icon" accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })} onPress={() => setAllLessonsOpen(false)} style={styles.back} contentStyle={styles.backContent}>
            <BackGlyph size={24} color={g.text} />
          </PressableHybrid>
          <Text style={[styles.headerTitle, { color: g.text }]}>{triLang(lang, { ru: 'Все уроки', en: 'All lessons', uk: 'Усі уроки', es: 'Todas las lecciones', 'pt-BR': 'Todas as lições', vi: 'Tất cả bài học', id: 'Semua pelajaran', tr: 'Tüm dersler', pl: 'Wszystkie lekcje' })}</Text>
        </View>
        <LearningV2AllLessonsList
          lang={lang}
          rows={allLessonRows}
          sessionsPerLesson={LEARNING_V2_LESSON_SESSION_COUNT_V1}
          selectedOrdinal={lesson}
          legacyLabel={props.legacyLessonsLabel}
          onLegacy={props.onLegacyLessons}
          onOpenLesson={openLesson}
          onLockedLesson={props.onLockedLessonPress}
          bottomPadding={props.bottomPadding}
        />
      </View>
    );
  }

  return (
    <View testID="season-course" style={styles.root}>
      <SeasonCourse
        // новая колода (смена урока/прогресса) пересоздаёт состояние карусели: карта текущего эпизода — в фокусе
        key={`${lesson}|${deck.cards.length}|${deck.currentIndex}`}
        lang={lang}
        theme={isDark ? 'dark' : 'light'}
        lessonOrdinal={lesson}
        lessonTitle={titles[lesson - 1] ?? ''}
        arcTitle={ruAuthored ? learningV2LessonArcV1(lesson) : null}
        chapterCount={chapterCount}
        deck={deck}
        newcomer={newcomer}
        resumeLine={resumeLine}
        episodeInfo={episodeInfo}
        chapterInfo={chapterInfo}
        topPadding={props.topPadding ?? 0}
        avatarSlot={props.headerAccessory}
        bottomPadding={props.bottomPadding}
        reducedMotion={props.reducedMotion}
        onPrimary={onPrimary}
        onNotFromStart={onNotFromStart}
        onLessonPicker={onLessonPicker}
        onChapterPicker={onChapterPicker}
        onWords={onWords}
        onTheory={onTheory}
      />
      <LearningV2TheorySheet visible={theoryOpen} theory={theory} lang={lang} initialSection={theorySection} onClose={() => setTheoryOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
  back: { width: 44, height: 44 },
  backContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.4 },
});

export default memo(SeasonCourseConnected);
