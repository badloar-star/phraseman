// ═══════════════════════════════════════════════════════════════════════════
// train_nav_trace.ts — [NAV-PAINT-TRACE]: цепочка «тап Тренировать → первый кадр хаба Карточек», каждая отметка с мс от тапа.
//
// зачем (🔴 Макеты, 15.10: переход с ролика на /flashcards занимает ~6,9 с, причина неизвестна; «сперва логи»): отметки тап → router.navigate → blur/unmount ролика (и плеера отдельно)
// → mount хаба → первый render → прогрев колод (старт/конец) → runAfterInteractions → onLayout. Активна только 20 с после тапа — обычные заходы в хаб не пишутся.
// console.warn: production вырезает console.log (как у [NAV-PAINT]).
// ═══════════════════════════════════════════════════════════════════════════
const ACTIVE_MS = 20_000;
let startedAt: number | null = null;
let source = '';

export function trainNavTraceStart(from: string, now: number = Date.now()): void {
  startedAt = now;
  source = from;
  console.warn(`[NAV-PAINT-TRACE] +0ms start source=${from}`); // guard-ok: начало цепочки
}

/** Отметка: пишется только пока цепочка активна (≤ 20 с после тапа). */
export function trainNavMark(label: string, now: number = Date.now()): void {
  if (startedAt === null) return;
  const elapsed = now - startedAt;
  if (elapsed > ACTIVE_MS) { startedAt = null; return; }
  console.warn(`[NAV-PAINT-TRACE] +${elapsed}ms ${label} source=${source}`); // guard-ok: отметка цепочки
}

export function trainNavTraceActive(now: number = Date.now()): boolean {
  return startedAt !== null && now - startedAt <= ACTIVE_MS;
}

export function __resetTrainNavTraceForTests(): void {
  startedAt = null;
  source = '';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
