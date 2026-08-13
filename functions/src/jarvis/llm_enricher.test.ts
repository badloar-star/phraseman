import { enrichDecisionsWithNarrative, type EnricherDependencies } from './llm_enricher';
import { buildDecision, type Decision } from './decision';
import type { JarvisPmBusinessContext } from './pm_business_context';

/**
 * Обогатитель — накладка НАД детерминированными решениями Джарвиса, а не
 * замена. Каждый тест проверяет одно из архитектурных обязательств: LLM
 * никогда не видит недоверенные данные, бюджет проверяется ДО вызова,
 * идемпотентность не даёт заплатить дважды, а любая ошибка LLM оставляет
 * решение с деталями свода — не с пустой находкой.
 */

function makeDecision(overrides: Partial<Parameters<typeof buildDecision>[0]> = {}): Decision {
  return buildDecision({
    department: 'quality',
    mode: 'observe',
    trigger: 'scheduled',
    question: 'Растёт ли число ошибок?',
    finding: 'За сутки 12 новых отчётов об ошибках, было 3.',
    hypothesis: 'Возможен баг в последнем релизе.',
    options: [
      { title: 'Откатить релиз', cost: 0, risk: 'low' },
      { title: 'Ждать данных', cost: 0, risk: 'medium' },
    ],
    recommendation: 'Проверить логи последнего релиза.',
    risk: 'Пользователи сталкиваются с ошибками.',
    cost: 0,
    successMetric: 'Отчётов об ошибках < 5 в сутки.',
    rollback: 'Откатить релиз одной кнопкой.',
    evidence: [
      {
        sourceId: 'error_reports', state: 'ready', count: 12,
        truncated: false, droppedCount: 0, observedAtMs: 1_000,
      },
    ],
    nowMs: 1_000,
    ...overrides,
  });
}

function makeDeps(overrides: Partial<EnricherDependencies> = {}): EnricherDependencies {
  return {
    checkBudget: async () => ({ allowed: true }),
    reserveSlot: async () => ({ reserved: true }),
    generateNarrative: async () => ({ text: 'Сгенерированный текст', promptTokens: 100, completionTokens: 50 }),
    recordSpend: async () => undefined,
    recordResult: async () => undefined,
    estimateCostUsd: () => 0.001,
    actualCostUsd: () => 0.0015,
    nowMs: () => 1_000,
    ...overrides,
  };
}

