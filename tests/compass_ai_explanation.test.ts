import {
  __compassAiExplanationTestHooks,
  buildCompassAiExplanationEnvelope,
  loadCompassAiExplanation,
  type CompassAiExplanationDependencies,
} from '../app/compass_ai_explanation';
import { selectCompassRecommendation, type CompassRecommendation } from '../app/compass_recommendation';
import type { AccountGenerationToken } from '../app/account_generation';

function trainerRecommendation(): CompassRecommendation {
  const result = selectCompassRecommendation({
    trainer: { status: 'ready', value: { dueWords: 2, duePhrases: 7 } },
    lessonProgress: { status: 'ready', value: null },
    weeklyReview: { status: 'ready', value: null },
  });
  if (result.status !== 'ready') throw new Error('test fixture was not ready');
  return result.recommendation;
}

function memoryDependencies(state: { token: AccountGenerationToken; calls: number }): CompassAiExplanationDependencies {
  const values = new Map<string, string>();
  return {
    storage: {
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
    },
    captureGeneration: () => state.token,
    accountScope: (token) => token.phase === 'active' && token.stableId ? `scope:${token.stableId}` : null,
    isCurrentGeneration: (token, stableId) => token === state.token && state.token.phase === 'active' && stableId === state.token.stableId,
    requestCallable: async (envelope) => {
      state.calls += 1;
      return {
        ok: true,
        schemaVersion: 'compass-why-now.v1',
        whyNow: 'Эти фразы стоит проверить сейчас. Так вспоминать станет легче.',
        evidenceRefs: [envelope.evidence[0]!.ref],
        expiresAtMs: 2_000_000,
      };
    },
    now: () => 1_000_000,
  };
}

describe('Compass bounded AI explanation client', () => {
  it('sends only allowlisted aggregate evidence and no action or route', () => {
    const recommendation = trainerRecommendation();
    recommendation.evidence.push({ source: 'trainer', key: 'rawMistakeText', value: ['secret phrase'] });
    const envelope = buildCompassAiExplanationEnvelope(recommendation, 'ru', 'en');
    expect(envelope).toEqual(expect.objectContaining({
      schemaVersion: 'compass-why-now.v1',
      recommendationId: 'trainer:phrases',
      reasonCode: 'trainer_due',
      evidence: [
        { ref: 'trainer:dueWords', value: 2 },
        { ref: 'trainer:duePhrases', value: 7 },
      ],
    }));
    expect(JSON.stringify(envelope)).not.toMatch(/rawMistakeText|secret phrase|pathname|route|action/);
  });

  it('rejects unsupported recommendation reasons instead of inventing fallback copy', () => {
    const recommendation = { ...trainerRecommendation(), reason: { code: 'trainer_overdue', params: {} } } as unknown as CompassRecommendation;
    expect(buildCompassAiExplanationEnvelope(recommendation, 'ru', 'en')).toBeNull();
  });

  it('returns unavailable when the provider fails', async () => {
    const state = { token: { generation: 1, stableId: 'A', phase: 'active' } as const, calls: 0 };
    const deps = {
      ...memoryDependencies(state),
      requestCallable: async () => { throw new Error('offline'); },
    };
    await expect(loadCompassAiExplanation({ recommendation: trainerRecommendation(), lang: 'ru' }, deps))
      .resolves.toEqual({ status: 'unavailable', reason: 'network' });
  });

  it('fences cached explanations by account generation and scope', async () => {
    const state: { token: AccountGenerationToken; calls: number } = {
      token: { generation: 1, stableId: 'A', phase: 'active' },
      calls: 0,
    };
    const deps = memoryDependencies(state);
    await expect(loadCompassAiExplanation({ recommendation: trainerRecommendation(), lang: 'ru' }, deps))
      .resolves.toMatchObject({ status: 'ready', source: 'provider' });
    await expect(loadCompassAiExplanation({ recommendation: trainerRecommendation(), lang: 'ru' }, deps))
      .resolves.toMatchObject({ status: 'ready', source: 'cache' });
    state.token = { generation: 2, stableId: 'B', phase: 'active' };
    await expect(loadCompassAiExplanation({ recommendation: trainerRecommendation(), lang: 'ru' }, deps))
      .resolves.toMatchObject({ status: 'ready', source: 'provider' });
    expect(state.calls).toBe(2);
  });

  it('rejects forbidden vocabulary and overlong sentences', () => {
    expect(__compassAiExplanationTestHooks.normalizedSentences('Этот урок уже готов.')).toBeNull();
    expect(__compassAiExplanationTestHooks.normalizedSentences('Один два три четыре пять шесть семь восемь девять десять одиннадцать.')).toBeNull();
  });

  it('accepts only numbers grounded in the current envelope', () => {
    expect(__compassAiExplanationTestHooks.normalizedSentences('7 фраз готовы к повтору.', new Set([7])))
      .toBe('7 фраз готовы к повтору.');
    expect(__compassAiExplanationTestHooks.normalizedSentences('99 фраз готовы к повтору.', new Set([7])))
      .toBeNull();
  });
});
