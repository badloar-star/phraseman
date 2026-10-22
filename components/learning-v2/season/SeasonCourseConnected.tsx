// ════════════════════════════════════════════════════════════════════════════
// SeasonCourseConnected.tsx — «Сезон и карусель карт» на РЕАЛЬНЫХ данных курса: тот же набор пропсов, что у LearningV2ChaptersCourse, поэтому во вкладке
// «Уроки» (app/(tabs)/lessons.tsx) его подставляют вместо старой карты одной заменой компонента под флагом SEASON_SCENE_V2_ENABLED.
//
// зачем (Ф4, владелец 22.10 «ПОЧЕМУ РАЗДЕЛ УРОКИ ЕЩЁ НЕ СДЕЛАН? НЕ ВИЖУ»; координатор): экран «Обучение — способ 2» жил только в /dev_season_preview на моках.
// Данные — те же, что у старой карты, новых чтений Firebase и диска нет: подготовленный прогресс (preparedProgress) → строки занятий урока
// (buildLearningV2CourseAccordionMapFromPreparedProgressV1) → колода (buildSeasonDeck); названия занятий, сцены глав и арки — из session_titles_v1.generated
// (написаны только по-русски и только для написанных уроков — на других языках и там, где названия нет, подпись «Эпизод N», выдумок нет);
// нажатия ведут туда же, что у старой карты: эпизод → onSessionPress (окно запуска/замок/Plus решает вкладка), «Урок N»/«Начать с другого места» → список
// «Все уроки» (в нём остаётся «Классический курс»), «Слова» → слова урока, «Теория» → шторка теории урока. 22.10 (владелец, макет lesson-hub-final.html): под обложкой три плитки
// «Все главы» (список глав внутри Сезона) / «Все уроки» / «Классический курс» (onLegacyLessons); списки — полноэкранные с общей кнопкой «назад» (ScreenBackButton).
// Нет в лёгком индексе (не выдумываем): фраза с переводом на карте эпизода, слова эпизода, число и номер задания — карта показывает название занятия.
// Журнал [SEASON-WIRE]: вход, урок, глава, источник данных, куда ведёт каждое нажатие.
// ════════════════════════════════════════════════════════════════════════════
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { learningV2ChapterExamHrefV1, learningV2PassedChaptersV1 } from '../../../app/learning_v2_chapter_exam_v1';
import { loadLearningV2ChapterExamRecordsV1, peekLearningV2ChapterExamRecordsV1 } from '../../../app/learning_v2_chapter_exam_store_v1';
import { pickInitialLessonOrdinal } from '../../../app/learning_v2_last_lesson';
import { isLearningV2SessionStarResultsHydrated, subscribeLearningV2SessionStarResults } from '../../../app/learning_v2_session_star_results_store';
import { getStableId, peekStableId } from '../../../app/stable_id';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../../../modules/learning-v2/content/course_topology_v1';
import { learningV2ChapterSceneV1, learningV2LessonArcV1 } from '../../../modules/learning-v2/content/session_titles_v1.generated';
import { learningV2SessionTitleForLocaleV1 } from '../../../modules/learning-v2/titles/session_titles_i18n_v1';
import { deriveLocalOfflineProgressAccountScopeHash } from '../../../modules/learning-v2/progress/progress_account_scope';
import { buildLearningV2CourseAccordionMapFromPreparedProgressV1, type LearningV2CourseAccordionRowV1 } from '../../../modules/learning-v2/map/course_accordion_map_model_v1';
import { hasLearningV2TheoryV1, loadLearningV2TheoryV1, learningV2TheorySectionForSessionV1 } from '../../../modules/learning-v2/theory/learning_v2_theory_v1';
import { CHAPTER_EXAM_PASS_CORRECT_V1, CHAPTER_EXAM_QUESTION_COUNT_V1 } from '../../../modules/learning-v2/exam/chapter_exam_v1';
import { useEnergy } from '../../EnergyContext';
import { usePremium } from '../../PremiumContext';
import { useTheme } from '../../ThemeContext';
import { useTabTopBleedInset } from '../../tab_top_bleed';
import { learningV2ChapterIonIcon } from '../icons/learningV2IonIcons';
import LearningV2AllLessonsList, { type AllLessonsRow } from '../LearningV2AllLessonsList';
import type LearningV2ChaptersCourse from '../LearningV2ChaptersCourse';
import { LEARNING_V2_CHAPTER_EXAM_MINUTES_V1, learningV2ChapterExamEpisodeRangeV1 } from '../LearningV2ChapterExamSheet';
import { learningV2ChapterExamCopy, learningV2ChapterExamPassFrom } from '../learning_v2_chapter_exam_copy';
import LearningV2TheorySheet from '../LearningV2TheorySheet';
import type { SeasonExamPanel } from './SeasonExpandedCard';
import SeasonCourse from './SeasonCourse';
import { SeasonListHeader } from './SeasonPickScreens';
import { seasonTapTooSoon } from './season_tap_guard';
import type { SeasonChapterInfo, SeasonEpisodeInfo } from './SeasonCourseView';
import { seasonEpisodeLabel, seasonText } from './season_copy';
import { seasonCardText } from './season_copy_card';
import { buildSeasonDeck, type SeasonEpisodeCard } from './season_course_model';
import { SEASON_CHAPTER_EXAM_ENABLED, SEASON_CHAPTER_EXAM_START_ENABLED } from './season_flags';

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
  const { isDark } = useTheme();
  // зачем (владелец 22.10: высота сцен 46 % для всех, фон до самого верха; схема eab9aa35d): страница «Уроки» полноэкранная — обложка идёт под часы, шапка отступает на высоту зоны часов
  const bleed = useTabTopBleedInset();
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
  // звёзды занятий подняты в память вкладкой «Уроки»? (подписка на хранилище, без чтений диска и сети)
  const starsReady = useSyncExternalStore(subscribeLearningV2SessionStarResults, isLearningV2SessionStarResultsHydrated, isLearningV2SessionStarResultsHydrated);
  const episodeInfo = useCallback((card: SeasonEpisodeCard): SeasonEpisodeInfo => {
    // зачем (координатор 22.10): названия эпизодов на 8 языках — learningV2SessionTitleForLocaleV1 (10 · ПЕРЕВОДЧИК), нет перевода — null → «Эпизод N»
    const authored = learningV2SessionTitleForLocaleV1(card.lessonOrdinal, card.sessionOrdinal, lang);
    const label = seasonEpisodeLabel(lang, card.sessionOrdinal);
    // фразы с переводом, слов и числа заданий в лёгком индексе нет — не выдумываем: карта показывает название занятия (или «Эпизод N»)
    // зачем (владелец 22.10): звёзды пройденного эпизода — из уже поднятых вкладкой «Уроки» звёзд занятий (память, без чтений); правило карты курса: у пройденного не меньше одной звезды, если результата нет
    // зачем (владелец/координатор 22.10): пока вкладка не подняла звёзды в память — 'pending' (звёзд нет, не «1»), потом число; без прыжка 1 → 3
    const stars = card.state === 'done' ? (starsReady ? Math.max(1, props.stars[card.id] ?? 1) : 'pending' as const) : null;
    return { title: authored ?? label, phrase: authored ?? label, progress: null, taskLine: null, translation: null, words: [], tasksCount: null, stars };
  }, [lang, props.stars, starsReady]);
  const chapterInfo = useCallback((chapterOrdinal: number): SeasonChapterInfo => ({
    scene: (ruAuthored ? learningV2ChapterSceneV1(lesson, chapterOrdinal) : null) ?? seasonText(lang, 'chapterOf', { n: chapterOrdinal, m: chapterCount }),
    icon: learningV2ChapterIonIcon(lesson, chapterOrdinal),
  }), [chapterCount, lang, lesson, ruAuthored]);
  const resumeLine = useMemo(() => {
    if (newcomer) return null;
    const card = deck.cards[deck.currentIndex];
    return card && card.kind === 'episode' ? learningV2SessionTitleForLocaleV1(card.lessonOrdinal, card.sessionOrdinal, lang) : null;
  }, [deck, lang, newcomer]);

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
  // зачем (проверка Optimistic UI 22.10): двойной тап по «Продолжить» (хаб, список, раскрытая карта — все идут сюда) не открывает окно запуска дважды
  const primaryTapRef = useRef(0);
  const classicTapRef = useRef(0);
  const onPrimary = useCallback((card: SeasonEpisodeCard) => {
    if (seasonTapTooSoon(primaryTapRef, 'primary')) return;
    console.log(`${LOG} нажатие → занятие`, JSON.stringify({ lesson: card.lessonOrdinal, session: card.sessionOrdinal, chapter: card.chapterOrdinal, state: card.sourceState, to: 'onSessionPress(окно запуска/замок/Plus решает вкладка)' })); // guard-ok: куда ведёт нажатие
    onSessionPress(card.lessonOrdinal, card.sessionOrdinal, card.sourceState);
  }, [onSessionPress]);
  const onWords = useCallback(() => {
    // зачем (владелец 22.10: «„СЛОВА“ НАЖИМАЮ, ОТКРЫВАЕТСЯ РАЗДЕЛ КАРТОЧКИ»): «Слова» открывают слова ЭТОГО урока (экран app/learning_v2_lesson_words.tsx, вид «Слов урока» основного курса), а не раздел «Карточки»; данные — слова урока с телефона
    console.log('[SEASON-WORDS] нажатие → «Слова»', JSON.stringify({ lesson, to: '/learning_v2_lesson_words' })); // guard-ok: куда ведёт нажатие
    router.push({ pathname: '/learning_v2_lesson_words', params: { lesson: String(lesson) } } as never);
  }, [lesson, router]);
  const theory = useMemo(() => (hasLearningV2TheoryV1(lesson, lang) ? loadLearningV2TheoryV1(lesson, lang) : null), [lang, lesson]);
  const theorySection = useMemo(() => {
    const cur = deck.cards[deck.currentIndex];
    return theory ? learningV2TheorySectionForSessionV1(theory, cur ? cur.sessionOrdinal : null) : '01';
  }, [deck, theory]);
  const onTheory = useCallback(() => {
    console.log(`${LOG} нажатие → «Теория»`, JSON.stringify({ lesson, found: theory !== null, section: theorySection })); // guard-ok: куда ведёт нажатие
    if (theory) setTheoryOpen(true);
  }, [lesson, theory, theorySection]);
  // зачем (координатор 22.10, эталон chapter-exam-season.html `zoomX`): окно перед стартом — факты «12 вопросов · 10 чтобы сдать · ~N минут», цена ⚡1 для Free, «С Plus экзамен бесплатный» для Plus;
  // числа и минуты — из данных Learning V2 (движок экзамена и темп курса), тексты на 9 языках — их словарь. Free/Plus — как в их шторке: Premium или безлимитная энергия.
  const { hasPremiumAccess } = usePremium();
  const { isUnlimited } = useEnergy();
  const examFree = hasPremiumAccess || isUnlimited;
  const examInfo = useCallback((chapterOrdinal: number): Readonly<{ description: string | null; panel: SeasonExamPanel }> => {
    const range = learningV2ChapterExamEpisodeRangeV1(chapterOrdinal);
    const next = chapterOrdinal < chapterCount ? chapterOrdinal + 1 : null;
    const description = [
      learningV2ChapterExamCopy(lang, 'scope', { a: range.first, b: range.last }),
      next ? learningV2ChapterExamCopy(lang, 'unlocks', { n: next }) : null,
    ].filter(Boolean).join(' ');
    const facts = [
      `${CHAPTER_EXAM_QUESTION_COUNT_V1} ${learningV2ChapterExamCopy(lang, 'questions')}`,
      learningV2ChapterExamPassFrom(lang, CHAPTER_EXAM_PASS_CORRECT_V1), // «от N верных» (Переводчик, ba8a5ebd4)
      `~${LEARNING_V2_CHAPTER_EXAM_MINUTES_V1} ${learningV2ChapterExamCopy(lang, 'minutes')}`,
    ];
    return { description, panel: { facts, energyBadge: !examFree, plusLine: examFree ? learningV2ChapterExamCopy(lang, 'plusFree') : null } };
  }, [chapterCount, examFree, lang]);
  const onStartExam = useCallback((chapterOrdinal: number) => {
    const href = learningV2ChapterExamHrefV1({ lessonOrdinal: lesson, chapterOrdinal, source: 'exam_card' });
    console.log(`${LOG} нажатие → «Начать экзамен»`, JSON.stringify({ href, free: examFree })); // guard-ok: куда ведёт нажатие
    router.push(href as never);
  }, [examFree, lesson, router]);
  const onOpenByExam = useCallback((chapterOrdinal: number) => {
    // закрытый эпизод следующей главы открывается экзаменом ПРЕДЫДУЩЕЙ главы (контракт Learning V2)
    const href = learningV2ChapterExamHrefV1({ lessonOrdinal: lesson, chapterOrdinal: chapterOrdinal - 1, source: 'open_by_exam' });
    console.log(`${LOG} нажатие → «Открыть экзаменом главы»`, JSON.stringify({ href })); // guard-ok: куда ведёт нажатие
    router.push(href as never);
  }, [lesson, router]);
  const { onLegacyLessons } = props;
  // зачем (владелец 22.10): «Классический курс» — отдельная плитка под обложкой, а не карточка «Ваши прошлые уроки»; ведёт туда же (onLegacyLessons)
  const onClassic = useCallback(() => {
    if (seasonTapTooSoon(classicTapRef, 'classic')) return;
    console.log(`${LOG} нажатие → «Классический курс»`, JSON.stringify({ done: props.legacyProgress?.done ?? null, total: props.legacyProgress?.total ?? null, to: 'onLegacyLessons(классический курс)' })); // guard-ok: куда ведёт нажатие
    onLegacyLessons();
  }, [onLegacyLessons, props.legacyProgress]);
  const onNotFromStart = useCallback(() => openLessonsList('not_from_start'), [openLessonsList]);
  const onLessonPicker = useCallback(() => openLessonsList('lesson_pill'), [openLessonsList]);
  const onAllLessonsButton = useCallback(() => openLessonsList('tile_all_lessons'), [openLessonsList]);

  // зачем: аппаратная «назад» на списке уроков закрывает список (как кнопка), а не уводит с вкладки
  useEffect(() => {
    if (!allLessonsOpen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log(`${LOG} аппаратная «назад» из «Все уроки»`, JSON.stringify({ to: 'хаб' })); // guard-ok: куда ведёт нажатие
      setAllLessonsOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [allLessonsOpen]);

  if (allLessonsOpen) {
    return (
      <View testID="season-all-lessons" style={styles.root}>
        <SeasonListHeader screen="season_all_lessons" kicker={null} title={seasonCardText(lang, 'allLessons')} onBack={() => setAllLessonsOpen(false)} testID="season-all-lessons-header" />
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
        topPadding={bleed > 0 ? bleed : (props.topPadding ?? 0)}
        topBleed={bleed}
        avatarSlot={props.headerAccessory}
        bottomPadding={props.bottomPadding}
        reducedMotion={props.reducedMotion}
        onPrimary={onPrimary}
        onNotFromStart={onNotFromStart}
        onLessonPicker={onLessonPicker}
        onAllLessons={onAllLessonsButton}
        onClassic={onClassic}
        classicLabel={props.legacyLessonsLabel}
        classicValue={props.legacyProgress ? seasonText(lang, 'doneOf', { k: props.legacyProgress.done, n: props.legacyProgress.total }) : null}
        onWords={onWords}
        onTheory={onTheory}
        examInfo={SEASON_CHAPTER_EXAM_ENABLED ? examInfo : undefined}
        onStartExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onStartExam : undefined}
        onOpenByExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onOpenByExam : undefined}
      />
      <LearningV2TheorySheet visible={theoryOpen} theory={theory} lang={lang} initialSection={theorySection} onClose={() => setTheoryOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default memo(SeasonCourseConnected);
