// зачем (координатор 15.10, Сверка c17199343 / 282ff3006): флаг wasPerfect (grantBonus → ачивки «идеальные уроки», окно оценки) —
// честный: все задания текущего урока верно с ПЕРВОЙ попытки. Два сценария Сверки: «одна ошибка в проходе 1, исправлена на повторе» и
// «0 ошибок в проходе 2». Порог «≥45 верных» для флага текущего урока снят (урок из 3 заданий не мог быть идеальным никогда).
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: () => undefined, warn: () => undefined } }));

/* eslint-disable import/first */
import { summarizeLessonProgress } from '../app/lesson_progress_scan';
import { lessonFirstTryCountsFromProgress } from '../app/lesson_first_try_counts';
import { decidePerfectMoment } from '../components/lesson_moments/perfect_moment_gate';
/* eslint-enable import/first */

const row = (id: number, cells: readonly string[]) => [id, JSON.stringify(cells)] as const;

describe('wasPerfect и «ИДЕАЛ» — одно правило: без промахов с первой попытки', () => {
  it('проход 1: одна ошибка, исправлена на повторе → wasPerfect=false, ошибок 1, без ИДЕАЛ', () => {
    const cells = ['replay_correct', 'correct', 'correct'];
    expect(summarizeLessonProgress([row(1, cells)], 1).wasPerfect).toBe(false);
    const counts = lessonFirstTryCountsFromProgress(cells, 1);
    expect([counts.correct, counts.wrong]).toEqual([2, 1]);
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(false);
  });

  it('проход 2: 0 ошибок → wasPerfect=true и ИДЕАЛ, даже в уроке из 3 заданий', () => {
    const cells = ['correct', 'correct', 'correct'];
    expect(summarizeLessonProgress([row(1, cells)], 1).wasPerfect).toBe(true);
    const counts = lessonFirstTryCountsFromProgress(cells, 0);
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(true);
  });

  it('полный урок из 50: исправленный промах больше не «идеален»; чистые 50 — идеален', () => {
    const fixed = ['replay_correct', ...Array.from({ length: 49 }, () => 'correct')];
    expect(summarizeLessonProgress([row(1, fixed)], 1).wasPerfect).toBe(false);
    expect(summarizeLessonProgress([row(1, Array.from({ length: 50 }, () => 'correct'))], 1).wasPerfect).toBe(true);
  });

  it('счётчики по всем урокам не тронуты: lessonCount/perfectCount — как раньше (порог 45, только «wrong»)', () => {
    const fixed = ['replay_correct', ...Array.from({ length: 49 }, () => 'correct')];
    const summary = summarizeLessonProgress([row(1, fixed), row(2, ['correct', 'correct', 'correct'])], 1);
    expect(summary.lessonCount).toBe(1);
    expect(summary.perfectCount).toBe(1);
  });

  it('флаг чужого урока не ставится', () => {
    expect(summarizeLessonProgress([row(2, ['correct', 'correct', 'correct'])], 1).wasPerfect).toBe(false);
  });
});

describe('журнал [LESSON-RESULT] на входе итога', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app/lesson_complete.tsx'), 'utf8') as string;
  it('пишет источник wasPerfect, ошибки/верно по первым попыткам, показ ИДЕАЛ и составляющие монет', () => {
    expect(src).toContain("wasPerfectSource: 'scanLessonProgress:firstTry'");
    expect(src).toMatch(/summary: 'entry', firstTryCorrect: .*mistakes: .*perfectShown: perfectDecision\.show, coins: \{ runes: practiceRunes\.runes, \.\.\.practiceRunes\.breakdown/);
  });
});
