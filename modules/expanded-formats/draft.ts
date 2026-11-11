/**
 * Черновик ответа: что происходит с ответом при каждом нажатии. Чистые функции —
 * экран только рисует и зовёт их, поэтому поведение нажатий проверяется тестом без устройства.
 *
 * Поведение списано с одобренного макета Кодекса (extended-formats.mjs / peak-all-languages.html):
 * повторное нажатие снимает выбор; сверх нужного числа выбрать нельзя; плитка из ячейки возвращается в банк.
 */
import type { ExpandedExercise, ExpandedResponse } from './types';

export type ExpandedAction =
  /** Нажатие на вариант / плитку банка / слово. */
  | Readonly<{ type: 'tap'; index: number }>
  /** Нажатие на занятую ячейку: вернуть плитку в банк. */
  | Readonly<{ type: 'take'; position: number }>
  /** Выбор замены (исправь слово). */
  | Readonly<{ type: 'replacement'; index: number }>
  /** Выбор варианта в пропуске / группы для реплики / ответа для вопроса. `value: null` снимает выбор. */
  | Readonly<{ type: 'assign'; slot: number; value: number | null }>
  | Readonly<{ type: 'text'; value: string }>;

function setAt<T>(list: readonly T[], at: number, value: T): T[] {
  return list.map((current, index) => (index === at ? value : current));
}

/** Новый черновик после действия. Действие, не подходящее формату, черновик не меняет. */
export function applyExpandedAction(
  exercise: ExpandedExercise,
  response: ExpandedResponse,
  action: ExpandedAction,
): ExpandedResponse {
  if (exercise.format !== response.format) return response;

  switch (response.format) {
    case 'context_choice':
    case 'evidence_choice': {
      if (action.type !== 'tap') return response;
      return { ...response, picked: action.index };
    }
    case 'remove_intruder': {
      if (action.type !== 'tap') return response;
      return { ...response, removed: response.removed === action.index ? null : action.index };
    }
    case 'multi_select': {
      if (action.type !== 'tap' || exercise.format !== 'multi_select') return response;
      if (response.picked.includes(action.index)) {
        return { ...response, picked: response.picked.filter((value) => value !== action.index) };
      }
      // зачем: «выберите ДВА» — третий вариант не добавляется, пока не снят один из выбранных
      if (response.picked.length >= exercise.key.length) return response;
      return { ...response, picked: [...response.picked, action.index] };
    }
    case 'dialogue_order':
    case 'sentence_build_noise': {
      const need = exercise.format === 'sentence_build_noise' ? exercise.need
        : exercise.format === 'dialogue_order' ? exercise.bank.length : 0;
      if (action.type === 'take') {
        return { ...response, order: response.order.filter((_value, position) => position !== action.position) };
      }
      if (action.type !== 'tap') return response;
      if (response.order.includes(action.index) || response.order.length >= need) return response;
      return { ...response, order: [...response.order, action.index] };
    }
    case 'word_repair': {
      if (action.type === 'tap') {
        return { ...response, wordIndex: response.wordIndex === action.index ? null : action.index };
      }
      if (action.type === 'replacement') {
        return { ...response, replacementIndex: response.replacementIndex === action.index ? null : action.index };
      }
      return response;
    }
    case 'linked_gaps': {
      if (action.type !== 'assign') return response;
      return { ...response, picked: setAt(response.picked, action.slot, action.value) };
    }
    case 'classify_function': {
      if (action.type !== 'assign') return response;
      return { ...response, assignments: setAt(response.assignments, action.slot, action.value) };
    }
    case 'reply_pairs': {
      if (action.type !== 'assign') return response;
      // зачем: один ответ не может стоять в двух парах — прежняя пара с этим ответом распадается
      const cleared = response.pairs.map((value) => (action.value !== null && value === action.value ? null : value));
      return { ...response, pairs: setAt(cleared, action.slot, action.value) };
    }
    case 'typed_word':
    case 'sentence_transform': {
      if (action.type !== 'text') return response;
      return { ...response, text: action.value };
    }
    default:
      return response;
  }
}
