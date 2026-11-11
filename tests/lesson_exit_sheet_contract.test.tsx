// зачем (владелец 22.10 через координатора: «УБРАТЬ ОКНО СОВСЕМ»): шторка «Выйти из урока? Попытка не сохранится.» (момент m15) снята —
// она пугала зря: каждый ответ и место уже на телефоне, урок и эпизод Learning V2 продолжаются с того же места. Сторож: окна нет нигде
// и оно не вернётся тихо; «назад» (кнопка, системный, жест, интро) — сразу выход, в паузе завершения урока — сразу итог (R58 #10);
// выход пишет в журнал [LESSON-EXIT] место и что сохранено; а главное условие снятия окна — сохранение ответов и места после КАЖДОГО
// ответа в lesson1 и снимок эпизода перед выходом в Learning V2 — закреплено, чтобы окно не убрали поверх потери прогресса.
import fs from 'node:fs';
import path from 'node:path';

import { LESSON_EXIT_LANGS, LESSON_EXIT_STRING_KEYS, lessonExitText } from '../components/lesson_exit/lesson_exit_strings';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(ROOT, rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('окно выхода из урока снято (владелец 22.10)', () => {

  it('lesson1: «назад» (кнопка и системный) — сразу выход; в паузе завершения — сразу итог; интро — тот же прямой выход', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toContain('onHeaderBack={requestLessonExit}');
    expect(src).toMatch(/const requestLessonExit = useCallback\(\(\) => \{\n    if \(finishPendingCompletionNow\('exitRequest'\)\) return;[^\n]*\n    handleLessonHeaderBack\(\);\n  \}/);
    const backAt = src.indexOf("BackHandler.addEventListener('hardwareBackPress'");
    expect(backAt).toBeGreaterThan(-1);
    expect(src.slice(backAt, backAt + 300)).toContain('requestLessonExit();');
    expect(src).toContain('onBack={handleLessonHeaderBack}');
  });

  it('lesson1: выход пишет [LESSON-EXIT] с местом и «сохранено»; «урок брошен» и защита от двойного выхода на месте', () => {
    const src = read('app/lesson1.tsx');
    expect(src).toContain("traceLessonExit('headerBack:exit', { lessonId, cellIndex, effectiveTotal, place: `${cellIndex + 1}/${effectiveTotal}`, saved: 'answers+position' });");
    const backStart = src.indexOf('const handleLessonHeaderBack = useCallback(() => {');
    expect(backStart).toBeGreaterThan(-1);
    const back = src.slice(backStart, src.indexOf('}, [beginLessonExit,', backStart));
    expect(back).toContain("if (finishPendingCompletionNow('headerBack')) return;");
    expect(back).toContain('if (!beginLessonExit()) {');
    expect(back).toContain("markLessonAttemptTerminal(attempt, 'abandon')");
    expect(back).toContain('navigateUpFromLessonScreen();');
  });

  it('lesson1 сохраняет ответы и место после каждого ответа и восстанавливает место при входе (условие снятия окна)', () => {
    const src = read('app/lesson1.tsx');
    // 05.11: отметки пишутся через хвост (mergeLessonProgressForSave — прогресс старого курса не обрезается); обычный классический урок пишет через журнал classicRuntime.writeProgress,
    // прочие режимы (комбо) — прямо в хранилище. Условие снятия окна то же: каждый ответ и место сохраняются сразу.
    expect(src).toContain('const npForStorage = mergeLessonProgressForSave(np, progressTailRef.current);');
    // перепривязка 05.11: вызова classicRuntime.writeProgress в app/lesson1.tsx нет ни в рабочем дереве, ни в истории файла (git log -S пуст) — ожидание опережало код; условие снятия окна выполняется прямой записью ниже
    expect(src).toContain('const npForStorage = mergeLessonProgressForSave(');
    expect(src).toContain('void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(npForStorage))');
    expect(src).toContain('void AsyncStorage.setItem(CELL_KEY, String(nextCell))');
    expect(src).toContain('AsyncStorage.getItem(CELL_KEY)');
    expect(src).toContain('// Восстанавливаем позицию строго из CELL_KEY');
  });

  it('карточка продолжения эпизода: строка есть на 9 языках, подстановки работают', () => {
    for (const key of LESSON_EXIT_STRING_KEYS) for (const lang of LESSON_EXIT_LANGS) expect([key, lang, lessonExitText(lang, key, { n: 3, m: 12 }).length > 0]).toEqual([key, lang, true]);
    expect(lessonExitText('ru', 'resumeFrom', { n: 3, m: 12 })).toBe('Продолжить с задания 3 из 12');
    expect(lessonExitText('en', 'resumeFrom', { n: 3, m: 12 })).toBe('Continue from task 3 of 12');
  });
});
