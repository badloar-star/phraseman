/**
 * Двенадцать новых механик: проверка ответа и отбраковка битых заданий.
 *
 * зачем (владелец 11.11.2026): механики идут и в Пик, и в экзамены. Здесь держится главное обещание —
 * неполный ответ не проверяется, неверный не засчитывается, верный засчитывается, а задание с битым
 * полем не доходит до экрана. Примеры — одобренные владельцем образцы макета Кодекса.
 * Сработал — чинить логику в modules/expanded-formats, а не ослаблять сторожа.
 */
import { expandedTaskFromAuthorRecord } from '../modules/expanded-formats/author_record';
import {
  emptyExpandedResponse,
  expandedCorrectText,
  gradeExpanded,
  isExpandedResponseComplete,
  normaliseExpandedAnswer,
} from '../modules/expanded-formats/grade';
import { applyExpandedAction } from '../modules/expanded-formats/draft';
import { expandedFeedbackText } from '../modules/expanded-formats/feedback';
import type { ExpandedExercise, ExpandedFormat, ExpandedResponse, ExpandedTask } from '../modules/expanded-formats/types';
import { EXPANDED_FORMATS } from '../modules/expanded-formats/types';
import { parseExpandedExercise } from '../modules/expanded-formats/validate';

type Sample = { raw: Record<string, unknown>; wrong: ExpandedResponse; right: ExpandedResponse };

const SAMPLES: Record<ExpandedFormat, Sample> = {
  context_choice: {
    raw: { options: ['Six works perfectly for me.', 'Could we make it half past seven?', 'Let’s meet at half past six.'], key: 1 },
    wrong: { format: 'context_choice', picked: 0 },
    right: { format: 'context_choice', picked: 1 },
  },
  evidence_choice: {
    raw: {
      context: 'The shop was closed. We went home early because it started to rain.',
      options: ['The shop was closed.', 'it started to rain'],
      key: 1,
    },
    wrong: { format: 'evidence_choice', picked: 0 },
    right: { format: 'evidence_choice', picked: 1 },
  },
  dialogue_order: {
    raw: {
      bank: ['B: It’s eighty euros a night.', 'A: Do you have a room for tonight?', 'B: Yes, we have one double room left.', 'A: How much is it?'],
      key: [1, 2, 3, 0],
    },
    wrong: { format: 'dialogue_order', order: [0, 1, 2, 3] },
    right: { format: 'dialogue_order', order: [1, 2, 3, 0] },
  },
  word_repair: {
    raw: { words: ['She', 'have', 'finished', 'the', 'report.'], replacements: ['has', 'had', 'having'], key: { word: 1, replacement: 0 } },
    wrong: { format: 'word_repair', wordIndex: 1, replacementIndex: 1 },
    right: { format: 'word_repair', wordIndex: 1, replacementIndex: 0 },
  },
  multi_select: {
    raw: { options: ['A quiet table by the window, please.', 'A table by the window, even if it’s noisy.', 'Could we sit somewhere quiet, next to a window?', 'Somewhere quiet, even without a window.'], key: [0, 2] },
    wrong: { format: 'multi_select', picked: [0, 1] },
    right: { format: 'multi_select', picked: [2, 0] },
  },
  linked_gaps: {
    raw: { slots: [['rains', 'will rain', 'raining'], ['stay', 'will stay', 'stayed']], key: [0, 1] },
    wrong: { format: 'linked_gaps', picked: [1, 1] },
    right: { format: 'linked_gaps', picked: [0, 1] },
  },
  typed_word: {
    raw: { key: 'left' },
    wrong: { format: 'typed_word', text: 'leave' },
    right: { format: 'typed_word', text: '  LEFT ' },
  },
  sentence_transform: {
    raw: { acceptedAnswers: ['The report was written by Anna.'] },
    wrong: { format: 'sentence_transform', text: 'Anna wrote the report.' },
    right: { format: 'sentence_transform', text: 'the report  was written by anna' },
  },
  classify_function: {
    raw: { items: ['Could you help me?', 'Thanks a lot!', 'Can I ask a favour?'], groups: ['Просьба', 'Благодарность'], key: [0, 1, 0] },
    wrong: { format: 'classify_function', assignments: [0, 0, 0] },
    right: { format: 'classify_function', assignments: [0, 1, 0] },
  },
  reply_pairs: {
    raw: { questions: ['Where are you from?', 'How old are you?'], replies: ['I am twenty.', 'I am from Spain.'], key: [1, 0] },
    wrong: { format: 'reply_pairs', pairs: [0, 1] },
    right: { format: 'reply_pairs', pairs: [1, 0] },
  },
  sentence_build_noise: {
    raw: { bank: ['goes', 'She', 'go', 'to', 'school', 'at'], need: 4, key: [1, 0, 3, 4] },
    wrong: { format: 'sentence_build_noise', order: [1, 2, 3, 4] },
    right: { format: 'sentence_build_noise', order: [1, 0, 3, 4] },
  },
  remove_intruder: {
    raw: { words: ['I', 'am', 'do', 'tired'], key: 2 },
    wrong: { format: 'remove_intruder', removed: 1 },
    right: { format: 'remove_intruder', removed: 2 },
  },
};

