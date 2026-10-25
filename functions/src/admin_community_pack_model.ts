// ════════════════════════════════════════════════════════════════════════════
// admin_community_pack_model.ts — одна модель и одна цена для ИИ-проверки и
// ИИ-перевода наборов сообщества (ручные инструменты владельца в админке).
//
// зачем (владелец 25.10: «странная проверка грамматики — проверять более сильной
// моделью и переводить, чтобы было качественно»): обе функции стояли на
// gpt-4.1-mini и выдумывали причины. Берём самую сильную модель из проверенной
// таблицы цен проекта (openai_model_policy.ts, сверено с официальными страницами
// 08.10): gpt-4.1. Семейство gpt-5.x в продакшн-путях проекта не используется —
// общий вызов openAiChat шлёт max_tokens + temperature, которые reasoning-модели
// не принимают; переход на них — отдельная задача с другим форматом запроса.
// ════════════════════════════════════════════════════════════════════════════
import { ACTIVE_TEXT_MODEL_PRICES } from './openai_model_policy';

export const PACK_AI_MODEL = 'gpt-4.1' as const;

const price = ACTIVE_TEXT_MODEL_PRICES[PACK_AI_MODEL];

/** USD за 1M токенов — из общей таблицы, админка показывает расход по ним. */
export const PACK_AI_PRICE_INPUT_PER_MTOK: number = price.input;
export const PACK_AI_PRICE_OUTPUT_PER_MTOK: number = price.output;

export function packAiCostUsd(promptTokens: number, completionTokens: number): number {
  const cost = (promptTokens / 1_000_000) * PACK_AI_PRICE_INPUT_PER_MTOK
    + (completionTokens / 1_000_000) * PACK_AI_PRICE_OUTPUT_PER_MTOK;
  return Number(cost.toFixed(6));
}
