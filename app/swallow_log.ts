// ═══════════════════════════════════════════════════════════════════════════
// swallow_log.ts — «проглотил — напиши причину» (PM-229 / A1).
//
// зачем: немой `catch {}` и `.catch(() => null)` годами убивали механизмы молча
// (прогрев картинок, почта, очереди). Эти три помощника заменяют их ОДНОЙ строкой,
// не меняя поведения вызывающего: значение по умолчанию прежнее, ошибка пишется в
// журнал (app/debug-logger → reportSwallowed: в памяти, с дедупом, пачкой на диск).
//
// Устойчивость: логгер НИКОГДА не ломает вызывающего. Если журнал недоступен
// (цикл импортов на старте, тестовая подмена модуля без reportSwallowed) —
// падаем в console.warn с тем же тегом, но исключения наружу не выпускаем:
// иначе «залогировали молчание» превратилось бы в новую поломку.
// ═══════════════════════════════════════════════════════════════════════════
import * as DebugLoggerModule from './debug-logger';

/** Записать причину проглоченной ошибки. `tag` = `модуль:операция`. Не бросает. */
export function noteSwallowed(tag: string, error?: unknown): void {
  try {
    const report = (DebugLoggerModule as { reportSwallowed?: (t: string, e?: unknown) => void }).reportSwallowed;
    if (typeof report === 'function') {
      report(tag, error);
      return;
    }
    console.warn(`[PM-229] ${tag}: журнал недоступен, причина:`, error instanceof Error ? error.message : String(error)); // guard-ok: журнал недоступен — последний рубеж
  } catch (reportError) {
    console.warn(`[PM-229] ${tag}: запись причины не удалась`, reportError instanceof Error ? reportError.message : 'unknown'); // guard-ok: логгер не имеет права бросать
  }
}

/** Для `.catch(noteSwallowedHandler('модуль:операция'))` — результат `undefined`, как у `() => {}`. */
export function noteSwallowedHandler(tag: string): (error: unknown) => void {
  return (error: unknown) => noteSwallowed(tag, error);
}

/** Для `.catch(noteSwallowedAs('модуль:операция', null))` — прежнее значение по умолчанию, причина в журнале. */
export function noteSwallowedAs<T>(tag: string, fallback: T): (error: unknown) => T {
  return (error: unknown) => {
    noteSwallowed(tag, error);
    return fallback;
  };
}
