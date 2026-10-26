import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8').replace(/\r\n/g, '\n');

describe('lesson list and completion contracts', () => {
  it('keeps the complete lesson path permanently visible in one flat list', () => {
    const source = read('app', '(tabs)', 'lessons.tsx');
    // зачем (05.10): файл отформатирован двойными кавычками; список — тот же один плоский ListItem
    // (урок / экзамен / аттестация), рендер идёт через поиск по урокам (legacyFilteredListData из listData).
    const listItemType = source.slice(source.indexOf('type ListItem ='), source.indexOf('const listData: ListItem[]'));

    expect(listItemType).toMatch(/kind: ["']lesson["']/);
    expect(listItemType).toMatch(/kind: ["']exam["']/);
    expect(listItemType).toMatch(/kind: ["']attestation["']/);
    // строка «глава» Learning V2 — свой вид v2_chapter; отдельного вида "chapter" (свёрнутые главы) в плоском списке нет.
    expect(listItemType).not.toMatch(/kind: ["']chapter["'];/);
    expect(source).toContain('const listData: ListItem[] = useMemo(');
    expect(source).toMatch(/legacyFilteredListData = useMemo\([\s\S]{0,1200}listData/);
    expect(source).toContain('data={legacyFilteredListData}');
  });

  it('grants first-completion pearls only after lesson1 passes the lesson', () => {
    const lesson = read('app', 'lesson1.tsx');
    const completion = read('app', 'lesson_complete.tsx');

    expect(lesson).toContain("passed: finalScore >= 2.5 ? '1' : '0'");
    // зачем (aa2bbfc3e, Мастерская фраз): повторная сборка фраз пройденного урока — не «первое прохождение», жемчужины за неё не начисляются; условие прохождения прежнее, добавлено «и это не Мастерская».
    expect(completion).toMatch(/const isQualifyingLessonPass = params\.passed === '1'(?: && !isWorkshopCompletion)?;/);
    expect(completion).toContain('if (!isQualifyingLessonPass) return;');
  });

  it('preserves the computed lesson pass status in the completion fallback', () => {
    const lesson = read('app', 'lesson1.tsx');
    // зачем (10.10): завершение переехало из setTimeout(async …) в именованную runLessonCompletionNavigation,
    // которую зовёт settle эха или фолбэк-таймер — ровно один раз (ref забирается и обнуляется до вызова).
    const navigationStart = lesson.indexOf('const navigate = async () => {');
    const completionTimerStart = lesson.lastIndexOf('const runLessonCompletionNavigation = async () => {', navigationStart);
    const completionTryStart = lesson.indexOf('try {', completionTimerStart);
    const finalScoreStart = lesson.indexOf('let finalScore =', completionTimerStart);
    const fallbackStart = lesson.indexOf('} catch (e) {', navigationStart);
    const fallbackEnd = lesson.indexOf('\n      };', fallbackStart);

    expect(navigationStart).toBeGreaterThan(-1);
    expect(completionTimerStart).toBeGreaterThan(-1);
    expect(completionTryStart).toBeGreaterThan(completionTimerStart);
    expect(finalScoreStart).toBeGreaterThan(completionTimerStart);
    expect(finalScoreStart).toBeLessThan(completionTryStart);
    expect(fallbackStart).toBeGreaterThan(navigationStart);
    expect(fallbackEnd).toBeGreaterThan(fallbackStart);

    const fallback = lesson.slice(fallbackStart, fallbackEnd);
    expect(fallback).toContain("passed: finalScore >= 2.5 ? '1' : '0'");
    expect(fallback).not.toContain("passed: '0'");

    // Переход на lesson_complete — один раз: и settle, и фолбэк-таймер забирают ref и обнуляют его до вызова.
    expect(lesson).toMatch(/const navigate = lessonCompletionNavigateRef\.current;\s*if \(!navigate\) return;\s*lessonCompletionNavigateRef\.current = null;/);
    expect(lesson).toMatch(/const navigate = lessonCompletionNavigateRef\.current;\s*lessonCompletionNavigateRef\.current = null;\s*navigate\?\.\(\);/);
  });
});
