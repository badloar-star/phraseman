/**
 * Пульс кнопки «Ошибки» на Главной: чем больше ошибок, тем быстрее.
 *
 * зачем (владелец 2026-09-14): «кнопка должна пульсировать, чем больше ошибок
 * тем быстрее пульсирование, и всегда показывать счётчик». Чистая модель без
 * React, чтобы тест сторожил кривую скорости, а компонент только рисовал.
 */
/**
 * зачем (владелец 2026-09-15): «пульс чуть слабее и медленнее». Прежние
 * 2400→700 мс дышали слишком заметно и на Главной читались как тревога.
 * Теперь дыхание спокойное: от 3400 мс при одной ошибке до 1400 мс при многих.
 */
export const HOME_MISTAKES_PULSE_SLOWEST_MS = 3400;
export const HOME_MISTAKES_PULSE_FASTEST_MS = 1400;
/** Сколько миллисекунд снимает каждая следующая ошибка сверх первой. */
export const HOME_MISTAKES_PULSE_STEP_MS = 60;

/**
 * Сколько ошибок должно накопиться, чтобы раздел вообще открывался.
 *
 * зачем (владелец 2026-09-15): «пока там нет 10 ошибок, пусть этот раздел
 * нельзя будет открыть». На двух-трёх промахах разбирать нечего: и статистика
 * врёт, и занятие не из чего собрать. Кнопка при этом остаётся на Главной и
 * по тапу честно объясняет, почему рано.
 */
export const HOME_MISTAKES_UNLOCK_AT = 10;

/** Состояние кнопки у заголовка «Сегодня». */
export type HomeMistakesButtonState = 'idle' | 'locked' | 'ready';

/**
 * idle - ошибок нет: кнопка серая и не дышит.
 * locked - ошибки есть, но меньше порога: раздел закрыт, пульса нет.
 * ready - порог взят: раздел открыт, кнопка дышит.
 */
export function homeMistakesButtonState(count: number): HomeMistakesButtonState {
  const normalized = Number.isFinite(count) ? Math.floor(count) : 0;
  if (normalized < 1) return 'idle';
  return normalized >= HOME_MISTAKES_UNLOCK_AT ? 'ready' : 'locked';
}

/**
 * Период одного вдоха-выдоха; null - не пульсируем.
 *
 * Пульс только у открытого раздела: до порога он звал бы туда, куда не пускают,
 * а при нуле ошибок звать вообще некуда.
 */
export function homeMistakesPulsePeriodMs(count: number): number | null {
  if (homeMistakesButtonState(count) !== 'ready') return null;
  const normalized = Math.floor(count);
  const period = HOME_MISTAKES_PULSE_SLOWEST_MS - (normalized - 1) * HOME_MISTAKES_PULSE_STEP_MS;
  return Math.max(HOME_MISTAKES_PULSE_FASTEST_MS, Math.min(HOME_MISTAKES_PULSE_SLOWEST_MS, period));
}

/** Подпись счётчика: от 100 показываем «99+», чтобы пилюля не разъезжалась. */
export function homeMistakesCounterLabel(count: number): string {
  if (!Number.isFinite(count) || count < 1) return '0';
  return count > 99 ? '99+' : String(Math.floor(count));
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