function parsed(format: ExpandedFormat): ExpandedExercise {
  const result = parseExpandedExercise(format, SAMPLES[format].raw, 'en');
  if (!result.ok) throw new Error(`${format}: ${result.reason}`);
  return result.exercise;
}

describe('двенадцать новых механик — проверка ответа', () => {
  it('образцы покрывают все двенадцать форматов', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...EXPANDED_FORMATS].sort());
  });

  describe.each(EXPANDED_FORMATS)('%s', (format) => {
    const exercise = parsed(format);

    it('пустой ответ не полон и не засчитывается', () => {
      const empty = emptyExpandedResponse(exercise);
      expect(isExpandedResponseComplete(exercise, empty)).toBe(false);
      expect(gradeExpanded(exercise, empty, 'en')).toBe(false);
    });

    it('неверный полный ответ не засчитывается', () => {
      expect(isExpandedResponseComplete(exercise, SAMPLES[format].wrong)).toBe(true);
      expect(gradeExpanded(exercise, SAMPLES[format].wrong, 'en')).toBe(false);
    });

    it('верный ответ засчитывается', () => {
      expect(gradeExpanded(exercise, SAMPLES[format].right, 'en')).toBe(true);
    });

    it('ответ другого формата не засчитывается', () => {
      const other = EXPANDED_FORMATS.find((candidate) => SAMPLES[candidate].right.format !== SAMPLES[format].right.format)!;
      expect(gradeExpanded(exercise, SAMPLES[other].right, 'en')).toBe(false);
    });

    it('верный ответ одной строкой не пуст', () => {
      expect(expandedCorrectText(exercise).length).toBeGreaterThan(0);
    });
  });

  it('текст: диакритика сохраняется, апостроф и регистр — нет', () => {
    expect(normaliseExpandedAnswer('Salió.', 'es')).toBe('salió');
    expect(normaliseExpandedAnswer('salio', 'es')).not.toBe(normaliseExpandedAnswer('salió', 'es'));
    expect(normaliseExpandedAnswer('Non ce l’ha fatta', 'it')).toBe(normaliseExpandedAnswer("non ce l'ha fatta", 'it'));
    expect(normaliseExpandedAnswer('ABC', 'zz-неизвестный')).toBe('abc');
  });

  it('сборка: одинаковые плитки взаимозаменяемы, но одну плитку нельзя взять дважды', () => {
    const result = parseExpandedExercise('sentence_build_noise', { bank: ['the', 'cat', 'saw', 'the', 'dog', 'a'], need: 5, key: [0, 1, 2, 3, 4] }, 'en');
    if (!result.ok) throw new Error(result.reason);
    expect(gradeExpanded(result.exercise, { format: 'sentence_build_noise', order: [3, 1, 2, 0, 4] }, 'en')).toBe(true);
    expect(gradeExpanded(result.exercise, { format: 'sentence_build_noise', order: [0, 1, 2, 0, 4] }, 'en')).toBe(false);
  });

  it('два ответа: порядок не важен, повтор одного варианта не засчитывается', () => {
    const exercise = parsed('multi_select');
    expect(gradeExpanded(exercise, { format: 'multi_select', picked: [0, 0] }, 'en')).toBe(false);
  });
});

