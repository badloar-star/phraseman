import { ACTIVE_TEXT_MODEL_PRICES, DEFAULT_TEXT_MODEL } from '../openai_model_policy';

export const JARVIS_ENRICHER_MODEL = DEFAULT_TEXT_MODEL;

// Baseline estimate; actual spend below uses the selected model and real usage.
const ESTIMATED_PROMPT_TOKENS = 600;
const ESTIMATED_COMPLETION_TOKENS = 200;

function priceFor(model: string) {
  const price = ACTIVE_TEXT_MODEL_PRICES[model];
  if (!price) throw new Error('unsupported_enricher_model_price');
  return price;
}

export function estimateEnrichmentCostUsd(model: string = JARVIS_ENRICHER_MODEL): number {
  return actualEnrichmentCostUsd({
    promptTokens: ESTIMATED_PROMPT_TOKENS,
    completionTokens: ESTIMATED_COMPLETION_TOKENS,
  }, model);
}

export function actualEnrichmentCostUsd(
  usage: { promptTokens: number; completionTokens: number },
  model: string = JARVIS_ENRICHER_MODEL,
): number {
  const price = priceFor(model);
  return (usage.promptTokens / 1_000_000) * price.input
    + (usage.completionTokens / 1_000_000) * price.output;
}
