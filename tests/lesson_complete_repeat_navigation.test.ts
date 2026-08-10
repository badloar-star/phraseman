import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson_complete repeat navigation', () => {
  it('does not block repeat navigation on lesson screen priming', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_complete.tsx'), 'utf8');
    const handlerStart = source.indexOf('const handleRepeatLesson = useCallback');
    const handlerEnd = source.indexOf('const goBackFromComplete', handlerStart + 1);
    const handler = source.slice(handlerStart, handlerEnd > handlerStart ? handlerEnd : handlerStart + 900);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handler).toContain('void primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});');
    expect(handler).toContain("router.replace({ pathname: '/lesson1', params: { id: lessonId, serverAttemptId: repeatAttemptId } });");
    expect(handler.indexOf('markNextNavigationAsReplace()')).toBeLessThan(handler.indexOf('router.replace'));
    expect(handler).not.toContain('await primeLessonScreenFromStorage');
  });

  it('passes a fresh durable reward identity without waiting on storage', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_complete.tsx'), 'utf8');
    const handlerStart = source.indexOf('const handleRepeatLesson = useCallback');
    const handler = source.slice(handlerStart, handlerStart + 1500);

    expect(handler).toContain('normalizeLessonServerAttemptId(params.repeatAttemptId)');
    expect(handler).toContain('?? makeLessonServerAttemptId()');
    expect(handler).toContain("lessonSessionKey(lessonId, 'serverAttemptId', studyTarget)");
    expect(handler).toContain('void AsyncStorage.setItem(');
    expect(handler).not.toContain('await AsyncStorage.setItem(');
  });

  it('guards the repeat button against double taps while the route opens', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_complete.tsx'), 'utf8');
    const buttonStart = source.indexOf('testID="lesson-complete-repeat"');
    const buttonEnd = source.indexOf('</DuoPressable>', buttonStart);
    const button = source.slice(buttonStart, buttonEnd);

    expect(buttonStart).toBeGreaterThanOrEqual(0);
    expect(button).toContain('disabled={repeatOpening}');
    expect(button).toContain('onPress={handleRepeatLesson}');
  });
});
