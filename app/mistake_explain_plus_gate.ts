/**
 * mistake_explain_plus_gate.ts — чистые правила дневного лимита AI-разбора ошибки.
 *
 * зачем (совет агентов 2026-09-30, решение B6): сервер (functions/src/mistake_explain.ts)
 * уже пропускает Plus без дневного лимита, а клиент всё равно останавливал автозагрузку
 * после 3 бесплатных разборов и показывал Plus-пользователю предложение купить за руны.
 * Правило вынесено сюда без зависимостей, чтобы его можно было проверить node --test.
 */

export interface MistakeExplainGateInput {
  /** Остаток бесплатных разборов на сегодня (локальный счётчик). */
  freeLeft: number;
  /** Plus/Pro: сырое hasPremiumAccess — ровно то, что проверяет сервер. */
  isPremium: boolean;
  /** Этот конкретный разбор уже оплачен рунами. */
  paidForThisPhrase: boolean;
}

/** Нужно ли остановить автозагрузку и ждать покупки за руны. */
export function isMistakeExplainBlockedByFreeLimit(input: MistakeExplainGateInput): boolean {
  if (input.isPremium) return false;
  if (input.paidForThisPhrase) return false;
  return input.freeLeft <= 0;
}

/** Нужно ли списать бесплатный разбор дня после успешного показа. */
export function shouldConsumeFreeMistakeExplain(
  input: Pick<MistakeExplainGateInput, 'isPremium' | 'paidForThisPhrase'>,
): boolean {
  return !input.isPremium && !input.paidForThisPhrase;
}
