/**
 * D158 (координатор §117, 03.10, уточняет правило владельца 01.10): «тихо» = без паники, НЕ «бесконечно».
 *
 * зачем: «тихий повтор» был реализован как 5 попыток по 20 с, а потом ВЕЧНЫЙ скелетон — человек
 * смотрел на заставку, хотя загрузка давно умерла (Plus-окно, «Вспомни», ИИ-шторка). Теперь у каждой
 * загрузки один потолок: после первой неудачи 3 тихих повтора с паузами ~1/3/8 с (итого ~12 с),
 * затем спокойное «Сейчас недоступно» + тихая «Попробовать снова» (без красного и иконок ошибки).
 * Автоповтор при возврате сети/фокуса остаётся. Все числа — только здесь.
 */
export const LOAD_GATE_TOTAL_MS = 12_000;
/** Число тихих повторов после первой неудачи. */
export const LOAD_GATE_ATTEMPTS = 3;
/** Пауза ПЕРЕД повтором № i (индекс 0 — первый повтор после первой неудачи). */
export const LOAD_GATE_BACKOFF_MS: readonly number[] = Object.freeze([1_000, 3_000, 8_000]);

/** Пауза перед следующим повтором после `failedAttempts` неудач подряд; null — повторы исчерпаны. */
export function loadGateBackoffMs(failedAttempts: number): number | null {
  if (!Number.isFinite(failedAttempts) || failedAttempts < 1 || failedAttempts > LOAD_GATE_ATTEMPTS) return null;
  return LOAD_GATE_BACKOFF_MS[failedAttempts - 1] ?? null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __LoadGateConfigRouteShim() { return null; }
