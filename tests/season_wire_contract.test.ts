import fs from 'node:fs';
import path from 'node:path';
// зачем (Ф4, владелец 22.10 «ПОЧЕМУ РАЗДЕЛ УРОКИ ЕЩЁ НЕ СДЕЛАН?»; координатор): «Сезон и карусель» подключён во вкладку «Уроки» под флагом, на реальных данных,
// классический курс остаётся достижимым, нажатия ведут туда же, что у старой карты, журнал [SEASON-WIRE] на месте.
import { readSource } from './helpers/read_source';

const wire = readSource('components/learning-v2/season/SeasonCourseConnected.tsx');
const flags = readSource('components/learning-v2/season/season_flags.ts');
const lessons = readSource('app/(tabs)/lessons.tsx');

describe('Сезон во вкладке «Уроки»', () => {
  it('флаг: в разработке включён, в выпуске выключен', () => {
    expect(flags).toMatch(/SEASON_SCENE_V2_ENABLED: boolean = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE/);
  });
  it('вкладка подставляет Сезон под флагом, старая карта остаётся запасной', () => {
    expect(lessons).toContain('SEASON_SCENE_V2_ENABLED ? (SeasonCourseConnected as unknown as typeof LearningV2ChaptersCourse) : LearningV2ChaptersCourse');
    expect(lessons).toContain('<LessonsCourseSurface');
    expect(lessons).not.toMatch(/<LearningV2ChaptersCourse\b/);
  });
  it('данные курса реальные: строки прогресса, колода, названия из плана; моков нет', () => {
    expect(wire).toContain('buildLearningV2CourseAccordionMapFromPreparedProgressV1');
    expect(wire).toContain('buildSeasonDeck');
    expect(wire).toContain('learningV2SessionTitleV1');
    expect(wire).not.toContain('season_preview_fixtures');
  });
  it('нажатия: эпизод → onSessionPress, «Все уроки» с классическим курсом, «Слова», «Теория»', () => {
    expect(wire).toContain('onSessionPress(card.lessonOrdinal, card.sessionOrdinal, card.sourceState)');
    expect(wire).toContain('onLegacy={props.onLegacyLessons}');
    // зачем (владелец 22.10): «Слова» — слова ЭТОГО урока (экран Learning V2), а не раздел «Карточки»
    expect(wire).toContain("pathname: '/learning_v2_lesson_words', params: { lesson: String(lesson) }");
    expect(wire).not.toContain("router.push('/flashcards'");
    expect(wire).toContain('LearningV2TheorySheet');
  });
  it('журнал [SEASON-WIRE]: вход, урок/глава, источник, каждое нажатие', () => {
    for (const key of ['вход', 'урок/глава', 'нажатие → занятие', 'нажатие → «Все уроки»', 'нажатие → «Слова»', 'нажатие → «Теория»']) expect(wire).toContain(key);
    expect(wire).toContain('[SEASON-WIRE]');
  });
  it('шрифт не сжимается, спиннера на весь экран нет', () => {
    expect(wire).not.toContain('adjustsFontSizeToFit');
    expect(wire).not.toContain('ActivityIndicator');
  });
});

describe('Сезон: экзамен главы (Learning V2 22.10)', () => {
  it('флаг экзамена: в разработке вкл, в выпуске выкл', () => {
    expect(flags).toMatch(/SEASON_CHAPTER_EXAM_ENABLED: boolean = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE/);
  });
  it('колода получает опции экзамена, результаты — из локального хранилища без сети', () => {
    expect(wire).toContain('includeExam: SEASON_CHAPTER_EXAM_ENABLED, examAvailableWhenReached: true, examPassedChapters');
    expect(wire).toContain('peekLearningV2ChapterExamRecordsV1');
    expect(wire).toContain('loadLearningV2ChapterExamRecordsV1');
    expect(wire).toContain("learningV2PassedChaptersV1(examRecords, 'en', lesson)");
  });
  it('кнопки экзамена идут на экран Learning V2 только по флагу запуска (до сигнала не рисуются)', () => {
    expect(flags).toMatch(/SEASON_CHAPTER_EXAM_START_ENABLED = false as boolean/);
    expect(wire).toContain('onStartExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onStartExam : undefined}');
    expect(wire).toContain('onOpenByExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onOpenByExam : undefined}');
    expect(wire).toContain("learningV2ChapterExamHrefV1({ lessonOrdinal: lesson, chapterOrdinal, source: 'exam_card' })");
    expect(wire).toContain("chapterOrdinal: chapterOrdinal - 1, source: 'open_by_exam'");
  });
  it('окно экзамена: факты из данных Learning V2, цена ⚡1 для Free, строка для Plus', () => {
    expect(wire).toContain('CHAPTER_EXAM_QUESTION_COUNT_V1');
    expect(wire).toContain('LEARNING_V2_CHAPTER_EXAM_MINUTES_V1');
    expect(wire).toContain("energyBadge: !examFree, plusLine: examFree ? learningV2ChapterExamCopy(lang, 'plusFree') : null");
    const card = readSource('components/learning-v2/season/SeasonExpandedCard.tsx');
    expect(card).toContain('testID="season-exam-facts"');
    expect(card).toContain('testID="season-exam-energy"');
    expect(card).toContain('testID="season-exam-plus"');
  });
});

