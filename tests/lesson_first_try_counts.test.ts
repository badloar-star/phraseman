// зачем (Сверка c17199343 / 282ff3006, координатор 15.10): итог урока — по ПЕРВЫМ попыткам. Промах, исправленный на повторе, — это ошибка:
// без «ИДЕАЛ», ошибок = 1, точность по первым попыткам. Балл, звёзды и монеты — по-прежнему по итоговому прогрессу (здесь не трогаются).
import fs from 'node:fs';
import path from 'node:path';

import { lessonFirstTryCountsFromProgress, lessonFirstTryCountsFromTotals } from '../app/lesson_first_try_counts';
import { decidePerfectMoment } from '../components/lesson_moments/perfect_moment_gate';

describe('итог урока по первым попыткам', () => {
  it('промах + исправление на повторе → ошибок 1, без ИДЕАЛ', () => {
    const counts = lessonFirstTryCountsFromProgress(['replay_correct', 'correct', 'correct'], 1);
    expect(counts).toEqual({ correct: 2, wrong: 1, finalCorrect: 3 });
    const perfect = decidePerfectMoment({ momentsV3: true, isCombo: false, counts: { correct: counts.correct, wrong: counts.wrong }, coinsHydrating: false });
    expect(perfect.show).toBe(false);
  });

  it('честно без ошибок с первой попытки → ИДЕАЛ', () => {
    const counts = lessonFirstTryCountsFromProgress(['correct', 'correct', 'correct'], 0);
    expect(counts).toEqual({ correct: 3, wrong: 0, finalCorrect: 3 });
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(true);
  });

  it('список «Ошибки» видел промах, а прогресс его потерял → ошибка всё равно засчитана, сумма ответов прежняя', () => {
    expect(lessonFirstTryCountsFromProgress(['correct', 'correct', 'correct'], 1)).toEqual({ correct: 2, wrong: 1, finalCorrect: 3 });
  });

  it('повтор пройденного урока без ошибок (все ячейки replay_correct) → 3 / 0 и ИДЕАЛ (Сверка ca8abf1b2, проход 2)', () => {
    const counts = lessonFirstTryCountsFromProgress(['replay_correct', 'replay_correct', 'replay_correct'], 0);
    expect(counts).toEqual({ correct: 3, wrong: 0, finalCorrect: 3 });
    expect(decidePerfectMoment({ momentsV3: true, isCombo: false, counts, coinsHydrating: false }).show).toBe(true);
  });

  it('повтор с одним исправленным промахом → 2 / 1, без ИДЕАЛ; неисправленный wrong тоже ошибка', () => {
    expect(lessonFirstTryCountsFromProgress(['replay_correct', 'replay_correct', 'replay_correct'], 1)).toEqual({ correct: 2, wrong: 1, finalCorrect: 3 });
    expect(lessonFirstTryCountsFromProgress(['replay_correct', 'wrong', 'correct'], 1)).toEqual({ correct: 2, wrong: 1, finalCorrect: 2 });
    expect(lessonFirstTryCountsFromProgress(['replay_correct', 'wrong', 'correct'], 2)).toEqual({ correct: 1, wrong: 2, finalCorrect: 2 });
  });

  it('итог из маршрута (прогресса нет): верно 3 из 3 + 1 промах в списке → 2 / 1', () => {
    expect(lessonFirstTryCountsFromTotals(3, 3, 1)).toEqual({ correct: 2, wrong: 1, finalCorrect: 3 });
    expect(lessonFirstTryCountsFromTotals(3, 3, 0)).toEqual({ correct: 3, wrong: 0, finalCorrect: 3 });
    expect(lessonFirstTryCountsFromTotals(2, 3, 0)).toEqual({ correct: 2, wrong: 1, finalCorrect: 2 });
  });

  it('экран итога берёт счёт из модуля первых попыток; балл и звёзды — по итоговому прогрессу', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');
    expect(src).toContain('const firstTry = lessonFirstTryCountsFromProgress(p, peekLessonRunErrors(lessonId).length);');
    expect(src).toContain('setLessonCounts({ correct: firstTry.correct, wrong: firstTry.wrong });');
    expect(src).toContain("const correct = p.filter(x => x === 'correct' || x === 'replay_correct').length;"); // балл — как раньше
    expect(src).toMatch(/firstTryMistakes: firstTry\.wrong/);
  });
});
