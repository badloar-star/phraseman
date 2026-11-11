/**
 * Какое пояснение показать после ответа. Чистая функция: по заданию, ответу и вердикту
 * выбирает из авторских пояснений то, что относится именно к допущенной ошибке.
 *
 * зачем: пояснение «почему верный ответ верен» ученику, который ошибся, отвечает не на его вопрос.
 * В пуле Кодекса разобран каждый вариант, каждое слово и каждая типичная ошибка ввода — показываем
 * разбор того, что ученик выбрал. Нет разбора для выбранного — показываем общее пояснение.
 */
import { normaliseExpandedAnswer } from './grade';
import type { ExpandedResponse, ExpandedTask } from './types';

function joined(parts: readonly (string | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join(' ');
}

export function expandedFeedbackText(task: ExpandedTask, response: ExpandedResponse, correct: boolean): string {
  const feedback = task.feedback;
  if (!feedback) return '';
  const exercise = task.exercise;
  if (correct || exercise.format !== response.format) return feedback.correct;

  let specific = '';
  switch (response.format) {
    case 'context_choice':
    case 'evidence_choice':
      specific = response.picked === null ? '' : feedback.choiceReasons?.[response.picked] ?? '';
      break;
    case 'multi_select': {
      if (exercise.format !== 'multi_select') break;
      const wrongPicks = response.picked.filter((index) => !exercise.key.includes(index));
      specific = joined(wrongPicks.map((index) => feedback.choiceReasons?.[index]));
      break;
    }
    case 'word_repair': {
      if (exercise.format !== 'word_repair') break;
      specific = response.wordIndex !== exercise.key.word
        ? (response.wordIndex === null ? '' : feedback.wordReasons?.[response.wordIndex] ?? '')
        : (response.replacementIndex === null ? '' : feedback.replacementReasons?.[response.replacementIndex] ?? '');
      break;
    }
    case 'linked_gaps': {
      if (exercise.format !== 'linked_gaps') break;
      specific = joined(response.picked.map((value, slot) => (
        value === null || value === exercise.key[slot] ? undefined : feedback.gapReasons?.[slot]?.[value]
      )));
      break;
    }
    case 'classify_function': {
      if (exercise.format !== 'classify_function') break;
      specific = joined(response.assignments.map((value, item) => (value === exercise.key[item] ? undefined : feedback.itemReasons?.[item])));
      break;
    }
    case 'reply_pairs': {
      if (exercise.format !== 'reply_pairs') break;
      specific = joined(response.pairs.map((value, question) => (value === exercise.key[question] ? undefined : feedback.itemReasons?.[question])));
      break;
    }
    case 'dialogue_order': {
      if (exercise.format !== 'dialogue_order') break;
      // зачем: показываем разбор первой реплики, вставшей не на своё место, — остальные сдвинулись из-за неё
      const firstWrong = response.order.findIndex((bankIndex, position) => bankIndex !== exercise.key[position]);
      specific = firstWrong < 0 ? '' : feedback.sequenceReasons?.[response.order[firstWrong]] ?? '';
      break;
    }
    case 'sentence_build_noise': {
      if (exercise.format !== 'sentence_build_noise') break;
      const firstWrong = response.order.findIndex((bankIndex, position) => exercise.bank[bankIndex] !== exercise.bank[exercise.key[position]]);
      specific = firstWrong < 0 ? '' : feedback.bankReasons?.[response.order[firstWrong]] ?? '';
      break;
    }
    case 'remove_intruder':
      specific = response.removed === null ? '' : feedback.wordReasons?.[response.removed] ?? '';
      break;
    case 'typed_word':
    case 'sentence_transform': {
      const given = normaliseExpandedAnswer(response.text, task.studyTarget);
      const known = feedback.commonErrors?.find((entry) => normaliseExpandedAnswer(entry.answer, task.studyTarget) === given);
      specific = known?.reason ?? feedback.otherwise ?? '';
      break;
    }
    default:
      break;
  }
  return specific.trim() || feedback.correct;
}
