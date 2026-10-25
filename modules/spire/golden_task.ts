/**
 * [SPIRE-GOLD] «Золотое задание» Пика — общее правило выбора (ТЗ docs/work/tasks/spire-engagement-2026-10-25.md §3,
 * выбор владельца 25.10: верно с первой попытки → двойные монеты ступени, со звоном).
 *
 * зачем: какое задание золотое, решает чистая функция от (stableId, неделя, номер ступени недели) — сервер считает то же самое
 * сам (functions/src/spire_golden.ts — зеркало, сторож tests/spire_golden_task.test.ts сверяет их на таблице). Поэтому
 * заявить золото там, где его нет, нельзя, а лишних чтений не нужно. Потолок — 3 золотых в день (UTC), этаж и вершина
 * не удваиваются: золото добавляет ровно одну ставку ступени (perStep).
 */
export const SPIRE_GOLD_RATE_PERCENT = 30;
export const SPIRE_GOLD_DAILY_CAP = 3;
/** Номер задания 3…9 (индексы 2…8): не первое и не последнее. */
export const SPIRE_GOLD_FIRST_INDEX = 2;
export const SPIRE_GOLD_LAST_INDEX = 8;

/** FNV-1a 32 бит + fmix32 — одинаково в Hermes и в Node, без зависимостей. */
export function spireGoldHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // зачем: финальное перемешивание (fmix32) — у соседних номеров ступеней FNV даёт близкие остатки, без него золото шло пачками
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Индекс золотого задания ступени (0-based) или null — в этой ступени золота нет. stepNumber — номер ступени недели с 1. */
export function spireGoldenTaskIndex(stableId: string, weekKey: string, stepNumber: number): number | null {
  if (!stableId || !weekKey || !Number.isSafeInteger(stepNumber) || stepNumber < 1) return null;
  const h = spireGoldHash(`${stableId}|${weekKey}|${stepNumber}`);
  if (h % 100 >= SPIRE_GOLD_RATE_PERCENT) return null;
  const span = SPIRE_GOLD_LAST_INDEX - SPIRE_GOLD_FIRST_INDEX + 1;
  return SPIRE_GOLD_FIRST_INDEX + (Math.floor(h / 100) % span);
}

/** День потолка — дата UTC момента прохождения (как у сервера). */
export function spireGoldDayKey(atMs: number): string {
  return new Date(atMs).toISOString().slice(0, 10);
}
