/**
 * Проверка ответа для двенадцати новых механик. Единственное место, где решается
 * «верно / неверно» — экраны своей логики правильности не держат.
 *
 * Перенос `grade`/`normaliseAnswer` из авторского контракта Кодекса (contract.mjs),
 * поведение совпадает: тот же пул должен давать те же вердикты.
 */
import type { ExpandedExercise, ExpandedResponse } from './types';

/**
 * Канонический вид текстового ответа: NFC, пробелы, регистр, конечная точка.
 * зачем: диакритика СОХРАНЯЕТСЯ — испанское `salió` не равно `salio` (правило контракта:
 * ударение меняет слово). Апострофы приводятся к прямому: с телефона приходит и ’ и '.
 */
export function normaliseExpandedAnswer(value: string, lang: string): string {
  const flat = value
    .normalize('NFC')
    .replace(/[’`]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '');
  // зачем: чужой код языка заставил бы toLocaleLowerCase бросить RangeError — список закрытый, прочее идёт общим правилом
  return CASE_LOCALES.has(lang) ? flat.toLocaleLowerCase(lang) : flat.toLowerCase();
}

const CASE_LOCALES: ReadonlySet<string> = new Set(['en', 'es', 'de', 'fr', 'it']);

function sameList(left: readonly (number | null)[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Полон ли ответ — можно ли нажать «Проверить». Неполный ответ не проверяется вовсе. */
export function isExpandedResponseComplete(exercise: ExpandedExercise, response: ExpandedResponse): boolean {
  if (exercise.format !== response.format) return false;
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice':
      return (response as { picked: number | null }).picked !== null;
    case 'dialogue_order':
      return (response as { order: readonly number[] }).order.length === exercise.bank.length;
    case 'sentence_build_noise':
      return (response as { order: readonly number[] }).order.length === exercise.need;
    case 'word_repair': {
      const answer = response as { wordIndex: number | null; replacementIndex: number | null };
      return answer.wordIndex !== null && answer.replacementIndex !== null;
    }
    case 'multi_select':
      return (response as { picked: readonly number[] }).picked.length === exercise.key.length;
    case 'linked_gaps': {
      const picked = (response as { picked: readonly (number | null)[] }).picked;
      return picked.length === exercise.slots.length && picked.every((value) => value !== null);
    }
    case 'typed_word':
    case 'sentence_transform':
      return (response as { text: string }).text.trim().length > 0;
    case 'classify_function': {
      const assignments = (response as { assignments: readonly (number | null)[] }).assignments;
      return assignments.length === exercise.items.length && assignments.every((value) => value !== null);
    }
    case 'reply_pairs': {
      const pairs = (response as { pairs: readonly (number | null)[] }).pairs;
      return pairs.length === exercise.questions.length && pairs.every((value) => value !== null);
    }
    case 'remove_intruder':
      return (response as { removed: number | null }).removed !== null;
    default:
      return false;
  }
}

/** Верен ли ответ. Неполный или чужого формата — неверен. */
export function gradeExpanded(exercise: ExpandedExercise, response: ExpandedResponse, lang: string): boolean {
  if (!isExpandedResponseComplete(exercise, response)) return false;
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice':
      return (response as { picked: number | null }).picked === exercise.key;
    case 'dialogue_order':
      return sameList((response as { order: readonly number[] }).order, exercise.key);
    case 'sentence_build_noise': {
      // зачем: две одинаковые плитки банка взаимозаменяемы — сравнивается получившийся ТЕКСТ, а не номера плиток
      const order = (response as { order: readonly number[] }).order;
      if (new Set(order).size !== order.length) return false;
      return exercise.key.every((bankIndex, position) => exercise.bank[bankIndex] === exercise.bank[order[position]]);
    }
    case 'word_repair': {
      const answer = response as { wordIndex: number | null; replacementIndex: number | null };
      return answer.wordIndex === exercise.key.word && answer.replacementIndex === exercise.key.replacement;
    }
    case 'multi_select': {
      const picked = (response as { picked: readonly number[] }).picked;
      if (new Set(picked).size !== picked.length) return false;
      return sameList([...picked].sort((a, b) => a - b), [...exercise.key].sort((a, b) => a - b));
    }
    case 'linked_gaps':
      return sameList((response as { picked: readonly (number | null)[] }).picked, exercise.key);
    case 'typed_word':
    case 'sentence_transform': {
      const given = normaliseExpandedAnswer((response as { text: string }).text, lang);
      return exercise.acceptedAnswers.some((accepted) => normaliseExpandedAnswer(accepted, lang) === given);
    }
    case 'classify_function':
      return sameList((response as { assignments: readonly (number | null)[] }).assignments, exercise.key);
    case 'reply_pairs':
      return sameList((response as { pairs: readonly (number | null)[] }).pairs, exercise.key);
    case 'remove_intruder':
      return (response as { removed: number | null }).removed === exercise.key;
    default:
      return false;
  }
}

/** Пустой черновик ответа для задания — с него начинает экран. */
export function emptyExpandedResponse(exercise: ExpandedExercise): ExpandedResponse {
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice':
      return { format: exercise.format, picked: null };
    case 'dialogue_order':
    case 'sentence_build_noise':
      return { format: exercise.format, order: [] };
    case 'word_repair':
      return { format: 'word_repair', wordIndex: null, replacementIndex: null };
    case 'multi_select':
      return { format: 'multi_select', picked: [] };
    case 'linked_gaps':
      return { format: 'linked_gaps', picked: exercise.slots.map(() => null) };
    case 'typed_word':
    case 'sentence_transform':
      return { format: exercise.format, text: '' };
    case 'classify_function':
      return { format: 'classify_function', assignments: exercise.items.map(() => null) };
    case 'reply_pairs':
      return { format: 'reply_pairs', pairs: exercise.questions.map(() => null) };
    case 'remove_intruder':
      return { format: 'remove_intruder', removed: null };
  }
}

/** Верный ответ одной строкой — для «Правильно: …» и для «Моих ошибок». */
export function expandedCorrectText(exercise: ExpandedExercise): string {
  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice':
      return exercise.options[exercise.key] ?? '';
    case 'dialogue_order':
      return exercise.key.map((index) => exercise.bank[index]).join(' → ');
    case 'sentence_build_noise':
      return exercise.key.map((index) => exercise.bank[index]).join(' ');
    case 'word_repair':
      return exercise.words
        .map((word, index) => (index === exercise.key.word ? exercise.replacements[exercise.key.replacement] : word))
        .join(' ');
    case 'multi_select':
      return [...exercise.key].sort((a, b) => a - b).map((index) => exercise.options[index]).join(' / ');
    case 'linked_gaps':
      return exercise.key.map((index, slot) => exercise.slots[slot][index]).join(' … ');
    case 'typed_word':
    case 'sentence_transform':
      return exercise.acceptedAnswers[0] ?? '';
    case 'classify_function':
      return exercise.items.map((item, index) => `${item} — ${exercise.groups[exercise.key[index]]}`).join('; ');
    case 'reply_pairs':
      return exercise.questions.map((question, index) => `${question} — ${exercise.replies[exercise.key[index]]}`).join('; ');
    case 'remove_intruder':
      return exercise.words.filter((_word, index) => index !== exercise.key).join(' ');
  }
}
