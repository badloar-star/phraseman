import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('lesson runtime animation ownership', () => {
  it.each([
    ['app/lesson1.tsx', 'const lessonRuntimeActive = useRuntimeActive()'],
    ['app/lesson_intro_screens.tsx', 'const lessonIntroRuntimeActive = useRuntimeActive()'],
    ['app/lesson_complete.tsx', 'const lessonCompleteRuntimeActive = useRuntimeActive()'],
    ['app/pack_opening.tsx', 'const packOpeningRuntimeActive = useRuntimeActive()'],
  ])('%s owns repeating motion through runtime activity', (file, token) => {
    expect(read(file)).toContain(token);
  });

  it('stops each migrated repeating value while inactive', () => {
    expect(read('app/lesson1.tsx')).toContain('if (!lessonRuntimeActive || selectedWords.length > 0)');
    expect(read('app/lesson1.tsx')).toContain('if (lessonRuntimeActive && showToBeHint && cellIndex < 2)');
    expect(read('app/lesson_intro_screens.tsx')).toContain('if (!lessonIntroRuntimeActive || allRevealed)');
    expect(read('app/lesson_intro_screens.tsx')).toContain('if (!lessonIntroRuntimeActive || !ctaReady)');
    expect(read('app/lesson_complete.tsx')).toContain('if (!lessonCompleteRuntimeActive || !seqDone)');
    expect(read('app/pack_opening.tsx')).toContain('if (!active || flipped)');
    expect(read('app/pack_opening.tsx')).toContain('active={packOpeningRuntimeActive}');
  });
});
