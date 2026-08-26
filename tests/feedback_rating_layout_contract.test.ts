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

  it('composes Arena and lesson feedback through ResultsSequence instead of an absolute overlay', () => {
    const arena = read('app/arena_results.tsx');
    const quickStart = arena.indexOf("if (surfaceKind === 'quick_ready'");
    const quickEnd = arena.indexOf("if (surfaceKind === 'quick_waiting'", quickStart);
    const quickSurface = arena.slice(quickStart, quickEnd);

    const lesson = read('app/lesson_complete.tsx');
    const lessonStart = lesson.indexOf('if (!legacyCompletionSurfacesEnabled)');
    const lessonEnd = lesson.indexOf('testID="lesson-complete-loading"', lessonStart);
    const lessonSurface = lesson.slice(lessonStart, lessonEnd);

    expect(quickSurface).toContain('feedbackSlot={showArenaFeedback');
    expect(quickSurface).not.toMatch(/position:\s*['"]absolute['"][\s\S]{0,240}<ArenaFeedbackCard/);
    expect(lessonSurface).toContain('feedbackSlot={showLessonFeedback');
    expect(lessonSurface).not.toMatch(/position:\s*['"]absolute['"][\s\S]{0,240}<FeedbackRatingCard/);
  });

  it('keeps every other feedback form in vertically scrollable content', () => {
    const vocabulary = read('app/flashcards/SessionResultScreen.tsx');
    const dialogue = read('components/DialogVerdictScreen.tsx');
    const maxReview = read('app/max_voice_review.tsx');
    const rankedArena = read('app/arena_results.tsx');
    const arenaScreen = read('components/arena/ArenaScreen.tsx');

    expect(vocabulary).toContain('<ScrollView');
    expect(vocabulary).toContain('automaticallyAdjustKeyboardInsets');
    expect(dialogue).toContain('<ScrollView');
    expect(maxReview).toContain('<ScrollView');
    expect(rankedArena).toContain('<ArenaFeedbackCard kind="arena_rating"');
    expect(arenaScreen).toContain('scroll = true');
  });
});
