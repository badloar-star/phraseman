/**
 * Ошибки экзамена уровня → «Мои ошибки» (владелец 11.11.2026, «Сначала перенести»).
 *
 * зачем: прежний встроенный экран экзамена записывал неверный ответ в раздел, новый движок — нет. Запись перенесена в
 * app/level_exam_mistake_capture.ts; этот тест держит суть: пишется только сделанный неверный ответ, с эталоном,
 * ответом ученика и текстом вопроса, а верные ответы, задания без ответа и «Так не говорят» — не пишутся.
 */
const mockCapture = jest.fn((_attempt: unknown) => Promise.resolve({ kind: 'captured' }));
jest.mock('../app/mistake_practice_capture', () => ({
  captureCurrentAccountObjectiveAttempt: (attempt: unknown) => mockCapture(attempt),
}));

import { captureLevelExamMistakes, levelExamMistakes } from '../app/level_exam_mistake_capture';
import type { LevelExamAnswers } from '../app/level_exam_scoring';
import type { LevelExamBlueprint, LevelExamTask } from '../app/level_exam_types';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';

const options = (...texts: string[]) => texts.map((text, index) => ({ id: `o${index}`, text }));
const tasks: LevelExamTask[] = [
  { id: 't1', scoreUnitId: 'u1', lessonId: 3, phraseId: 'p1', explanation: '', format: 'fill_gap', prompt: 'Магазин открывается в девять.\nThe shop opens ___ nine.', options: options('at', 'in', 'on', 'to'), correctOptionId: 'o0' },
  { id: 't2', scoreUnitId: 'u2', lessonId: 4, phraseId: 'p2', explanation: '', format: 'guess_phrase', prompt: 'Как сказать, что ты готов?', options: options('I am ready.', 'I am late.'), correctOptionId: 'o0' },
  { id: 't3', scoreUnitId: 'u3', lessonId: 5, phraseId: 'p3', explanation: '', format: 'find_oddity', prompt: '', options: options('He go home.', 'He goes home.'), correctOptionId: 'o0' },
  { id: 't4', scoreUnitId: 'u4', lessonId: 6, phraseId: 'p4', explanation: '', format: 'translate_build', prompt: 'Мы купили билеты.', tokens: [{ id: 'a', text: 'We' }, { id: 'b', text: 'bought' }, { id: 'c', text: 'tickets' }, { id: 'd', text: 'buy', isDistractor: true }], correctTokenIds: ['a', 'b', 'c'] },
  { id: 't5', scoreUnitId: 'u5', lessonId: 7, phraseId: 'p5', explanation: '', format: 'fill_gap', prompt: 'Она дома.\nShe ___ at home.', options: options('is', 'are'), correctOptionId: 'o0', acceptedOptionIds: ['o0'] },
  // новые механики: из фразы урока (пишется) и из банка диалогов (не пишется — фразы урока у неё нет)
  { id: 't6', scoreUnitId: 'u6', lessonId: 8, phraseId: 'p6', explanation: 'She works at home. — Она работает дома.', format: 'sentence_build_noise', instruction: 'Собери фразу', prompt: 'Она работает дома.', context: '', exercise: { format: 'sentence_build_noise', bank: ['She', 'works', 'at', 'home.', 'work'], need: 4, key: [0, 1, 2, 3] } },
  { id: 't7', scoreUnitId: 'u7', lessonId: 9, phraseId: 'a7', explanation: 'At nine.', format: 'context_choice', instruction: 'Выбери ответ', prompt: 'When?', context: '', exercise: { format: 'context_choice', options: ['At nine.', 'In nine.'], key: 0 } },
];
const blueprint = { version: 5, level: 'A1', studyTarget: 'en', sourceLocale: 'ru', seed: 's', tasks, scoredUnitIds: [], durationMs: 1, passScore: 21 } as unknown as LevelExamBlueprint;