describe('двенадцать новых механик — битое задание не доходит до экрана', () => {
  const broken: [ExpandedFormat, Record<string, unknown>, string][] = [
    ['context_choice', { options: ['a', 'b'], key: 2 }, 'choice_key'],
    ['context_choice', { options: ['a', 'A'], key: 0 }, 'choice_options'],
    ['evidence_choice', { context: 'Short text.', options: ['Short text.', 'not in text'], key: 0 }, 'evidence_not_verbatim'],
    ['dialogue_order', { bank: ['a', 'b', 'c'], key: [0, 0, 1] }, 'dialogue_key'],
    ['word_repair', { words: ['a', 'b', 'c'], replacements: ['x', 'y'], key: { word: 3, replacement: 0 } }, 'repair_key'],
    ['multi_select', { options: ['a', 'b', 'c'], key: [0] }, 'multi_key_size'],
    ['multi_select', { options: ['a', 'b', 'c'], key: [0, 1, 2] }, 'multi_key_size'],
    ['linked_gaps', { slots: [['a', 'b']], key: [0] }, 'gap_slots'],
    ['typed_word', { key: 'two words' }, 'typed_word_not_one_word'],
    ['sentence_transform', { acceptedAnswers: [] }, 'text_answers'],
    ['classify_function', { items: ['a', 'b'], groups: ['g1', 'g2'], key: [0, 0] }, 'classify_empty_group'],
    ['reply_pairs', { questions: ['a', 'b'], replies: ['x', 'y', 'z'], key: [0, 1] }, 'pairs_size'],
    ['sentence_build_noise', { bank: ['a', 'b', 'c'], need: 3, key: [0, 1, 2] }, 'build_need'],
    ['remove_intruder', { words: ['a', 'b', 'c'], key: -1 }, 'intruder_key'],
  ];

  it.each(broken)('%s отбракован', (format, raw, reason) => {
    expect(parseExpandedExercise(format, raw, 'en')).toEqual({ ok: false, reason });
  });

  it('неизвестный формат и не-объект отбракованы', () => {
    expect(parseExpandedExercise('guess_phrase', {}, 'en')).toEqual({ ok: false, reason: 'format' });
    expect(parseExpandedExercise('typed_word', null, 'en')).toEqual({ ok: false, reason: 'exercise_object' });
  });
});

describe('двенадцать новых механик — нажатия', () => {
  it('два ответа: третий не добавляется, повторное нажатие снимает выбор', () => {
    const exercise = parsed('multi_select');
    let draft = emptyExpandedResponse(exercise);
    for (const index of [0, 1, 2]) draft = applyExpandedAction(exercise, draft, { type: 'tap', index });
    expect(draft).toEqual({ format: 'multi_select', picked: [0, 1] });
    draft = applyExpandedAction(exercise, draft, { type: 'tap', index: 1 });
    draft = applyExpandedAction(exercise, draft, { type: 'tap', index: 2 });
    expect(gradeExpanded(exercise, draft, 'en')).toBe(true);
  });

  it('сборка: плитка не берётся дважды, сверх нужного не кладётся, из ячейки возвращается', () => {
    const exercise = parsed('sentence_build_noise');
    let draft = emptyExpandedResponse(exercise);
    for (const index of [1, 1, 2, 3, 4, 5]) draft = applyExpandedAction(exercise, draft, { type: 'tap', index });
    expect(draft).toEqual({ format: 'sentence_build_noise', order: [1, 2, 3, 4] });
    draft = applyExpandedAction(exercise, draft, { type: 'take', position: 1 });
    expect(draft).toEqual({ format: 'sentence_build_noise', order: [1, 3, 4] });
  });

  it('пары: один ответ не стоит в двух парах', () => {
    const exercise = parsed('reply_pairs');
    let draft = emptyExpandedResponse(exercise);
    draft = applyExpandedAction(exercise, draft, { type: 'assign', slot: 0, value: 1 });
    draft = applyExpandedAction(exercise, draft, { type: 'assign', slot: 1, value: 1 });
    expect(draft).toEqual({ format: 'reply_pairs', pairs: [null, 1] });
  });

  it('исправь слово и лишнее слово: повторное нажатие снимает выбор', () => {
    const repair = parsed('word_repair');
    let draft = applyExpandedAction(repair, emptyExpandedResponse(repair), { type: 'tap', index: 1 });
    draft = applyExpandedAction(repair, draft, { type: 'replacement', index: 0 });
    expect(gradeExpanded(repair, draft, 'en')).toBe(true);
    draft = applyExpandedAction(repair, draft, { type: 'tap', index: 1 });
    expect(isExpandedResponseComplete(repair, draft)).toBe(false);
  });

  it('действие чужого вида черновик не меняет', () => {
    const exercise = parsed('context_choice');
    const draft = emptyExpandedResponse(exercise);
    expect(applyExpandedAction(exercise, draft, { type: 'text', value: 'x' })).toBe(draft);
  });
});