describe('Сезон: обложка 46 % от самого верха (владелец 22.10)', () => {
  const layout = readSource('app/(tabs)/_layout.tsx');
  const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('страница «Уроки» полноэкранная под флагом сезона, шапка отступает сама', () => {
    expect(layout).toContain('SEASON_SCENE_V2_ENABLED ? [logicalTabToPhysicalPage(1, pageLayout)] : []');
    expect(lessons).toContain('const seasonBleed = useTabTopBleedInset();');
    expect(lessons).toContain('isRetainedTab ? 12 + seasonBleed : insets.top + 12');
    expect(lessons).toContain('bleedTop={isRetainedTab && seasonBleed === 0 ? insets.top : 0}');
    expect(wire).toContain('topBleed={bleed}');
  });
  it('обложка: 392 dp вместе с зоной часов, заголовок 30/36, кнопка 50, низ 44', () => {
    expect(view).toMatch(/heroTall: \{ height: 392/);
    expect(view).toMatch(/heroTitle: \{ marginTop: 4, fontSize: 30, lineHeight: 36/);
    expect(view).toMatch(/primary: \{ marginTop: 16, height: 50/);
    expect(view).toContain('heroBodyTall: { bottom: 44 }');
  });
});

describe('Сезон: чипы «Слова / Теория» внутри обложки (scenes-compact, вариант 2)', () => {
  const view2 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('на полноэкранной обложке чипы под кнопкой, под каруселью чипов нет (веера «Вся глава» больше нет)', () => {
    expect(view2).toContain('const tall = props.topBleed !== undefined && props.topBleed > 0;');
    expect(view2).toContain('<HeroChip icon="albums-outline"');
    expect(view2).toContain('{tall ? null : (');
    expect(view2).toContain('<ActionChip icon="albums-outline"');
    expect(view2).toMatch(/heroChip: \{ height: 34, paddingHorizontal: 12, borderRadius: 17/);
  });
});

describe('Сезон: хаб урока — три плитки и полноэкранные списки (владелец 22.10, макет lesson-hub-final.html)', () => {
  const view3 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  const course = readSource('components/learning-v2/season/SeasonCourse.tsx');
  const tiles = readSource('components/learning-v2/season/SeasonNavTiles.tsx');
  const picks = readSource('components/learning-v2/season/SeasonPickScreens.tsx');
  const copy = readSource('components/learning-v2/season/season_copy_card.ts');
  it('сторож «нет веера и чипов глав»: ни «Вся глава», ни скрытого меню по заголовку главы, файла веера нет', () => {
    for (const src of [view3, course, wire]) {
      expect(src).not.toContain('onWholeChapter');
      expect(src).not.toContain('SeasonChapterFan');
      expect(src).not.toContain('season-whole-chapter');
      expect(src).not.toContain('season-chapter-picker');
      expect(src).not.toContain('onChapterPicker');
    }
    expect(fs.existsSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonChapterFan.tsx'))).toBe(false);
  });
  it('сторож «три кнопки есть»: «Все главы», «Все уроки», «Классический курс» под обложкой, подписи на 9 языках', () => {
    expect(view3).toContain('<SeasonNavTiles');
    for (const key of ['allChaptersLabel', 'allLessonsLabel', 'classicLabel']) expect(view3).toContain(key);
    for (const id of ['season-all-chapters', 'season-all-lessons-button', 'season-classic-course']) expect(tiles).toContain(`testID="${id}"`);
    for (const key of ['allChapters', 'allLessons', 'classicCourse']) {
      const line = copy.split('\n').find((l) => l.trim().startsWith(`${key}:`)) ?? '';
      expect(line.match(/'[^']+'/g)?.length).toBe(9);
    }
    expect(tiles).not.toMatch(/borderWidth|borderColor/);
  });
  it('нажатия: «Все главы» → список глав, «Все уроки» → список уроков, «Классический курс» → классика; журнал [SEASON-WIRE]', () => {
    expect(course).toContain('onAllChapters={openChapters}');
    expect(course).toContain('<SeasonChaptersScreen');
    expect(course).toContain('<SeasonChapterEpisodesScreen');
    expect(wire).toContain('onAllLessons={onAllLessonsButton}');
    expect(wire).toContain('onClassic={onClassic}');
    expect(wire).toContain('classicLabel={props.legacyLessonsLabel}');
    expect(wire).toContain('onLegacyLessons();');
    for (const key of ['нажатие → «Все главы»', 'нажатие → «Классический курс»', 'нажатие → эпизоды главы', 'нажатие → карта из списка']) expect(wire + course).toContain(key);
  });
  it('списки поверх шапки вкладки: общая кнопка «назад» (ScreenBackButton) во всех трёх, строки через V2Pressable, без обводок', () => {
    expect(picks).toContain('<ScreenBackButton');
    expect(picks).toContain('export const SeasonListHeader');
    expect(wire).toContain('<SeasonListHeader');
    expect(wire).not.toContain('BackGlyph');
    expect(picks).toContain('<V2Pressable');
    expect(picks).not.toMatch(/borderWidth|borderColor/);
    expect(picks).not.toContain('adjustsFontSizeToFit');
    expect(picks).not.toContain('ActivityIndicator');
  });
  it('карточка «Ваши прошлые уроки» с хаба ушла: «Классический курс» — плитка и строка в «Все уроки»', () => {
    expect(wire).not.toContain('SeasonLegacyCard');
    expect(wire).not.toContain('legacyCard=');
    expect(wire).toContain('onLegacy={props.onLegacyLessons}');
  });
});