describe('enrichDecisionsWithNarrative', () => {
  test('adds a narrative to a decision when everything succeeds', async () => {
    const decision = makeDecision();
    const result = await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps());
    expect(result[0].narrative).toBe('Сгенерированный текст');
  });

  test('skips the LLM call entirely when the monthly/daily budget is exhausted', async () => {
    const generateNarrative = jest.fn(async () => ({ text: 'x', promptTokens: 1, completionTokens: 1 }));
    const decision = makeDecision();
    const result = await enrichDecisionsWithNarrative(
      { decisions: [decision] },
      makeDeps({ checkBudget: async () => ({ allowed: false, reason: 'monthly_cap' }), generateNarrative }),
    );
    expect(generateNarrative).not.toHaveBeenCalled();
    expect(result[0].narrative).toBeNull();
  });

  test('skips both LLM and budget reservation when the idempotency slot is already taken', async () => {
    const generateNarrative = jest.fn(async () => ({ text: 'x', promptTokens: 1, completionTokens: 1 }));
    const checkBudget = jest.fn(async () => ({ allowed: true as const }));
    const decision = makeDecision();
    const result = await enrichDecisionsWithNarrative(
      { decisions: [decision] },
      makeDeps({ reserveSlot: async () => ({ reserved: false }), checkBudget, generateNarrative }),
    );
    expect(generateNarrative).not.toHaveBeenCalled();
    expect(checkBudget).not.toHaveBeenCalled();
    expect(result[0].narrative).toBeNull();
  });

  test('reuses a completed cached PM plan without another LLM call or budget charge', async () => {
    const generateNarrative = jest.fn(async () => ({ text: 'x', promptTokens: 1, completionTokens: 1 }));
    const checkBudget = jest.fn(async () => ({ allowed: true as const }));
    const result = await enrichDecisionsWithNarrative(
      { decisions: [makeDecision()] },
      makeDeps({
        reserveSlot: async () => ({ reserved: false, narrative: 'Кэшированный PM-план' }),
        checkBudget,
        generateNarrative,
      }),
    );
    expect(result[0].narrative).toBe('Кэшированный PM-план');
    expect(checkBudget).not.toHaveBeenCalled();
    expect(generateNarrative).not.toHaveBeenCalled();
  });

  test('never sends untrustworthy evidence to the LLM prompt', async () => {
    const decision = makeDecision({
      evidence: [
        { sourceId: 'error_reports', state: 'ready', count: 12, truncated: false, droppedCount: 0, observedAtMs: 1_000 },
        { sourceId: 'user_reports', state: 'error', count: null, truncated: false, droppedCount: 0, observedAtMs: 1_000 },
      ],
    });
    let seenPrompt = '';
    const generateNarrative = async (prompt: { user: string }) => {
      seenPrompt = prompt.user;
      return { text: 'ok', promptTokens: 10, completionTokens: 10 };
    };
    await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps({ generateNarrative }));
    expect(seenPrompt).not.toContain('user_reports');
  });

  test('asks for a testable PM hypothesis instead of a second paraphrase', async () => {
    const seen: string[] = [];
    await enrichDecisionsWithNarrative({ decisions: [makeDecision()] }, makeDeps({
      generateNarrative: async (prompt) => {
        seen.push(prompt.system, prompt.user);
        return { text: 'План', promptTokens: 10, completionTokens: 10 };
      },
    }));
    expect(seen.join('\n')).toMatch(/product manager|гипотез/i);
    expect(seen.join('\n')).toMatch(/эксперимент/i);
    expect(seen.join('\n')).toContain('Метрика успеха');
    expect(seen.join('\n')).not.toContain('не давай новых рекомендаций');
  });

  test('uses verified business dynamics to prioritize the departmental finding', async () => {
    let seenPrompt = '';
    const businessContext: JarvisPmBusinessContext = {
      state: 'ready', currentTier: 'seed', peakTier: 'seed', totalUsers: 700,
      activeUsers: 120, mrrUsd: 350, moneyCoverage: 'complete', historyDays: 28,
      last7Days: { newUsers: 40, newPaying: 4, renewals: 3, refunds: 1 },
      recentMetricChanges: [{
        id: 'new_users', label: 'Новые пользователи', current: 12, previous: 8,
        absoluteDelta: 4, percentDelta: 50, direction: 'up',
      }],
      digestGeneratedAtMs: 1_000,
    };
    await enrichDecisionsWithNarrative(
      { decisions: [makeDecision()], businessContext },
      makeDeps({ generateNarrative: async (prompt) => {
        seenPrompt = prompt.user;
        return { text: 'План', promptTokens: 10, completionTokens: 10 };
      } }),
    );
    expect(seenPrompt).toContain('Контекст бизнеса Phraseman');
    expect(seenPrompt).toContain('Новые пользователи: 8 → 12');
    expect(seenPrompt).toContain('MRR-equivalent: $350.00');
  });

  test('a decision with NO trustworthy evidence at all is not sent to the LLM', async () => {
    const decision = makeDecision({
      evidence: [
        { sourceId: 'error_reports', state: 'error', count: null, truncated: false, droppedCount: 0, observedAtMs: 1_000 },
      ],
    });
    const generateNarrative = jest.fn(async () => ({ text: 'x', promptTokens: 1, completionTokens: 1 }));
    const result = await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps({ generateNarrative }));
    expect(generateNarrative).not.toHaveBeenCalled();
    expect(result[0].narrative).toBeNull();
  });

  test('LLM failure leaves the decision usable with narrative=null, not a thrown error', async () => {
    const decision = makeDecision();
    const result = await enrichDecisionsWithNarrative(
      { decisions: [decision] },
      makeDeps({ generateNarrative: async () => { throw new Error('openai down'); } }),
    );
    expect(result[0].narrative).toBeNull();
    expect(result[0].decision).toBe(decision);
  });

  test('records ACTUAL spend (from real token usage), not the pre-call estimate', async () => {
    const recordSpend = jest.fn(async () => undefined);
    const decision = makeDecision();
    await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps({ recordSpend, actualCostUsd: () => 0.0042 }));
    expect(recordSpend).toHaveBeenCalledWith(expect.objectContaining({ actualCostUsd: 0.0042 }));
  });

  test('records the enrichment result under the slot reserved for idempotency', async () => {
    const recordResult = jest.fn(async () => undefined);
    const decision = makeDecision();
    await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps({ recordResult }));
    expect(recordResult).toHaveBeenCalledWith(expect.objectContaining({
      contentHash: decision.contentHash,
      narrative: 'Сгенерированный текст',
    }));
  });

  test('never touches the decision thresholds/metrics — narrative is additive only', async () => {
    const decision = makeDecision();
    const result = await enrichDecisionsWithNarrative({ decisions: [decision] }, makeDeps());
    expect(result[0].decision).toBe(decision);
  });

  test('an empty decisions list makes zero calls to anything', async () => {
    const checkBudget = jest.fn(async () => ({ allowed: true as const }));
    const generateNarrative = jest.fn(async () => ({ text: 'x', promptTokens: 1, completionTokens: 1 }));
    const result = await enrichDecisionsWithNarrative({ decisions: [] }, makeDeps({ checkBudget, generateNarrative }));
    expect(result).toEqual([]);
    expect(checkBudget).not.toHaveBeenCalled();
    expect(generateNarrative).not.toHaveBeenCalled();
  });
});
