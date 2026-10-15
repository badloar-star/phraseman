// зачем (аудит кнопок R58 #10, координатор 15.10): «Назад» в паузу между последним ответом и итогом (ждём конца озвучки) гасил переход и терял
// завершение — разблокировку, аналитику, монеты и медаль экрана итога — и писал «урок брошен». Сторож: обе дороги выхода (кнопка/шторка m15
// и системный «Назад» через requestLessonExit) сначала проверяют отложенное завершение и открывают итог сразу; обе ветки (озвучка вкл/выкл)
// кладут переход в общий lessonCompletionNavigateRef.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('R58 #10 · «Назад» в паузе завершения урока открывает итог, а не теряет его', () => {
  it('выход сначала проверяет отложенное завершение', () => {
    expect(src).toContain('const finishPendingCompletionNow = useCallback((from: string): boolean => {');
    expect(src).toMatch(/const handleLessonHeaderBack = useCallback\(\(\) => \{\n    if \(finishPendingCompletionNow\('headerBack'\)\) return;/);
    expect(src).toMatch(/const requestLessonExit = useCallback\(\(\) => \{\n    if \(finishPendingCompletionNow\('exitRequest'\)\) return;/);
    expect(src).toContain("'[LESSON-RESULT] back_during_completion'");
  });

  it('обе ветки (озвучка вкл/выкл) кладут переход в общий ref, таймер берёт его оттуда', () => {
    const branch = src.slice(src.indexOf('if (!settings.voiceOut) {'), src.indexOf('}, LESSON_COMPLETION_SPEECH_FALLBACK_MS);'));
    expect((branch.match(/lessonCompletionNavigateRef\.current = \(\) => \{ void runLessonCompletionNavigation\(\); \};/g) ?? []).length).toBe(2);
    expect(branch).not.toMatch(/setTimeout\(\(\) => \{\n\s*lessonCompletionFallbackTimerRef\.current = null;\n\s*void runLessonCompletionNavigation\(\);/);
  });
});

describe('R58 #27 · «Дальше» во время завершения урока', () => {
  it('не начинает новый проход: пропускает паузу к итогу или игнорирует повтор с причиной', () => {
    const goNext = src.slice(src.indexOf('const goNext = useCallback(async'), src.indexOf('const goNext = useCallback(async') + 1600);
    expect(goNext).toContain("if (isCompletingRef.current) {\n      if (finishPendingCompletionNow('next')) return;");
    expect(goNext).toContain("'[LESSON-RESULT] next_ignored'");
  });
});

describe('R58 #27 · сбой перехода на итог не оставляет «Дальше» немым', () => {
  it('при падении router.replace ссылка на переход возвращается и причина пишется в журнал', () => {
    const at = src.indexOf("'[LESSON-RESULT] replace_failed'");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 400)).toContain('lessonCompletionNavigateRef.current = () => { void runLessonCompletionNavigation(); };');
  });
});
