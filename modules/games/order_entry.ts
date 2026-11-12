/**
 * «Собери диалог» — что показать на входе: диалог дня или честное пустое состояние.
 * зачем (обход экранов 12.11, 🔴): на немецком уроке 1 экран открывался пустым «0 / 0» с активной «Готово».
 * Диалоги в банках начинаются не с урока 1 (de — с 4, fr / es / it — с 3, en — с 2; решение владельца 11.11): в ранних
 * уроках одни утверждения, однозначный порядок реплик из них не собрать. Разминка такую игру не предлагает, но экран,
 * открытый напрямую, не должен изображать сыгранную игру — он говорит, с какого урока появятся диалоги.
 */
import type { OrderTask } from './dialogue_core';
import { dailyPortion } from './task_source';

export interface OrderEntry {
  /** Диалог дня; null — для этого урока диалогов нет. */
  readonly task: OrderTask | null;
  /** Первый урок, где у языка есть диалог; null — у языка их нет вовсе. */
  readonly firstLesson: number | null;
}

/** Первый урок банка, у которого есть хотя бы один диалог. */
export function firstOrderLesson(bank: Readonly<Record<number, readonly OrderTask[]>> | undefined): number | null {
  if (!bank) return null;
  const lessons = Object.keys(bank).map(Number).filter((n) => Number.isInteger(n) && (bank[n]?.length ?? 0) > 0);
  return lessons.length > 0 ? Math.min(...lessons) : null;
}

/** `tasks` — диалоги, подобранные для урока (orderTasksFor); `daySeed` — номер дня, чтобы диалог менялся от дня к дню. */
export function orderEntry(
  tasks: readonly OrderTask[],
  bank: Readonly<Record<number, readonly OrderTask[]>> | undefined,
  daySeed: number,
): OrderEntry {
  const task = dailyPortion(tasks, 1, daySeed)[0] ?? null;
  return { task, firstLesson: firstOrderLesson(bank) };
}
