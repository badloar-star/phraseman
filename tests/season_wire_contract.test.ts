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
    expect(wire).toContain("router.push('/flashcards'");
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
  it('кнопки прохождения экзамена не передаются, пока нет экрана', () => {
    expect(wire).not.toContain('onStartExam');
    expect(wire).not.toContain('onOpenByExam');
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
  it('на полноэкранной обложке чипы под кнопкой, внизу остаётся только «Вся глава»', () => {
    expect(view2).toContain('const tall = props.topBleed !== undefined && props.topBleed > 0;');
    expect(view2).toContain('<HeroChip icon="albums-outline"');
    expect(view2).toContain('{tall ? null : <ActionChip icon="albums-outline"');
    expect(view2).toMatch(/heroChip: \{ height: 34, paddingHorizontal: 12, borderRadius: 17/);
  });
});
