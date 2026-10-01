export const SUPER_SUNDAY_MULTIPLIER = 2;

/**
 * зачем (D147, владелец 01.10 через координатора): «Супер-воскресенье» снято.
 * Удвоение действует ТОЛЬКО для начислений раньше этой метки: старые воскресные
 * квитанции при повторе дают ту же сумму, что и тогда (иначе сверка кошелька
 * разошлась бы), а всё новое — без удвоения. Монеты людей не трогаем.
 */
export const SUPER_SUNDAY_RETIRED_AT_MS = Date.parse('2026-10-01T00:00:00.000Z');

export function isSuperSundayUtc(earnedAtMs: number): boolean {
  return Number.isFinite(earnedAtMs) && new Date(earnedAtMs).getUTCDay() === 0;
}

export function applySuperSundayRuneMultiplier(baseAmount: number, earnedAtMs: number): number {
  if (!Number.isSafeInteger(baseAmount) || baseAmount < 0) {
    throw new Error('invalid rune amount');
  }

  const multiplier = isSuperSundayActive(earnedAtMs) ? SUPER_SUNDAY_MULTIPLIER : 1;
  if (baseAmount > Number.MAX_SAFE_INTEGER / multiplier) {
    throw new Error('rune amount overflow');
  }

  return baseAmount * multiplier;
}

/** Удвоение действует: воскресенье UTC и начисление раньше снятия (D147). */
export function isSuperSundayActive(earnedAtMs: number): boolean {
  return isSuperSundayUtc(earnedAtMs) && earnedAtMs < SUPER_SUNDAY_RETIRED_AT_MS;
}

/**
 * Сумма, которую насчитала бы СТАРАЯ сборка (удвоение в любое воскресенье).
 * Только для переходного приёма на сервере: старый клиент ещё шлёт ×2 после
 * D147 — отклонять такую выдачу значит оставить человека без монет.
 */
export function legacySuperSundayAmount(baseAmount: number, earnedAtMs: number): number {
  return isSuperSundayUtc(earnedAtMs) ? baseAmount * SUPER_SUNDAY_MULTIPLIER : baseAmount;
}

export function superSundayEndsAtUtcMs(nowMs: number): number {
  if (!isSuperSundayUtc(nowMs)) {
    throw new Error('Super Sunday is not active');
  }

  const end = new Date(nowMs);
  end.setUTCHours(24, 0, 0, 0);
  return end.getTime();
}
