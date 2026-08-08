/**
 * Оценка стоимости вызова LLM-обогатителя в долларах.
 *
 * зачем отдельный маленький модуль, а не импорт из openai_budget_dashboard.ts:
 * та цена — часть админ-дашборда (другое направление зависимости), здесь
 * нужна только цена ОДНОЙ модели для ОДНОЙ цели — прогноз и пересчёт факта
 * по usage. Цены за 1M токенов совпадают с прайсом OpenAI на 2026-08-03,
 * тем же числам, что в openai_budget_dashboard.ts (gpt-4.1-nano).
 */

/** Самая дешёвая модель из допустимых для джобов — narrative не требует ума gpt-4o. */
export const JARVIS_ENRICHER_MODEL = 'gpt-4.1-nano' as const;

const PRICE_USD_PER_MILLION_INPUT = 0.10;
const PRICE_USD_PER_MILLION_OUTPUT = 0.40;

/** Промпт решения + системная инструкция — с запасом под самое длинное решение. */
const ESTIMATED_PROMPT_TOKENS = 600;
/** 3-4 предложения на русском — как задано в системном промпте. */
const ESTIMATED_COMPLETION_TOKENS = 200;

export function estimateEnrichmentCostUsd(): number {
  return (ESTIMATED_PROMPT_TOKENS / 1_000_000) * PRICE_USD_PER_MILLION_INPUT
    + (ESTIMATED_COMPLETION_TOKENS / 1_000_000) * PRICE_USD_PER_MILLION_OUTPUT;
}

export function actualEnrichmentCostUsd(usage: { promptTokens: number; completionTokens: number }): number {
  return (usage.promptTokens / 1_000_000) * PRICE_USD_PER_MILLION_INPUT
    + (usage.completionTokens / 1_000_000) * PRICE_USD_PER_MILLION_OUTPUT;
}