describe('ошибки экзамена уровня для раздела «Мои ошибки»', () => {
  beforeEach(() => mockCapture.mockClear());

  it('неверный пропуск: эталон — целая фраза, вопрос — строка с пропуском, перевод — подсказкой', () => {
    const [mistake] = levelExamMistakes(blueprint, { u1: { kind: 'choice', optionId: 'o1' } } as LevelExamAnswers);
    expect(mistake).toMatchObject({
      scoreUnitId: 'u1', sourceId: 'A1:p1:fill_gap', lessonId: '3', kind: 'missing_token',
      canonicalTarget: 'The shop opens at nine.', sourcePrompt: 'The shop opens ___ nine.', sourceMeaning: 'Магазин открывается в девять.',
      expected: 'at', given: 'in', distractors: ['at', 'in', 'on', 'to'],
    });
  });

  it('неверный выбор фразы и неверная сборка пишутся с ответом ученика', () => {
    const mistakes = levelExamMistakes(blueprint, {
      u2: { kind: 'choice', optionId: 'o1' },
      u4: { kind: 'translate_build', tokenIds: ['a', 'd', 'c'] },
    } as LevelExamAnswers);
    expect(mistakes.map((m) => [m.kind, m.expected, m.given])).toEqual([
      ['meaning', 'I am ready.', 'I am late.'],
      ['word_order', 'We bought tickets', 'We buy tickets'],
    ]);
  });

  it('верные ответы, задания без ответа и «Так не говорят» не пишутся', () => {
    const mistakes = levelExamMistakes(blueprint, {
      u1: { kind: 'choice', optionId: 'o0' },
      u3: { kind: 'choice', optionId: 'o1' },
      u4: { kind: 'translate_build', tokenIds: ['a', 'b', 'c'] },
      u5: { kind: 'choice', optionId: 'o0' },
    } as LevelExamAnswers);
    expect(mistakes).toEqual([]);
  });

  it('новая механика из фразы урока пишется с фразой-эталоном; недоделанный ответ и механика из банка диалогов — нет', () => {
    const wrong = levelExamMistakes(blueprint, {
      u6: { kind: 'expanded', response: { format: 'sentence_build_noise', order: [0, 4, 2, 3] } },
      u7: { kind: 'expanded', response: { format: 'context_choice', picked: 1 } },
    } as LevelExamAnswers);
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toMatchObject({
      scoreUnitId: 'u6', sourceId: 'A1:p6:sentence_build_noise', lessonId: '8', kind: 'word_order',
      canonicalTarget: 'She works at home.', sourceMeaning: 'Она работает дома.',
      expected: 'She works at home.', given: 'She work at home.',
    });
    expect(wrong[0].sourcePrompt).toContain('Собери фразу');
    expect(levelExamMistakes(blueprint, {
      u6: { kind: 'expanded', response: { format: 'sentence_build_noise', order: [0, 1] } },
    } as LevelExamAnswers)).toEqual([]);
    expect(levelExamMistakes(blueprint, {
      u6: { kind: 'expanded', response: { format: 'sentence_build_noise', order: [0, 1, 2, 3] } },
    } as LevelExamAnswers)).toEqual([]);
  });

  // зачем: «пропущенное слово» без номера слова раздел молча отбрасывал — запись делалась, а ошибки в разделе не было
  it('каждую запись раздел принимает: у пропуска есть номер слова', () => {
    const mistakes = levelExamMistakes(blueprint, {
      u1: { kind: 'choice', optionId: 'o1' },
      u2: { kind: 'choice', optionId: 'o1' },
      u4: { kind: 'translate_build', tokenIds: ['a', 'd', 'c'] },
      u6: { kind: 'expanded', response: { format: 'sentence_build_noise', order: [0, 4, 2, 3] } },
    } as LevelExamAnswers);
    expect(mistakes).toHaveLength(4);
    expect(mistakes[0].tokenIndex).toBe(3);
    for (const mistake of mistakes) {
      const identity = buildMistakeIdentity({
        studyTarget: 'en',
        content: { sourceKind: 'level_exam', sourceId: mistake.sourceId, canonicalTarget: mistake.canonicalTarget, sourceMeaning: mistake.sourceMeaning },
        facet: { kind: mistake.kind, expected: mistake.expected, tokenIndex: mistake.tokenIndex },
      });
      expect([mistake.scoreUnitId, identity.kind]).toEqual([mistake.scoreUnitId, 'capturable']);
    }
  });

  it('записи идут по очереди, а не разом: вторая начинается после завершения первой', async () => {
    let release: () => void = () => undefined;
    mockCapture.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ kind: 'captured' }); }));
    const count = captureLevelExamMistakes({
      blueprint, level: 'A1', studyTarget: 'en', attemptId: 'att-2',
      answers: { u1: { kind: 'choice', optionId: 'o1' }, u2: { kind: 'choice', optionId: 'o1' } } as LevelExamAnswers,
    });
    expect(count).toBe(2);
    await Promise.resolve();
    expect(mockCapture).toHaveBeenCalledTimes(1);
    release();
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(mockCapture.mock.calls[0][0]).toMatchObject({ attemptId: 'att-2:u1', facet: { tokenIndex: 3 } });
  });

  it('запись идёт через общий приёмник, номер записи привязан к попытке и заданию', async () => {
    const count = captureLevelExamMistakes({ blueprint, answers: { u1: { kind: 'choice', optionId: 'o2' } } as LevelExamAnswers, level: 'A1', studyTarget: 'es', attemptId: 'att-1' });
    expect(count).toBe(1);
    await Promise.resolve();
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0][0]).toMatchObject({
      attemptId: 'att-1:u1', studyTarget: 'es', verdict: 'wrong', objective: true,
      content: { sourceKind: 'level_exam', sourcePrompt: 'The shop opens ___ nine.' },
      facet: { kind: 'missing_token', expected: 'at', given: 'on' },
    });
  });
});
