// ═══════════════════════════════════════════════════════════════════════════
// legacy_bonus_view.ts — строки окна «Встречайте PhraseMan 2.0» из ответа начисления (чистые функции, без React).
//
// зачем (Ядро 15.10, D195): окно рисует только то, что сервер реально начислил. Строка — только там, где монет больше нуля
// («Нули не показывать»); итог — coins.total, клиент ничего не пересчитывает по курсам сам (курсы и потолки живут на сервере).
// Потолок (cappedBy) не объясняем: ни техникой, ни цифрой (правило владельца «никаких системных фраз»).
// Контракт зеркалит LegacyBonusResult из app/legacy_bonus_client.ts (Ядро); здесь — свой узкий тип, чтобы модуль не зависел от клиента.
// ═══════════════════════════════════════════════════════════════════════════
import type { LegacyBonusRowKey } from './legacy_bonus_strings';

export type LegacyBonusViewInput = Readonly<{
  from: Readonly<{ xp: number; pearls: number; spins: number }>;
  coins: Readonly<{ xp: number; pearls: number; spins: number; total: number }>;
}>;

export type LegacyBonusRowVM = Readonly<{
  key: LegacyBonusRowKey;
  /** Сколько было старого (число, которое в строке «сгорает» до нуля). */
  from: number;
  /** Сколько монет получилось за эту строку. */
  coins: number;
}>;

const ROW_ORDER: readonly LegacyBonusRowKey[] = ['xp', 'pearls', 'spins'];

const whole = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

/** Строки окна: только те, где монет больше нуля, в порядке «опыт → жемчуг → вращения». */
export function legacyBonusRows(result: LegacyBonusViewInput): readonly LegacyBonusRowVM[] {
  const rows: LegacyBonusRowVM[] = [];
  for (const key of ROW_ORDER) {
    const coins = whole(result.coins[key]);
    if (coins <= 0) continue;
    rows.push({ key, from: whole(result.from[key]), coins });
  }
  return rows;
}

/** Итог под большой монетой: ровно то, что насчитал сервер. */
export function legacyBonusTotal(result: LegacyBonusViewInput): number {
  return whole(result.coins.total);
}

const NBSP = ' ';
/** 8362 → «8 362» (неразрывный пробел, чтобы число не рвалось по строкам). */
export function formatBonusNumber(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Окно рисуется, только если есть что показать: хотя бы одна строка и положительный итог. */
export function legacyBonusHasContent(result: LegacyBonusViewInput): boolean {
  return legacyBonusTotal(result) > 0 && legacyBonusRows(result).length > 0;
}

/** Кривая счётчика макета: 1 − 2^(−10p), p ∈ [0;1]; в конце отрезка p = 1 даёт точное значение цели. */
export const easeOutExpo = (p: number): number => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
