import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('feedback rating layout reachability', () => {
  // зачем (владелец 01.10 «старые экраны заменить на макетные», PM-137): итог урока — общий экран завершения
  // V2DoneScreen; прежний ResultsSequence снят. Форма «Всё было понятно?» живёт в feedbackSlot нового экрана:
  // внутри прокрутки, после содержимого и ДО закреплённых кнопок, и видна над клавиатурой.
  it('keeps optional result feedback in the shared scroll flow before its actions', () => {
    const done = read('components/completion/V2DoneScreen.tsx');
    const scrollStart = done.indexOf('<ScrollView');
    const feedbackAt = done.indexOf('{props.feedbackSlot ?');
    const scrollEnd = done.indexOf('</ScrollView>');
    const dockAt = done.indexOf('<View style={[s.dock');

    expect(done).toContain('feedbackSlot?: ReactNode');
    expect(done).toContain('automaticallyAdjustKeyboardInsets');
    expect(scrollStart).toBeGreaterThan(-1);
    expect(feedbackAt).toBeGreaterThan(scrollStart);
    expect(scrollEnd).toBeGreaterThan(feedbackAt);
    expect(dockAt).toBeGreaterThan(scrollEnd);
  });

  // зачем: D83 — экран результатов Арены удалён, остаётся урок; итог урока — V2DoneScreen (01.10).
  it('composes lesson feedback through the V2 done screen instead of an absolute overlay', () => {
    const lesson = read('app/lesson_complete.tsx');
    const lessonStart = lesson.indexOf('if (!legacyCompletionSurfacesEnabled)');
    const lessonEnd = lesson.indexOf('testID="lesson-complete-loading"', lessonStart);
    const lessonSurface = lesson.slice(lessonStart, lessonEnd);

    expect(lessonSurface).toContain('<V2DoneScreen');
    // зачем (db61aa3e4, 13.10): слот отзыва открывается и для мягкого предложения Plus после урока — оценка урока остаётся в нём же.
    expect(lessonSurface).toContain('feedbackSlot={lessonSoftUpsellVisible || (isComboCompletion && comboBreakdown.length > 0) || showLessonFeedback ?');
    expect(lessonSurface).toMatch(/\{showLessonFeedback \? \(\s*<FeedbackRatingCard\s+kind="lesson"/);
    expect(lessonSurface).not.toMatch(/position:\s*['"]absolute['"][\s\S]{0,240}<FeedbackRatingCard/);
  });

  it('keeps every other feedback form in vertically scrollable content', () => {
    // 05.10 (решение 3): прокрутку итога Карточек рисует CardsSessionResultV2.
    const vocabulary = read('app/flashcards/CardsSessionResultV2.tsx');
    const dialogue = read('components/DialogVerdictScreen.tsx');

    expect(vocabulary).toContain('<ScrollView');
    expect(vocabulary).toContain('automaticallyAdjustKeyboardInsets');
    expect(dialogue).toContain('<ScrollView');
  });
});
