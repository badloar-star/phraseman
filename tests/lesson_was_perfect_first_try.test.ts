// зачем (координатор 15.10, Сверка c17199343 / 282ff3006): «ИДЕАЛ» и «верно/ошибок/точность» на итоге — по ПЕРВЫМ попыткам.
// Два сценария Сверки: «одна ошибка в проходе 1, исправлена на повторе» и «0 ошибок в проходе 2».
// Флаг wasPerfect для ачивок и окна оценки (lesson_progress_scan) НЕ меняем ночью — решение владельца утром; показ от него не зависит.
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: () => undefined, warn: () => undefined } }));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';

import { summarizeLessonProgress } from '../app/lesson_progress_scan';
import { lessonFirstTryCountsFromProgress } from '../app/lesson_first_try_counts';
import { decidePerfectMoment } from '../components/lesson_moments/perfect_moment_gate';
/* eslint-enable import/first */

const row = (id: number, cells: readonly string[]) => [id, JSON.stringify(cells)] as const;

describe('«ИДЕАЛ» — без промахов с первой попытки', () => {
  it('проход 1: одна ошибка, исправлена на повторе → ошибок 1, без ИДЕАЛ', () => {
    const counts = lessonFirstTryCountsFromProgress(['replay_correct', 'correct', 'correct'], 1);
    expect([counts.correct, counts.wrong]).toEqual([2, 1]);
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(false);
  });

  it('проход 2: 0 ошибок → ИДЕАЛ, даже в уроке из 3 заданий', () => {
    const counts = lessonFirstTryCountsFromProgress(['correct', 'correct', 'correct'], 0);
    expect([counts.correct, counts.wrong]).toEqual([3, 0]);
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(true);
  });
});

describe('флаг wasPerfect для ачивок — прежнее правило (порог 45, только «wrong»), до решения владельца', () => {
  it('урок из 3 заданий не идеален; 45+ без «wrong» — идеален, replay_correct не мешает', () => {
    expect(summarizeLessonProgress([row(1, ['correct', 'correct', 'correct'])], 1).wasPerfect).toBe(false);
    const fixed = ['replay_correct', ...Array.from({ length: 49 }, () => 'correct')];
    expect(summarizeLessonProgress([row(1, fixed)], 1).wasPerfect).toBe(true);
  });
});

describe('показ ИДЕАЛ не зависит от сводки прохождения; журнал [LESSON-RESULT]', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/lesson_complete.tsx'), 'utf8').replace(/\r\n/g, '\n');
  it('решение m09 строится из счёта первых попыток, а не из wasPerfect', () => {
    expect(src).toMatch(/const perfectDecision = decidePerfectMoment\(\{ momentsV3, isCombo: isComboCompletion, counts: lessonCounts,/);
    expect(src).toMatch(/const firstTry = lessonFirstTryCountsFromProgress\(p, peekLessonRunErrors\(lessonId\)\.length\);\n\s*setLessonCounts\(\{ correct: firstTry\.correct, wrong: firstTry\.wrong \}\);/);
  });
  it('пишет источник wasPerfect, ошибки/верно по первым попыткам, показ ИДЕАЛ и составляющие монет', () => {
    expect(src).toContain("wasPerfectSource: 'scanLessonProgress:legacy45'");
    expect(src).toMatch(/summary: 'entry', firstTryCorrect: .*mistakes: .*perfectShown: perfectDecision\.show, coins: \{ runes: practiceRunes\.runes, \.\.\.practiceRunes\.breakdown/);
  });
});
