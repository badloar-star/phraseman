import { estimateEnrichmentCostUsd, actualEnrichmentCostUsd, JARVIS_ENRICHER_MODEL } from './llm_enricher_cost';

describe('llm_enricher_cost', () => {
  test('estimate is a small positive fraction of a cent', () => {
    const estimate = estimateEnrichmentCostUsd();
    expect(estimate).toBeGreaterThan(0);
    expect(estimate).toBeLessThan(0.01);
  });

  test('actual cost scales with real token usage, not the fixed estimate', () => {
    const small = actualEnrichmentCostUsd({ promptTokens: 100, completionTokens: 50 });
    const large = actualEnrichmentCostUsd({ promptTokens: 1_000, completionTokens: 500 });
    expect(large).toBeGreaterThan(small);
    expect(large).toBeCloseTo(small * 10, 10);
  });

  test('uses the cheapest allowed job model', () => {
    expect(JARVIS_ENRICHER_MODEL).toBe('gpt-4.1-nano');
  });

  test('zero usage costs zero, not a floor charge', () => {
    expect(actualEnrichmentCostUsd({ promptTokens: 0, completionTokens: 0 })).toBe(0);
  });
});
