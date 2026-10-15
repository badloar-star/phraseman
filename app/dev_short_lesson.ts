/**
 * DEV-укорочение урока 1.0: `dev_state?shortLesson=N` (1..10) / `shortLesson=off`.
 *
 * зачем (координатор 15.10): Сверке нужно честно проверить итог урока — «серия N дней / сегодня засчитан», монеты, звёзды, — а урок 1
 * из 50 заданий руками не пройти. Подменяется ТОЛЬКО число позиций в проходе (lesson1 `effectiveTotal`); ответы, проверка, монеты за
 * ответы, оценка (верно ÷ всего × 5), звёзды, серия и задача «Сегодня» идут тем же боевым кодом, результат не подменяется.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке — заглушка store_release_stubs/dev_state/dev_short_lesson_stub.ts (геттер null).
 * Память процесса: перезапуск снимает. Прогресс урока, записанный коротким проходом (длина N), полный урок не восстановит — начнёт заново.
 * Лог: [DEV-STATE] shortLesson.
 */
import { IS_STORE_RELEASE } from './config';

export const DEV_SHORT_LESSON_MAX = 10;
let cells: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить число заданий (1..10) или снять (null). В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevShortLessonCells(next: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] shortLesson: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  if (next !== null && (!Number.isInteger(next) || next < 1 || next > DEV_SHORT_LESSON_MAX)) {
    console.warn('[DEV-STATE] shortLesson: отклонено — ожидалось 1..10 или off', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  cells = next;
  console.log(next === null ? '[DEV-STATE] shortLesson override=off (урок как в бою, 50 заданий)' : `[DEV-STATE] shortLesson override=${next} (урок из ${next} заданий; начисление — боевой код)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Число заданий короткого урока или null (обычный урок). В стор-сборке всегда null. */
export function getDevShortLessonCells(): number | null {
  if (!devAvailable()) return null;
  return cells;
}

export function resetDevShortLessonForTests(): void {
  cells = null;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
