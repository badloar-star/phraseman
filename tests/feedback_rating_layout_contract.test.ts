import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('feedback rating layout reachability', () => {
  it('keeps optional result feedback in the shared scroll flow before its actions', () => {
    const sequence = read('components/feedback/ResultsSequence.tsx');
    const skipStart = sequence.indexOf('<Pressable style={styles.center}');
    const skipEnd = sequence.indexOf('</Pressable>', skipStart);
    const feedbackStart = sequence.indexOf('{feedbackSlot ?');
    const actionsStart = sequence.indexOf('<Animated.View style={[styles.ctaWrap');

    expect(sequence).toContain('feedbackSlot?: React.ReactNode');
    expect(sequence).toContain('<ScrollView');
    expect(sequence).toContain('automaticallyAdjustKeyboardInsets');
    expect(sequence).toContain('<View style={styles.root}>');
    expect(skipStart).toBeGreaterThan(-1);
    expect(skipEnd).toBeGreaterThan(skipStart);
    expect(sequence.slice(skipStart, skipEnd)).not.toContain('feedbackSlot');
    expect(feedbackStart).toBeGreaterThan(skipEnd);
    expect(actionsStart).toBeGreaterThan(feedbackStart);
  });

  // зачем: D83 — экран результатов Арены удалён, остаётся урок.
  it('composes lesson feedback through ResultsSequence instead of an absolute overlay', () => {
    const lesson = read('app/lesson_complete.tsx');
    const lessonStart = lesson.indexOf('if (!legacyCompletionSurfacesEnabled)');
    const lessonEnd = lesson.indexOf('testID="lesson-complete-loading"', lessonStart);
    const lessonSurface = lesson.slice(lessonStart, lessonEnd);

    expect(lessonSurface).toContain('feedbackSlot={showLessonFeedback');
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
