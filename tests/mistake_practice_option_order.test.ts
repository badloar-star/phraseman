/**
 * F05 (11.11): в «Моих ошибках» верный вариант всегда стоял ПОСЛЕДНИМ.
 * Причина: варианты собирались как [отвлекающие..., верный] и нигде не
 * перемешивались (плитки «Собери фразу» перемешивались, варианты — нет).
 */
import { buildMistakeExercise } from '../modules/mistake-practice/exercise_builders';
import { mistakePracticeOptionOrder } from '../modules/mistake-practice/option_order';

const DISTRACTORS = ['She go to school.', 'She going to school.', 'She gone to school.'];
const TARGET = 'She goes to school.';

const fullChoice = (mistakeId: string, orderSalt?: string) => buildMistakeExercise({
  mistakeId,
  mode: 'lesson_choice',
  canonicalTarget: TARGET,
  sourceMeaning: 'Она ходит в школу.',
  distractors: DISTRACTORS,
  ...(orderSalt ? { orderSalt } : {}),
} as Parameters<typeof buildMistakeExercise>[0]);

describe('F05: порядок вариантов в «Моих ошибках»', () => {
  test('верный полный вариант встречается на каждом месте, а не только последним', () => {
    const hits = [0, 0, 0, 0];
    const total = 400;
    for (let i = 0; i < total; i += 1) {
      const exercise = fullChoice(`mistake:v1:${i}`);
      hits[exercise.options!.indexOf(TARGET)] += 1;
    }
    // Ровное распределение — 25 % на место; порог 15 % ловит перекос, не шум.
    for (const count of hits) expect(count).toBeGreaterThan(total * 0.15);
  });

  test('набор вариантов не меняется: ничего не потеряно и не задвоено', () => {
    const exercise = fullChoice('mistake:v1:set');
    expect([...exercise.options!].sort()).toEqual([...DISTRACTORS, TARGET].sort());
    expect(exercise.correctAnswer).toBe(TARGET);
  });

  test('порядок устойчив внутри сессии и меняется между сессиями', () => {
    expect(fullChoice('mistake:v1:a', 's1').options).toEqual(fullChoice('mistake:v1:a', 's1').options);
    let changed = 0;
    for (let i = 0; i < 50; i += 1) {
      const first = fullChoice(`mistake:v1:${i}`, 's1').options!.join('|');
      const second = fullChoice(`mistake:v1:${i}`, 's2').options!.join('|');
      if (first !== second) changed += 1;
    }
    // зачем: при повторе той же ошибки завтра место верного не должно заучиваться.
    expect(changed).toBeGreaterThan(25);
  });

  test('соль порядка не меняет id задания', () => {
    expect(fullChoice('mistake:v1:a', 's1').exerciseId).toBe(fullChoice('mistake:v1:a', 's2').exerciseId);
  });

  test('пропуск со словами тоже перемешан', () => {
    const hits = [0, 0, 0];
    for (let i = 0; i < 300; i += 1) {
      const exercise = buildMistakeExercise({
        mistakeId: `mistake:v1:gap:${i}`,
        mode: 'lesson_fill_gap',
        canonicalTarget: 'I am ready.',
        tokens: ['I', 'am', 'ready.'],
        distractors: ['is', 'are'],
        tokenIndex: 1,
        expected: 'am',
      });
      hits[exercise.options!.indexOf('am')] += 1;
    }
    for (const count of hits) expect(count).toBeGreaterThan(300 * 0.2);
  });

  test('чистая функция: вход не мутируется, один вариант остаётся как есть', () => {
    const input = Object.freeze(['a', 'b', 'c', 'd']);
    const out = mistakePracticeOptionOrder(input, 'seed');
    expect(input).toEqual(['a', 'b', 'c', 'd']);
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(mistakePracticeOptionOrder(['only'], 'seed')).toEqual(['only']);
    expect(mistakePracticeOptionOrder([], 'seed')).toEqual([]);
  });
});