describe('двенадцать новых механик — пояснение', () => {
  const task = (format: ExpandedFormat, feedback: ExpandedTask['feedback']): ExpandedTask => ({
    id: `t:${format}`, studyTarget: 'en', instruction: 'i', prompt: 'p', context: '', exercise: parsed(format), feedback,
  });

  it('при ошибке показывает разбор выбранного варианта, при верном — общее', () => {
    const choice = task('context_choice', { correct: 'Верный разбор.', choiceReasons: ['Про шесть.', 'Про полвосьмого.', 'Про полседьмого.'] });
    expect(expandedFeedbackText(choice, { format: 'context_choice', picked: 0 }, false)).toBe('Про шесть.');
    expect(expandedFeedbackText(choice, { format: 'context_choice', picked: 1 }, true)).toBe('Верный разбор.');
  });

  it('ввод: известная ошибка — свой разбор, прочее — общее правило', () => {
    const typed = task('typed_word', { correct: 'Left — прошедшее.', commonErrors: [{ answer: 'leave', reason: 'Это начальная форма.' }], otherwise: 'Нужна форма прошедшего.' });
    expect(expandedFeedbackText(typed, { format: 'typed_word', text: ' Leave ' }, false)).toBe('Это начальная форма.');
    expect(expandedFeedbackText(typed, { format: 'typed_word', text: 'leaved' }, false)).toBe('Нужна форма прошедшего.');
  });

  it('пропуски: разбор только неверно заполненного пропуска', () => {
    const gaps = task('linked_gaps', { correct: 'Общее.', gapReasons: [['a0', 'a1', 'a2'], ['b0', 'b1', 'b2']] });
    expect(expandedFeedbackText(gaps, { format: 'linked_gaps', picked: [0, 2] }, false)).toBe('b2');
  });

  it('нет разбора для выбранного — общее пояснение; нет пояснений вовсе — пусто', () => {
    const bare = task('remove_intruder', { correct: 'Общее.' });
    expect(expandedFeedbackText(bare, { format: 'remove_intruder', removed: 1 }, false)).toBe('Общее.');
    expect(expandedFeedbackText(task('remove_intruder', undefined), { format: 'remove_intruder', removed: 1 }, false)).toBe('');
  });
});

describe('авторская запись Кодекса → задание', () => {
  const record = {
    schema: 'peak-expanded-author-v1',
    candidateId: 'peak-expanded-en-b001-context_choice-01',
    studyTarget: 'en',
    format: 'context_choice',
    exercise: SAMPLES.context_choice.raw,
    ui: {
      en: { instruction: 'Choose the reply', prompt: '“Can we meet at six?”', context: 'You are busy until seven.' },
      ru: { instruction: 'Выберите ответ', prompt: '“Can we meet at six?”', context: 'Вы заняты до семи.' },
    },
    feedback: {
      en: { correct: 'Half past seven is after seven.', choiceReasons: ['a', 'b', 'c'] },
      ru: { correct: 'Половина восьмого — после семи.', choiceReasons: ['а', 'б', 'в'] },
    },
  };

  it('берёт тексты на языке интерфейса', () => {
    const result = expandedTaskFromAuthorRecord(record, 'ru');
    expect(result.ok && result.task.instruction).toBe('Выберите ответ');
    expect(result.ok && result.task.feedback?.correct).toBe('Половина восьмого — после семи.');
  });

  it('для языка без перевода берёт английский', () => {
    const result = expandedTaskFromAuthorRecord(record, 'tr');
    expect(result.ok && result.task.context).toBe('You are busy until seven.');
  });

  it('чужая схема и битое задание отбракованы с причиной', () => {
    expect(expandedTaskFromAuthorRecord({ ...record, schema: 'other' }, 'ru')).toEqual({ ok: false, reason: 'schema' });
    expect(expandedTaskFromAuthorRecord({ ...record, exercise: { options: ['a'], key: 0 } }, 'ru')).toEqual({ ok: false, reason: 'choice_options' });
  });
});
