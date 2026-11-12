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
    // зачем (12.11): d8a0a685a вынес условие в признак hasSelectedWords — эффект мигания курсора перезапускается только
    // при смене «есть слова / нет слов», а не на каждое слово; остановка вне активного урока та же.
    const lesson = read('app/lesson1.tsx').replace(/\r\n/g, '\n');
    expect(lesson).toContain('const hasSelectedWords = selectedWords.length > 0;');
    expect(lesson).toContain('if (!lessonRuntimeActive || hasSelectedWords) {\n      cursorAnim.stopAnimation();');
    expect(lesson).toContain('}, [cursorAnim, lessonRuntimeActive, hasSelectedWords]);');
    expect(read('app/lesson_intro_screens.tsx')).toContain('if (!lessonIntroRuntimeActive || allRevealed)');
    expect(read('app/lesson_intro_screens.tsx')).toContain('if (!lessonIntroRuntimeActive || !ctaReady)');
    expect(read('app/lesson_complete.tsx')).toContain('if (!lessonCompleteRuntimeActive || !seqDone)');
    // зачем (PM-220, PM-033): к остановке по активности добавилась остановка по «Уменьшить движение» — условие строже прежнего.
    expect(read('app/pack_opening.tsx')).toContain('if (!active || flipped || reducedMotionLoop)');
    expect(read('app/pack_opening.tsx')).toContain('active={packOpeningRuntimeActive}');
  });
});
