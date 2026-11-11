/**
 * Итоговый экзамен испанского, немецкого, французского и итальянского: ошибка в вопросе с пропуском попадает в
 * «Мои ошибки» (владелец 11.11.2026, «Да, почини»).
 *
 * зачем: у английского банка то же держит tests/exam_gap_mistakes_capturable.test.ts. Банки четырёх курсов собираются
 * из фраз уроков (app/classic_final_exam_bank.ts) и шлют запись тем же путём, что и английский; без номера слова раздел
 * отбрасывал её молча. Сторож идёт по настоящим собранным вопросам каждого курса: запись принимается, а при повторе
 * пропуск стоит ровно на месте пропуска вопроса и ответ тот же. Сработал — чинить withGapTokenIndex
 * (app/mistake_practice_capture.ts) или сборку вопроса, а не сторожа.
 */
import { loadClassicFinalExamQuestions } from '../app/classic_final_exam_bank';
import { withGapTokenIndex, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { buildMistakeExercise } from '../modules/mistake-practice/exercise_builders';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const TARGETS = ['es', 'de', 'fr', 'it'] as const;

// тот же вид записи, что шлёт app/exam.tsx при неверном ответе (submitExam)
function attemptFor(question: { q: string; opts: string[]; correct: number }, studyTarget: string, index: number): ObjectiveMistakeAttempt {
  const expected = question.opts[question.correct];
  return {
    accountScope: 'account-a',
    attemptId: `exam:1:${index}:0`,
    studyTarget: studyTarget as ObjectiveMistakeAttempt['studyTarget'],
    verdict: 'wrong',
    objective: true,
    content: {
      sourceKind: 'exam',
      sourceId: `p${index}:${question.q}`,
      canonicalTarget: question.q.replace('___', expected),
      sourceMeaning: 'перевод',
      sourcePrompt: question.q,
      lessonId: '1',
      distractors: question.opts,
    },
    facet: { kind: 'missing_token', expected, given: question.opts[(question.correct + 1) % question.opts.length] },
  };
}

describe.each(TARGETS)('итоговый экзамен, курс %s: ошибки в вопросах с пропуском', (studyTarget) => {
  it('каждая запись принимается, при повторе пропуск на своём месте и ответ тот же', async () => {
    const questions = (await loadClassicFinalExamQuestions(studyTarget, 'ru', 50)).filter((question) => question.q.includes('___'));
    expect(questions.length).toBeGreaterThan(20);
    for (const [index, question] of questions.entries()) {
      const attempt = withGapTokenIndex(attemptFor(question, studyTarget, index));
      const identity = buildMistakeIdentity({ studyTarget: attempt.studyTarget, content: attempt.content, facet: attempt.facet });
      expect([question.q, identity.kind]).toEqual([question.q, 'capturable']);
      const exercise = buildMistakeExercise({
        mistakeId: `m${index}`,
        mode: 'lesson_fill_gap',
        canonicalTarget: attempt.content.canonicalTarget,
        tokens: attempt.content.tokens,
        tokenIndex: attempt.facet.tokenIndex,
        expected: attempt.facet.expected,
        sourcePrompt: attempt.content.sourcePrompt,
        sourceMeaning: attempt.content.sourceMeaning,
        distractors: attempt.content.distractors,
      });
      // строго: повтор показывает ТОТ ЖЕ вопрос — вместе со знаками и приклеенными частями слова («l'___», «___.»)
      expect([question.q, exercise.prompt]).toEqual([question.q, question.q.trim().replace(/\s+/g, ' ').replace('___', '_____')]);
      expect([question.q, exercise.correctAnswer]).toEqual([question.q, question.opts[question.correct]]);
    }
  });
});
