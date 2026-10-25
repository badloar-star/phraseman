import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson_complete repeat navigation', () => {
  it('does not block repeat navigation on lesson screen priming', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_complete.tsx'), 'utf8');
    const handlerStart = source.indexOf('const handleRepeatLesson = useCallback');
    const handlerEnd = source.indexOf('const goBackFromComplete', handlerStart + 1);
    // Окно 1600: PM-229 удлинил строку подготовки (тег причины в журнале), 900 обрезало router.replace.
    const handler = source.slice(handlerStart, handlerEnd > handlerStart ? handlerEnd : handlerStart + 1600);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    // Подготовка экрана — без ожидания (PM-229: обработчик ошибки теперь пишет причину в журнал).
    expect(handler).toMatch(/void primeLessonScreenFromStorage\(lessonId, studyTarget\)\.catch\(/);
    // зачем (Мастерская фраз, aa2bbfc3e): «Ещё раз» по-прежнему ведёт через replace на /lesson1 с id и serverAttemptId = repeatAttemptId; параметры режима
    // workshop/from добавляются ТОЛЬКО при isWorkshopCompletion — обычный повтор урока остаётся с двумя параметрами. Сторож ловит смысл, а не точную строку.
    expect(handler).toMatch(/router\.replace\(\{ pathname: '\/lesson1', params: \{ id: lessonId, serverAttemptId: repeatAttemptId(?:, \.\.\.\(isWorkshopCompletion \? \{ workshop: '1', from: 'workshop' \} : \{\}\))? \} \}\);/);
    expect(handler.split("workshop: '1'").length - 1).toBe(handler.split("isWorkshopCompletion ? { workshop: '1'").length - 1);
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
