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
    expect(JARVIS_ENRICHER_MODEL).toBe('gpt-4o-mini');
  });

  test('zero usage costs zero, not a floor charge', () => {
    expect(actualEnrichmentCostUsd({ promptTokens: 0, completionTokens: 0 })).toBe(0);
  });
});

// The admin may select a stronger model; never account for it at nano prices.
describe('enricher selected-model accounting', () => {
  test.each([
    ['gpt-4o-mini', 0.15, 0.60],
    ['gpt-4.1-mini', 0.40, 1.60],
    ['gpt-4.1', 2.00, 8.00],
  ])('%s uses its own input/output prices', (model, input, output) => {
    expect(actualEnrichmentCostUsd({ promptTokens: 1_000_000, completionTokens: 1_000_000 }, String(model)))
      .toBeCloseTo(Number(input) + Number(output), 10);
    expect(estimateEnrichmentCostUsd(String(model)))
      .toBeCloseTo(600 / 1_000_000 * Number(input) + 200 / 1_000_000 * Number(output), 10);
  });
  test('unknown prices cannot silently understate spend', () => {
    expect(() => estimateEnrichmentCostUsd('unknown')).toThrow('unsupported_enricher_model_price');
  });
});
