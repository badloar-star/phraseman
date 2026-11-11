/**
 * Итоговый экзамен: ошибка в вопросе с пропуском попадает в «Мои ошибки» (владелец 11.11.2026, «Да, исправить»).
 *
 * зачем: раздел принимает ошибку «пропущенное слово» только с номером слова, а экзамен номер не передавал — запись молча
 * отбрасывалась. Номер и разбивку фразы теперь достаёт общий приёмник (app/mistake_practice_capture.ts →
 * withGapTokenIndex). Сторож идёт по ВСЕМУ банку app/exam.tsx: ни один вопрос с «___» не должен снова стать
 * неподдержанным, а при повторе в разделе пропуск обязан стоять ровно на месте ответа — в том числе когда ответ из
 * нескольких слов («turn on», «was written»). Сработал — чинить withGapTokenIndex или вопрос банка, а не сторожа.
 */
import fs from 'fs';
import path from 'path';

import { withGapTokenIndex, type ObjectiveMistakeAttempt } from '../app/mistake_practice_capture';
import { buildMistakeExercise } from '../modules/mistake-practice/exercise_builders';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';

type BankQuestion = { q: string; opts: string[]; correct: number };

function examGapQuestions(): BankQuestion[] {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'exam.tsx'), 'utf8');
  const pattern = /q:'((?:[^'\\]|\\.)*)',\s*opts:\[([^\]]*)\],\s*correct:(\d+)/g;
  const unescape = (text: string) => text.replace(/\\'/g, "'");
  const out: BankQuestion[] = [];
  for (const match of source.matchAll(pattern)) {
    const q = unescape(match[1]);
    if (!q.includes('___')) continue;
    const opts = [...match[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((option) => unescape(option[1]));
    out.push({ q, opts, correct: Number(match[3]) });
  }
  return out;
}

// тот же вид записи, что шлёт app/exam.tsx при неверном ответе
function attemptFor(question: BankQuestion, index: number): ObjectiveMistakeAttempt {
  const expected = question.opts[question.correct];
  return {
    accountScope: 'account-a',
    attemptId: `exam:1:${index}:0`,
    studyTarget: 'en',
    verdict: 'wrong',
    objective: true,
    content: {
      sourceKind: 'exam',
      sourceId: `1:${question.q}`,
      canonicalTarget: question.q.replace('___', expected),
      sourceMeaning: 'перевод',
      sourcePrompt: question.q,
      lessonId: '1',
      distractors: question.opts,
    },
    facet: { kind: 'missing_token', expected, given: question.opts[(question.correct + 1) % question.opts.length] },
  };
}

describe('итоговый экзамен: ошибки в вопросах с пропуском', () => {
  const questions = examGapQuestions();

  it('банк прочитан: вопросов с пропуском больше сотни, среди них есть ответы из нескольких слов', () => {
    expect(questions.length).toBeGreaterThan(100);
    expect(questions.some((question) => /\s/.test(question.opts[question.correct]))).toBe(true);
  });

  it('ни один вопрос с пропуском раздел не отбрасывает', () => {
    for (const [index, question] of questions.entries()) {
      const attempt = withGapTokenIndex(attemptFor(question, index));
      const identity = buildMistakeIdentity({ studyTarget: attempt.studyTarget, content: attempt.content, facet: attempt.facet });
      expect([question.q, identity.kind]).toEqual([question.q, 'capturable']);
    }
  });

  it('при повторе пропуск стоит ровно на месте ответа — и для ответа из нескольких слов', () => {
    for (const [index, question] of questions.entries()) {
      const attempt = withGapTokenIndex(attemptFor(question, index));
      const expected = question.opts[question.correct];
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
      } as Parameters<typeof buildMistakeExercise>[0]);
      // слова вокруг пропуска — те же, что в вопросе экзамена: лишнее слово ответа рядом с пропуском не остаётся
      const shown = exercise.prompt.split(/\s+/).map((word) => (word === '_____' ? '___' : word));
      const asked = question.q.trim().split(/\s+/).map((word) => (word.includes('___') ? '___' : word));
      expect([question.q, shown]).toEqual([question.q, asked]);
      expect([question.q, exercise.correctAnswer]).toEqual([question.q, expected]);
    }
  });
});
