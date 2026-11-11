/**
 * Закрытая проверка формы задания на границе: пакет Пика, авторская запись, сборщик экзамена.
 *
 * зачем: задание с битым полем (ключ за пределами списка, пустой вариант) на экране превращается
 * в «нажал верно — засчитали неверно». Такое задание обязано быть отброшено ДО показа, с причиной.
 * Правила перенесены из `validateRecord` авторского контракта Кодекса (contract.mjs).
 */
import { normaliseExpandedAnswer } from './grade';
import type { ExpandedExercise, ExpandedFormat } from './types';
import { isExpandedFormat } from './types';

type Raw = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIndex(value: unknown, size: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size;
}

function textList(value: unknown, min: number, unique = false): value is string[] {
  if (!Array.isArray(value) || value.length < min || !value.every(isText)) return false;
  if (!unique) return true;
  return new Set(value.map((item: string) => item.normalize('NFC').trim().toLowerCase())).size === value.length;
}

function indexList(value: unknown, length: number, size: number, unique = true): value is number[] {
  if (!Array.isArray(value) || value.length !== length || !value.every((item) => isIndex(item, size))) return false;
  return !unique || new Set(value).size === value.length;
}

export type ExpandedExerciseParse =
  | Readonly<{ ok: true; exercise: ExpandedExercise }>
  | Readonly<{ ok: false; reason: string }>;

const fail = (reason: string): ExpandedExerciseParse => ({ ok: false, reason });

/** Принятые текстовые ответы: либо список `acceptedAnswers`, либо один `key` (так пишет авторский пул). */
function acceptedOf(raw: Raw): unknown {
  return Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers : [raw.key];
}

/**
 * Разбор сырого задания в строгий тип. Возвращает либо задание, либо причину отказа —
 * вызывающий код обязан причину записать в журнал, а задание не показывать.
 */
export function parseExpandedExercise(format: unknown, raw: unknown, lang: string): ExpandedExerciseParse {
  if (!isExpandedFormat(format)) return fail('format');
  if (!isRecord(raw)) return fail('exercise_object');
  const kind: ExpandedFormat = format;

  switch (kind) {
    case 'context_choice': {
      if (!textList(raw.options, 2, true)) return fail('choice_options');
      if (!isIndex(raw.key, raw.options.length)) return fail('choice_key');
      return { ok: true, exercise: { format: kind, options: raw.options, key: raw.key } };
    }
    case 'evidence_choice': {
      // зачем: в авторском пуле текст лежит в `context`; рантайм зовёт его `passage`, чтобы не путать с условием задания
      const passage = isText(raw.passage) ? raw.passage : raw.context;
      if (!isText(passage)) return fail('evidence_passage');
      if (!textList(raw.options, 2, true)) return fail('choice_options');
      if (!isIndex(raw.key, raw.options.length)) return fail('choice_key');
      if (!raw.options.every((option) => passage.includes(option))) return fail('evidence_not_verbatim');
      return { ok: true, exercise: { format: kind, passage, options: raw.options, key: raw.key } };
    }
    case 'dialogue_order': {
      if (!textList(raw.bank, 2, true)) return fail('dialogue_bank');
      if (!indexList(raw.key, raw.bank.length, raw.bank.length)) return fail('dialogue_key');
      return { ok: true, exercise: { format: kind, bank: raw.bank, key: raw.key } };
    }
    case 'word_repair': {
      if (!textList(raw.words, 3)) return fail('repair_words');
      if (!textList(raw.replacements, 2, true)) return fail('repair_replacements');
      const key = raw.key;
      if (!isRecord(key) || !isIndex(key.word, raw.words.length) || !isIndex(key.replacement, raw.replacements.length)) {
        return fail('repair_key');
      }
      return {
        ok: true,
        exercise: { format: kind, words: raw.words, replacements: raw.replacements, key: { word: key.word, replacement: key.replacement } },
      };
    }
    case 'multi_select': {
      if (!textList(raw.options, 3, true)) return fail('multi_options');
      const key = raw.key;
      if (!Array.isArray(key) || key.length < 2 || key.length >= raw.options.length) return fail('multi_key_size');
      if (!indexList(key, key.length, raw.options.length)) return fail('multi_key');
      return { ok: true, exercise: { format: kind, options: raw.options, key } };
    }
    case 'linked_gaps': {
      const slots = raw.slots;
      if (!Array.isArray(slots) || slots.length < 2 || !slots.every((slot) => textList(slot, 2, true))) return fail('gap_slots');
      const key = raw.key;
      if (!Array.isArray(key) || key.length !== slots.length) return fail('gap_key_size');
      if (!key.every((value, index) => isIndex(value, (slots[index] as string[]).length))) return fail('gap_key');
      return { ok: true, exercise: { format: kind, slots: slots as string[][], key: key as number[] } };
    }
    case 'typed_word':
    case 'sentence_transform': {
      const accepted = acceptedOf(raw);
      if (!textList(accepted, 1)) return fail('text_answers');
      if (kind === 'typed_word' && !accepted.every((answer) => answer.trim().split(/\s+/).length === 1)) {
        return fail('typed_word_not_one_word');
      }
      const unique = [...new Map(accepted.map((answer) => [normaliseExpandedAnswer(answer, lang), answer.trim()])).values()];
      return { ok: true, exercise: { format: kind, acceptedAnswers: unique } };
    }
    case 'classify_function': {
      if (!textList(raw.items, 2, true) || !textList(raw.groups, 2, true)) return fail('classify_lists');
      if (!indexList(raw.key, raw.items.length, raw.groups.length, false)) return fail('classify_key');
      // зачем: пустая группа — подсказка «сюда ничего не клади»; контракт требует, чтобы каждая группа была занята
      if (new Set(raw.key).size !== raw.groups.length) return fail('classify_empty_group');
      return { ok: true, exercise: { format: kind, items: raw.items, groups: raw.groups, key: raw.key } };
    }
    case 'reply_pairs': {
      if (!textList(raw.questions, 2, true) || !textList(raw.replies, 2, true)) return fail('pairs_lists');
      if (raw.questions.length !== raw.replies.length) return fail('pairs_size');
      if (!indexList(raw.key, raw.questions.length, raw.replies.length)) return fail('pairs_key');
      return { ok: true, exercise: { format: kind, questions: raw.questions, replies: raw.replies, key: raw.key } };
    }
    case 'sentence_build_noise': {
      if (!textList(raw.bank, 3)) return fail('build_bank');
      const need = raw.need;
      if (typeof need !== 'number' || !Number.isInteger(need) || need <= 0 || need >= raw.bank.length) return fail('build_need');
      if (!indexList(raw.key, need, raw.bank.length)) return fail('build_key');
      return { ok: true, exercise: { format: kind, bank: raw.bank, need, key: raw.key } };
    }
    case 'remove_intruder': {
      if (!textList(raw.words, 3)) return fail('intruder_words');
      if (!isIndex(raw.key, raw.words.length)) return fail('intruder_key');
      return { ok: true, exercise: { format: kind, words: raw.words, key: raw.key } };
    }
  }
}
