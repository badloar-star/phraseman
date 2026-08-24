import {
  authorizeSemanticAttempt,
  recordSemanticAttemptUsage,
  type TournamentSemanticBudgetStore,
} from './tournament_semantic_budget';

class FakeBudgetStore implements TournamentSemanticBudgetStore {
  used = 0;
  writes = 0;
  usages: unknown[] = [];
  async reserve(input: Parameters<TournamentSemanticBudgetStore['reserve']>[0]) {
    this.writes += 1;
    if (this.used >= input.dailyCap) return { ok: false as const, used: this.used };
    this.used += 1;
    return { ok: true as const, used: this.used, attemptOrdinal: this.used };
  }
  async recordUsage(input: Parameters<TournamentSemanticBudgetStore['recordUsage']>[0]) {
    this.writes += 1;
    this.usages.push(input);
  }
}

describe('tournament semantic budget', () => {
  it('consumes exactly one request-cap unit per provider authorization', async () => {
    const store = new FakeBudgetStore();
    await expect(authorizeSemanticAttempt(store, {
      utcDay: '2026-08-21', candidateId: 'candidate-a', pass: 'primary', dailyCap: 2, dryRun: false,
    })).resolves.toEqual(expect.objectContaining({ ok: true, attemptOrdinal: 1 }));
    await expect(authorizeSemanticAttempt(store, {
      utcDay: '2026-08-21', candidateId: 'candidate-a', pass: 'adversarial', dailyCap: 2, dryRun: false,
    })).resolves.toEqual(expect.objectContaining({ ok: true, attemptOrdinal: 2 }));
    await expect(authorizeSemanticAttempt(store, {
      utcDay: '2026-08-21', candidateId: 'candidate-b', pass: 'primary', dailyCap: 2, dryRun: false,
    })).resolves.toEqual({ ok: false, reason: 'daily_cap_exhausted', used: 2, dailyCap: 2 });
  });

  it('performs zero writes for dry-run and records exact integer usage otherwise', async () => {
    const store = new FakeBudgetStore();
    await authorizeSemanticAttempt(store, {
      utcDay: '2026-08-21', candidateId: 'candidate-a', pass: 'primary', dailyCap: 2, dryRun: true,
    });
    expect(store.writes).toBe(0);
    await recordSemanticAttemptUsage(store, {
      internalAttemptId: 'attempt-a', inputTokens: 10, outputTokens: 5, dryRun: false,
    });
    expect(store.usages).toEqual([{ internalAttemptId: 'attempt-a', inputTokens: 10, outputTokens: 5 }]);
    await expect(recordSemanticAttemptUsage(store, {
      internalAttemptId: 'attempt-b', inputTokens: 1.5, outputTokens: 5, dryRun: false,
    })).rejects.toThrow('semantic_usage_invalid');
  });
});
