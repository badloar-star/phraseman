/**
 * Проверка формы сохранённого ответа (черновика) — на границе с хранилищем.
 *
 * зачем: экзамен хранит начатую попытку на устройстве и восстанавливает её после перезапуска.
 * Прочитанное из хранилища — внешние данные: битая запись не должна дойти до подсчёта баллов.
 * Здесь проверяется только ФОРМА; подходит ли ответ заданию, решает gradeExpanded.
 */
import type { ExpandedResponse } from './types';
import { isExpandedFormat } from './types';

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isIndexOrNull(value: unknown): value is number | null {
  return value === null || isIndex(value);
}

function isList(value: unknown, item: (entry: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= 64 && value.every(item);
}

export function isPersistedExpandedResponse(value: unknown): value is ExpandedResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const raw = value as Readonly<Record<string, unknown>>;
  if (!isExpandedFormat(raw.format)) return false;
  switch (raw.format) {
    case 'context_choice':
    case 'evidence_choice':
      return isIndexOrNull(raw.picked);
    case 'dialogue_order':
    case 'sentence_build_noise':
      return isList(raw.order, isIndex);
    case 'word_repair':
      return isIndexOrNull(raw.wordIndex) && isIndexOrNull(raw.replacementIndex);
    case 'multi_select':
      return isList(raw.picked, isIndex);
    case 'linked_gaps':
      return isList(raw.picked, isIndexOrNull);
    case 'typed_word':
    case 'sentence_transform':
      return typeof raw.text === 'string' && raw.text.length <= 400;
    case 'classify_function':
      return isList(raw.assignments, isIndexOrNull);
    case 'reply_pairs':
      return isList(raw.pairs, isIndexOrNull);
    case 'remove_intruder':
      return isIndexOrNull(raw.removed);
    default:
      return false;
  }
}
