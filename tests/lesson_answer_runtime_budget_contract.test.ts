import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('lesson answer runtime budget contract', () => {
  // зачем (владелец 2026-09-17): жёлтый блок-совет после ответа удалён
  // навсегда (docs/work/tasks/2026-09-17_lesson_teaching_note_removed.md) —
  // вместе с ним ушёл и AsyncStorage-путь, который проверял этот тест.
  it('never renders the removed post-answer teaching-note block', () => {
    const source = read('app/lesson1.tsx');
    expect(source).not.toContain('lessonTeachingNote');
    expect(source).not.toContain('lesson-teaching-note');
    expect(source).not.toContain('resolvePhraseTeachingNote');
  });

  it('queues combo achievement work only at real achievement thresholds', () => {
    const source = read('app/lesson1.tsx');
    expect(source).toContain('const COMBO_ACHIEVEMENT_THRESHOLDS = new Set([3, 10, 20, 50, 100, 150, 250, 500])');
    expect(source).toContain('if (COMBO_ACHIEVEMENT_THRESHOLDS.has(correctStreakRef.current))');
    expect(source).not.toContain("checkAchievements({ type: 'time_of_day' })");
  });

  it('stops replaced toast animations instead of stacking native sequences', () => {
    const source = read('app/lesson1.tsx');
    expect(source).toContain('xpToastSequenceRef.current?.stop()');
    expect(source).toContain('medalToastSequenceRef.current?.stop()');
    expect(source).toContain('xpToastAnim.stopAnimation()');
    expect(source).toContain('medalToastAnim.stopAnimation()');
  });

  it('caches grammar-hint storage checks and cancels stale hint animations', () => {
    const source = read('app/lesson1.tsx');
    expect(source).toContain('const grammarHintSeenCacheRef = useRef(new Set<string>())');
    expect(source).toContain('grammarHintSeenCacheRef.current.has(seenKey)');
    expect(source).toContain('generation !== grammarHintGenerationRef.current');
    expect(source).toContain('grammarHintAnimationRef.current?.stop()');
    expect(source).toContain('grammarHintAnim.stopAnimation()');
  });

  it('does not run time-of-day achievement storage work for every XP award', () => {
    const source = read('app/xp_manager.ts');
    expect(source).toContain('function shouldCheckTimeOfDayAchievements(');
    expect(source).toContain("if (!bucket) return false");
    expect(source).toContain('TIME_OF_DAY_CHECK_CACHE_MAX = 8');
    expect(source).toContain('if (shouldCheckTimeOfDayAchievements(accountToken))');
  });
});
