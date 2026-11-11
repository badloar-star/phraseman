/**
 * Пик — задания двенадцати новых механик внутри недельного пакета.
 * Чистый модуль: ни React, ни Firebase, ни часов.
 *
 * зачем (владелец 11.11.2026: «код сейчас, пул после вычитки»): игра Пика должна уметь показать задание новой
 * механики, как только оно появится в пакете недели. Сам пул Кодекса в игру не выкладывается, пока не вычитан
 * и не переведены пояснения, — поэтому здесь только чтение и проверка формы, без содержания.
 *
 * Форма задания в пакете: kind = 'expanded', mode = один из двенадцати форматов, payload = { exercise, ui, feedback } —
 * те же три поля, что в авторской записи Кодекса (`peak-expanded-author-v1`), без редакторских пометок.
 *
 * В отличие от прежних заданий Пика, верный ответ лежит в самом задании, а не в отпечатке: ввод с клавиатуры и
 * разбор допущенной ошибки по отпечатку не восстановить. Соль отпечатков и раньше не была секретом (answer_reveal.ts
 * перебором находит верный вариант), так что защита от подглядывания в файл пакета не меняется.
 */
import { expandedTaskFromAuthorRecord, EXPANDED_AUTHOR_SCHEMA } from '../expanded-formats/author_record';
import type { ExpandedTask } from '../expanded-formats/types';
import { isExpandedFormat } from '../expanded-formats/types';

export const SPIRE_EXPANDED_KIND = 'expanded' as const;

export type SpireExpandedTaskParse =
  | Readonly<{ ok: true; task: ExpandedTask }>
  | Readonly<{ ok: false; reason: string }>;

type TaskLike = Readonly<{ taskId: string; mode: string; kind: string; payload: Readonly<Record<string, unknown>> }>;

/**
 * Задание пакета → задание для экрана на языке интерфейса `uiLang`. Отказ с причиной — задание показывать нельзя.
 * `studyTarget` — язык пакета: по нему приводится регистр вводимого ответа.
 */
export function spireExpandedTaskFromPack(task: TaskLike, uiLang: string, studyTarget: string): SpireExpandedTaskParse {
  if (task.kind !== SPIRE_EXPANDED_KIND) return { ok: false, reason: `kind:${task.kind}` };
  if (!isExpandedFormat(task.mode)) return { ok: false, reason: `mode:${task.mode}` };
  return expandedTaskFromAuthorRecord({
    schema: EXPANDED_AUTHOR_SCHEMA,
    candidateId: task.taskId,
    studyTarget,
    format: task.mode,
    exercise: task.payload.exercise,
    ui: task.payload.ui,
    feedback: task.payload.feedback,
  }, uiLang);
}

/** Годится ли задание пакета к показу — для закрытого разбора пакета (битое задание отбраковывает весь набор). */
export function spireExpandedTaskIsValid(task: TaskLike, studyTarget: string): boolean {
  return spireExpandedTaskFromPack(task, 'en', studyTarget).ok;
}
