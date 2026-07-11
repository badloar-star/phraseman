import {
  PM_LIMITS,
  serializedBytes,
  validatePmBrief,
  type FullPmBrief,
} from './admin_pm_contracts';

const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ');

function fullBrief(): FullPmBrief {
  return {
    schemaVersion: 1,
    mode: 'full',
    executiveSummary: 'Product health is stable.',
    article: words(1200),
    observations: [{ id: 'obs-1', text: 'Activation rose.', evidenceIds: ['ev-1'], codexEntityIds: ['screen:/home'], confidence: 0.88 }],
    hypotheses: [{ id: 'hyp-1', text: 'Copy may have helped.', evidenceIds: ['ev-1'], codexEntityIds: ['screen:/home'], confidence: 0.55 }],
    recommendations: Array.from({ length: 3 }, (_, index) => ({
      id: `rec-${index}`, fingerprint: `fp-${index}`, title: `Recommendation ${index}`,
      evidenceIds: ['ev-1'], codexEntityIds: ['screen:/home'], confidence: 0.76,
      impact: 'medium' as const, effort: 'low' as const,
    })),
    ideas: [],
    experiments: [{ id: 'exp-1', hypothesis: 'Shorter copy improves activation', evidenceIds: ['ev-1'], codexEntityIds: ['screen:/home'], primaryMetricId: 'activation_rate' }],
    risks: [], questionsForOwner: [], blindSpots: [],
  };
}

describe('validatePmBrief', () => {
  test('accepts a bounded full brief with known evidence and Codex entities', () => {
    expect(validatePmBrief(fullBrief(), new Set(['ev-1']), new Set(['screen:/home']))).toEqual({ ok: true });
  });

  test('rejects unknown evidence and Codex entities', () => {
    const brief = fullBrief();
    brief.observations[0].evidenceIds = ['missing'];
    brief.observations[0].codexEntityIds = ['screen:/missing'];
    expect(validatePmBrief(brief, new Set(['ev-1']), new Set(['screen:/home']))).toMatchObject({ ok: false });
  });

  test('coverage-only forbids hypotheses, recommendations and experiments', () => {
    const brief = { ...fullBrief(), mode: 'coverage_only' as const };
    expect(validatePmBrief(brief, new Set(['ev-1']), new Set(['screen:/home']))).toMatchObject({ ok: false });
  });

  test('enforces article and collection bounds', () => {
    const brief = fullBrief();
    brief.article = words(1199);
    brief.recommendations = Array.from({ length: 6 }, (_, index) => ({ ...brief.recommendations[0], id: `rec-${index}` }));
    expect(validatePmBrief(brief, new Set(['ev-1']), new Set(['screen:/home']))).toMatchObject({ ok: false });
  });

  test('measures serialized document bytes', () => {
    expect(serializedBytes({ value: 'abc' })).toBe(Buffer.byteLength(JSON.stringify({ value: 'abc' }), 'utf8'));
    expect(PM_LIMITS.documentBytes).toBe(700 * 1024);
  });
});
