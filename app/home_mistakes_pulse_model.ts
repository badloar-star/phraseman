/**
 * Пульс кнопки «Ошибки» на Главной: чем больше ошибок, тем быстрее.
 *
 * зачем (владелец 2026-09-14): «кнопка должна пульсировать, чем больше ошибок
 * тем быстрее пульсирование, и всегда показывать счётчик». Чистая модель без
 * React, чтобы тест сторожил кривую скорости, а компонент только рисовал.
 */
export const HOME_MISTAKES_PULSE_SLOWEST_MS = 2400;
export const HOME_MISTAKES_PULSE_FASTEST_MS = 700;
/** Сколько миллисекунд снимает каждая следующая ошибка сверх первой. */
export const HOME_MISTAKES_PULSE_STEP_MS = 80;

/** Период одного вдоха-выдоха; null - ошибок нет, кнопка скрыта. */
export function homeMistakesPulsePeriodMs(count: number): number | null {
  if (!Number.isFinite(count) || count < 1) return null;
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
