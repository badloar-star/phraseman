/**
 * Разбор настройки тренировки из маршрута (экран настройки — сессия 3, кадры 033–038).
 *
 * зачем (координатор 04.10): на экране настройки выбирают время Блица, направление «Вспомни и напиши» и
 * размер «Правды/лжи», но сессии раньше этого не читали (Блиц — константа 60 с, «Правда/ложь» — весь пул).
 * Без параметра или с мусором — ровно прежнее поведение. Каждый разбор пишет [PRACTICE-SETUP]: что пришло
 * и что применено, — чтобы «выбрал 30 с, а идёт 60» находилось одним поиском.
 */
import { BLITZ_DURATION_SEC } from './blitz_logic';

const LOG = '[PRACTICE-SETUP]';

export const BLITZ_DURATION_OPTIONS_SEC = [30, 60, 90] as const;
export type BlitzDurationSec = typeof BLITZ_DURATION_OPTIONS_SEC[number];

/** to_target — показываем перевод, пишем на изучаемом языке (как было); to_source — наоборот. */
export type RecallDirection = 'to_target' | 'to_source';
export const RECALL_DIRECTION_DEFAULT: RecallDirection = 'to_target';

function firstParam(raw: unknown): string {
  if (Array.isArray(raw)) return firstParam(raw[0]);
  return typeof raw === 'string' ? raw.trim() : '';
}

function logSetup(param: string, received: string, applied: string | number, reason: string): void {
  console.log(LOG, JSON.stringify({ param, received: received || '(нет)', applied, reason }));
}

export function parseBlitzDurationSec(raw: unknown): BlitzDurationSec {
  const received = firstParam(raw);
  const value = Number(received);
  const option = BLITZ_DURATION_OPTIONS_SEC.find((sec) => sec === value);
  if (option !== undefined) {
    logSetup('blitz.sec', received, option, 'from_route');
    return option;
  }
  const fallback = BLITZ_DURATION_SEC as BlitzDurationSec;
  logSetup('blitz.sec', received, fallback, received ? 'invalid_fallback_default' : 'absent_default');
  return fallback;
}

export function parseRecallDirection(raw: unknown): RecallDirection {
  const received = firstParam(raw);
  if (received === 'to_target' || received === 'to_source') {
    logSetup('recall.dir', received, received, 'from_route');
    return received;
  }
  logSetup('recall.dir', received, RECALL_DIRECTION_DEFAULT, received ? 'invalid_fallback_default' : 'absent_default');
  return RECALL_DIRECTION_DEFAULT;
}

/** Лог разбора размера сессии там, где сам разбор уже есть (свайп / «Правда/ложь»). */
export function logSessionSizeSetup(mode: string, raw: unknown, applied: number): void {
  const received = firstParam(raw);
  logSetup(`${mode}.size`, received, applied === 0 ? 'all' : applied,
    applied > 0 ? 'from_route' : received && received !== 'all' ? 'invalid_fallback_all' : 'all');
}
