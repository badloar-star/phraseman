import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  applySemanticJobCheckpoint,
  applySemanticJobPendingReview,
  claimSemanticJobLease,
  createInitialSemanticJobState,
  dryRunTournamentSemanticJob,
  runTournamentSemanticJobBatch,
  settleSemanticJobBatch,
  type SemanticJobCheckpointInput,
  type SemanticJobPendingReviewInput,
  type SemanticJobRepository,
  type SemanticJobState,
  type TournamentSemanticJobDependencies,
} from './tournament_semantic_job';

function candidate(index: number) {
  return createTournamentSemanticCandidate({
    candidateId: `job-candidate-${String(index).padStart(2, '0')}`,
    mode: 'speed_match',
    difficulty: 1,
    prompt: 'Сопоставьте пары.',
    context: { topic: `topic-${index}` },
    reviewSubjects: Array.from({ length: 6 }, (_, pair) => ({
      subjectId: `pair_${pair + 1}`,
      kind: 'speed_pair' as const,
      declaredRole: 'pair' as const,
      text: `word-${index}-${pair}`,
      completedText: `слово-${index}-${pair}`,
      metadata: { partOfSpeech: 'noun', senseHint: 'none' },
    })),
    provenanceKeys: Array.from({ length: 6 }, (_, pair) => `job:${index}:vocab-${pair}`),
  });
}

class MemoryJobRepository implements SemanticJobRepository {
  readonly checkpoints: SemanticJobCheckpointInput[] = [];
  throwAfterNextCheckpoint = false;
  private readonly rows = new Map<string, SemanticJobState>();

  async createOrResume(input: Parameters<SemanticJobRepository['createOrResume']>[0]) {
    const existing = this.rows.get(input.jobId);
    if (existing) return existing;
    const created = createInitialSemanticJobState(input);
    this.rows.set(input.jobId, created);
    return created;
  }

  async claimLease(input: Parameters<SemanticJobRepository['claimLease']>[0]) {
    const current = this.required(input.jobId);
    const next = claimSemanticJobLease(current, input);
    this.rows.set(input.jobId, next);
    return next;
  }

  async checkpoint(input: SemanticJobCheckpointInput) {
    const current = this.required(input.jobId);
    const next = applySemanticJobCheckpoint(current, input);
    const duplicate = this.checkpoints.find((item) => item.terminal.candidateId === input.terminal.candidateId);
    if (duplicate && JSON.stringify(duplicate.terminal) !== JSON.stringify(input.terminal)) {
      throw new Error('semantic_job_terminal_conflict');
    }
    if (!duplicate) this.checkpoints.push(structuredClone(input));
    this.rows.set(input.jobId, next);
    if (this.throwAfterNextCheckpoint) {
      this.throwAfterNextCheckpoint = false;
      throw new Error('simulated_post_checkpoint_crash');
    }
    return next;
  }

  async savePendingReview(input: SemanticJobPendingReviewInput) {
    const current = this.required(input.jobId);
    const next = applySemanticJobPendingReview(current, input);
    this.rows.set(input.jobId, next);
    return next;
  }

  async settle(input: Parameters<SemanticJobRepository['settle']>[0]) {
    const current = this.required(input.jobId);
    const next = settleSemanticJobBatch(current, input);
    this.rows.set(input.jobId, next);
    return next;
  }

  private required(jobId: string) {
    const row = this.rows.get(jobId);
    if (!row) throw new Error('semantic_job_missing');
    return row;
  }

  onlyState() {
    const rows = [...this.rows.values()];
    if (rows.length !== 1) throw new Error('expected_one_job');
    return rows[0];
  }
}

function dependencies(overrides: Partial<TournamentSemanticJobDependencies> = {}) {
  const repository = overrides.repository ?? new MemoryJobRepository();
  let lease = 0;
  return {
    reviewIdentity: {
      reviewContractVersion: 'review-v1', promptSetSha256: 'a'.repeat(64),
      primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    },
    repository,
    loadCandidates: async () => Array.from({ length: 8 }, (_, index) => candidate(index)),
    lookupCachedTerminal: async () => null,
    reviewCandidate: async () => ({
      kind: 'PASS' as const,
      providerAttempts: 2,
      evidenceRef: 'evidence/default',
    }),
    assessSupply: async (state: SemanticJobState) => (state.progress.approved >= 8 ? 'ready' as const : 'continue' as const),
    nowMs: () => 1_000,
    createLeaseToken: () => `lease-${++lease}`,
    ...overrides,
  } satisfies TournamentSemanticJobDependencies;
}

describe('runTournamentSemanticJobBatch', () => {
  it('pins review identity into the immutable job and rejects config drift on resume', async () => {
    const repository = new MemoryJobRepository();
    const firstDeps = dependencies({ repository });
    (firstDeps as any).reviewIdentity = {
      reviewContractVersion: 'review-v1', promptSetSha256: 'a'.repeat(64),
      primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
    };
    const first = await runTournamentSemanticJobBatch(firstDeps, {
      poolVersion: 'tpool_identity_v11', maxCandidates: 1, deadlineAtMs: 10_000,
    });
    expect(repository.onlyState()).toEqual(expect.objectContaining((firstDeps as any).reviewIdentity));

    const driftedDeps = dependencies({ repository });
    (driftedDeps as any).reviewIdentity = {
      ...(firstDeps as any).reviewIdentity,
      primaryModel: 'gpt-4.1-nano',
    };
    await expect(runTournamentSemanticJobBatch(driftedDeps, {
      poolVersion: 'tpool_identity_v11', jobId: first.jobId, maxCandidates: 1, deadlineAtMs: 10_000,
    })).rejects.toThrow('semantic_job_identity_mismatch');
  });

  it('creates deterministically, checkpoints every cached/reviewed terminal, and resumes a bounded sequential batch', async () => {
    const repository = new MemoryJobRepository();
    let concurrent = 0;
    let maxConcurrent = 0;
    const reviewed: string[] = [];
    const deps = dependencies({
      repository,
      lookupCachedTerminal: async (item) => {
        if (item.candidateId.endsWith('00')) return { decision: 'PASS', reference: 'receipt/pass-00' };
        if (item.candidateId.endsWith('01')) return { decision: 'REJECT', reference: 'evidence/reject-01' };
        return null;
      },
      reviewCandidate: async (item) => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        reviewed.push(item.candidateId);
        await Promise.resolve();
        concurrent -= 1;
        return {
          kind: item.candidateId.endsWith('03') ? 'REJECT' as const : 'PASS' as const,
          providerAttempts: item.candidateId.endsWith('03') ? 1 : 2,
          evidenceRef: `evidence/${item.candidateId}`,
        };
      },
      assessSupply: async (state) => (state.progress.approved >= 6 ? 'ready' : 'continue'),
    });

    const first = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', maxCandidates: 4, deadlineAtMs: 10_000,
    });
    const resumed = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', jobId: first.jobId, maxCandidates: 4, deadlineAtMs: 10_000,
    });

    expect(first).toMatchObject({ state: 'running', cursor: 4, processed: 4, approved: 2, rejected: 2, cacheHits: 2 });
    expect(resumed).toMatchObject({ state: 'ready', cursor: 8, processed: 8, approved: 6, rejected: 2, cacheHits: 2 });
    expect(first.jobId).toBe(resumed.jobId);
    expect(repository.checkpoints).toHaveLength(8);
    expect(reviewed).toHaveLength(6);
    expect(maxConcurrent).toBe(1);
  });

  it('enforces one live lease, permits stale takeover, and rejects stale revisions', () => {
    const initial = createInitialSemanticJobState({
      jobId: `tsj_${'a'.repeat(64)}`,
      poolVersion: 'tpool_test_v11',
      queueSha256: 'b'.repeat(64),
      reviewContractVersion: 'review-v1', promptSetSha256: 'a'.repeat(64),
      primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
      totalCandidates: 2,
      nowMs: 0,
    });
    const first = claimSemanticJobLease(initial, {
      jobId: initial.jobId, expectedRevision: 0, leaseToken: 'lease-a', nowMs: 0, leaseDurationMs: 100,
    });
    expect(() => claimSemanticJobLease(first, {
      jobId: initial.jobId, expectedRevision: 1, leaseToken: 'lease-b', nowMs: 99, leaseDurationMs: 100,
    })).toThrow('semantic_job_lease_busy');
    const takeover = claimSemanticJobLease(first, {
      jobId: initial.jobId, expectedRevision: 1, leaseToken: 'lease-b', nowMs: 100, leaseDurationMs: 100,
    });
    expect(takeover.lease).toMatchObject({ token: 'lease-b', expiresAtMs: 200 });
    expect(() => applySemanticJobCheckpoint(takeover, {
      jobId: initial.jobId,
      expectedRevision: 1,
      leaseToken: 'lease-a',
      nowMs: 101,
      terminal: {
        candidateId: 'job-candidate-00', contentSha256: 'c'.repeat(64), decision: 'PASS',
        source: 'review', providerAttempts: 2, transientRetries: 0, evidenceRefs: ['evidence/a'],
      },
    })).toThrow('semantic_job_revision_conflict');
  });

  it('caps transient retries at two and quarantines malformed or exhausted responses with immutable evidence refs', async () => {
    const repository = new MemoryJobRepository();
    const attempts = new Map<string, number>();
    const deps = dependencies({
      repository,
      loadCandidates: async () => [candidate(0), candidate(1)],
      reviewCandidate: async (item) => {
        const count = (attempts.get(item.candidateId) ?? 0) + 1;
        attempts.set(item.candidateId, count);
        if (item.candidateId.endsWith('00')) {
          return { kind: 'TRANSIENT_ERROR', providerAttempts: 1, evidenceRef: `evidence/transient-${count}` } as const;
        }
        return { kind: 'MALFORMED', providerAttempts: 1, evidenceRef: 'evidence/malformed' } as const;
      },
    });

    const result = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', maxCandidates: 2, deadlineAtMs: 10_000,
    });

    expect(result).toMatchObject({
      state: 'blocked', cursor: 2, processed: 2, quarantined: 2,
      providerAttempts: 4, transientRetries: 2, shortage: true,
    });
    expect(attempts.get('job-candidate-00')).toBe(3);
    expect(repository.checkpoints[0].terminal.evidenceRefs).toEqual([
      'evidence/transient-1', 'evidence/transient-2', 'evidence/transient-3',
    ]);
    expect(repository.checkpoints[1].terminal.evidenceRefs).toEqual(['evidence/malformed']);
  });

  it('persists transient retry progress across a deadline continuation so the cap cannot reset', async () => {
    const repository = new MemoryJobRepository();
    let clock = 90;
    let calls = 0;
    const deps = dependencies({
      repository,
      loadCandidates: async () => [candidate(0)],
      nowMs: () => clock,
      reviewCandidate: async () => {
        calls += 1;
        clock = calls === 1 ? 100 : 110;
        return { kind: 'TRANSIENT_ERROR', providerAttempts: 1, evidenceRef: `evidence/transient-${calls}` } as const;
      },
    });

    const first = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', maxCandidates: 1, deadlineAtMs: 100,
    });
    expect(first).toMatchObject({
      state: 'running', cursor: 0, processed: 0, providerAttempts: 1, transientRetries: 1,
    });

    clock = 101;
    const resumed = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', jobId: first.jobId, maxCandidates: 1, deadlineAtMs: 200,
    });
    expect(resumed).toMatchObject({
      state: 'blocked', cursor: 1, quarantined: 1, providerAttempts: 3, transientRetries: 2,
    });
    expect(calls).toBe(3);
    expect(repository.checkpoints[0].terminal.evidenceRefs).toEqual([
      'evidence/transient-1', 'evidence/transient-2', 'evidence/transient-3',
    ]);
  });

  it('fails closed on a one-pass PASS and marks an empty deterministic queue as shortage', async () => {
    await expect(runTournamentSemanticJobBatch(dependencies({
      loadCandidates: async () => [candidate(0)],
      reviewCandidate: async () => ({ kind: 'PASS', providerAttempts: 1, evidenceRef: 'evidence/false-pass' }),
    }), {
      poolVersion: 'tpool_test_v11', maxCandidates: 1, deadlineAtMs: 10_000,
    })).rejects.toThrow('semantic_job_review_invalid');

    const empty = await runTournamentSemanticJobBatch(dependencies({
      loadCandidates: async () => [],
    }), {
      poolVersion: 'tpool_empty_v11', maxCandidates: 1, deadlineAtMs: 10_000,
    });
    expect(empty).toMatchObject({ state: 'blocked', cursor: 0, shortage: true, continuation: false });
  });

  it('rejects semantic duplicate candidates before any cache lookup or paid review', async () => {
    const original = candidate(0);
    const semanticDuplicate = createTournamentSemanticCandidate({
      candidateId: 'job-candidate-semantic-duplicate',
      mode: original.mode,
      difficulty: original.difficulty,
      prompt: original.prompt,
      context: original.context,
      reviewSubjects: original.reviewSubjects,
      provenanceKeys: original.provenanceKeys,
    });
    expect(semanticDuplicate.semanticSignature).toBe(original.semanticSignature);
    let cacheCalls = 0;
    let reviewCalls = 0;
    await expect(runTournamentSemanticJobBatch(dependencies({
      loadCandidates: async () => [original, semanticDuplicate],
      lookupCachedTerminal: async () => { cacheCalls += 1; return null; },
      reviewCandidate: async () => {
        reviewCalls += 1;
        return { kind: 'PASS', providerAttempts: 2, evidenceRef: 'evidence/pass' } as const;
      },
    }), {
      poolVersion: 'tpool_duplicate_v11', maxCandidates: 2, deadlineAtMs: 10_000,
    })).rejects.toThrow('semantic_job_queue_invalid');
    expect(cacheCalls).toBe(0);
    expect(reviewCalls).toBe(0);
  });

  it('reconciles persisted supply before spending after a post-checkpoint crash, including an exhausted queue', async () => {
    const readyRepository = new MemoryJobRepository();
    readyRepository.throwAfterNextCheckpoint = true;
    let readyCalls = 0;
    let readyClock = 1_000;
    const readyDeps = dependencies({
      repository: readyRepository,
      nowMs: () => readyClock,
      loadCandidates: async () => [candidate(0), candidate(1)],
      reviewCandidate: async () => {
        readyCalls += 1;
        return { kind: 'PASS', providerAttempts: 2, evidenceRef: 'evidence/pass' } as const;
      },
      assessSupply: async (state) => state.progress.approved >= 1 ? 'ready' : 'continue',
    });
    await expect(runTournamentSemanticJobBatch(readyDeps, {
      poolVersion: 'tpool_crash_ready_v11', maxCandidates: 2, deadlineAtMs: 10_000, leaseDurationMs: 100,
    })).rejects.toThrow('simulated_post_checkpoint_crash');
    readyClock = 1_100;
    const readyResume = await runTournamentSemanticJobBatch(readyDeps, {
      poolVersion: 'tpool_crash_ready_v11', jobId: readyRepository.onlyState().jobId,
      maxCandidates: 2, deadlineAtMs: 10_000, leaseDurationMs: 100,
    });
    expect(readyResume).toMatchObject({ state: 'ready', cursor: 1, approved: 1 });
    expect(readyCalls).toBe(1);

    const exhaustedRepository = new MemoryJobRepository();
    exhaustedRepository.throwAfterNextCheckpoint = true;
    let rejectCalls = 0;
    let exhaustedClock = 1_000;
    const exhaustedDeps = dependencies({
      repository: exhaustedRepository,
      nowMs: () => exhaustedClock,
      loadCandidates: async () => [candidate(0)],
      reviewCandidate: async () => {
        rejectCalls += 1;
        return { kind: 'REJECT', providerAttempts: 1, evidenceRef: 'evidence/reject' } as const;
      },
    });
    await expect(runTournamentSemanticJobBatch(exhaustedDeps, {
      poolVersion: 'tpool_crash_short_v11', maxCandidates: 1, deadlineAtMs: 10_000, leaseDurationMs: 100,
    })).rejects.toThrow('simulated_post_checkpoint_crash');
    exhaustedClock = 1_100;
    const exhaustedResume = await runTournamentSemanticJobBatch(exhaustedDeps, {
      poolVersion: 'tpool_crash_short_v11', jobId: exhaustedRepository.onlyState().jobId,
      maxCandidates: 1, deadlineAtMs: 10_000, leaseDurationMs: 100,
    });
    expect(exhaustedResume).toMatchObject({ state: 'blocked', cursor: 1, rejected: 1, shortage: true });
    expect(rejectCalls).toBe(1);
  });

  it('pauses before advancing the cursor when the budget is exhausted', async () => {
    const repository = new MemoryJobRepository();
    const deps = dependencies({
      repository,
      loadCandidates: async () => [candidate(0), candidate(1)],
      reviewCandidate: async (item) => item.candidateId.endsWith('00')
        ? { kind: 'PASS', providerAttempts: 2, evidenceRef: 'evidence/pass' } as const
        : { kind: 'BUDGET_PAUSED', providerAttempts: 0, reason: 'daily_cap_exhausted' } as const,
    });

    const result = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', maxCandidates: 2, deadlineAtMs: 10_000,
    });

    expect(result).toMatchObject({ state: 'paused', cursor: 1, processed: 1, approved: 1, continuation: true });
    expect(repository.checkpoints).toHaveLength(1);
  });

  it('persists paid primary work before a budget pause and reconciles cumulative attempts on resume', async () => {
    const repository = new MemoryJobRepository();
    let calls = 0;
    const deps = dependencies({
      repository,
      loadCandidates: async () => [candidate(0)],
      reviewCandidate: async () => {
        calls += 1;
        return calls === 1
          ? { kind: 'BUDGET_PAUSED', providerAttempts: 1, providerAttemptsCumulative: true, reason: 'daily_cap_exhausted' } as const
          : { kind: 'PASS', providerAttempts: 2, providerAttemptsCumulative: true, evidenceRef: 'evidence/pass' } as const;
      },
    });
    const paused = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_paid_primary_v11', maxCandidates: 1, deadlineAtMs: 10_000,
    });
    expect(paused).toMatchObject({ state: 'paused', cursor: 0, providerAttempts: 1 });
    expect(repository.onlyState().pendingReview).toMatchObject({ providerAttempts: 1 });

    const resumed = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_paid_primary_v11', jobId: paused.jobId,
      maxCandidates: 1, deadlineAtMs: 10_000,
    });
    expect(resumed).toMatchObject({ state: 'blocked', cursor: 1, providerAttempts: 2 });
    expect(repository.checkpoints[0]).toMatchObject({ terminal: { providerAttempts: 2 } });
  });

  it('releases a durable continuation before the wall-clock deadline even below the candidate cap', async () => {
    const repository = new MemoryJobRepository();
    let clock = 90;
    const deps = dependencies({
      repository,
      loadCandidates: async () => [candidate(0), candidate(1), candidate(2)],
      nowMs: () => clock,
      reviewCandidate: async () => {
        clock = 100;
        return { kind: 'PASS', providerAttempts: 2, evidenceRef: 'evidence/pass' } as const;
      },
    });

    const result = await runTournamentSemanticJobBatch(deps, {
      poolVersion: 'tpool_test_v11', maxCandidates: 3, deadlineAtMs: 100,
    });

    expect(result).toMatchObject({ state: 'running', cursor: 1, processed: 1, continuation: true });
    expect(repository.checkpoints).toHaveLength(1);
  });
});

describe('dryRunTournamentSemanticJob', () => {
  it('reports gates, history, cache, request upper bounds and diversity without any mutable dependency', async () => {
    const invalid = { ...candidate(0), reviewSubjects: [] };
    const historical = candidate(1);
    const cachedPass = candidate(2);
    const cachedReject = candidate(3);
    const uncached = candidate(4);
    const lookedUp: string[] = [];
    const assessed: string[] = [];

    const report = await dryRunTournamentSemanticJob({
      poolVersion: 'tpool_test_v11',
      candidates: [invalid, historical, cachedPass, cachedReject, uncached],
      historicalSignatures: new Set([historical.semanticSignature]),
      lookupCachedTerminal: async (item) => {
        lookedUp.push(item.candidateId);
        if (item.candidateId === cachedPass.candidateId) return { decision: 'PASS', reference: 'receipt/pass' };
        if (item.candidateId === cachedReject.candidateId) return { decision: 'REJECT', reference: 'evidence/reject' };
        return null;
      },
      assessDiversity: async (items) => {
        assessed.push(...items.map((item) => item.candidateId));
        return { feasible: true, shortages: [] };
      },
    });

    expect(report).toEqual({
      poolVersion: 'tpool_test_v11',
      sourceCandidates: 5,
      hardGateRejections: 1,
      duplicateRejections: 0,
      historicalExclusions: 1,
      eligibleCandidates: 3,
      cachePasses: 1,
      cacheRejects: 1,
      projectedPrimaryRequests: 1,
      projectedAdversarialRequests: 1,
      transientRetryUpperBound: 4,
      diversityFeasible: true,
      diversityShortages: [],
    });
    expect(lookedUp).toEqual([cachedPass.candidateId, cachedReject.candidateId, uncached.candidateId]);
    expect(assessed).toEqual([cachedPass.candidateId, uncached.candidateId]);
    expect(Object.keys(report)).not.toEqual(expect.arrayContaining([
      'provider', 'secret', 'budget', 'repository', 'receiptStore', 'bundlePersistence',
    ]));
  });
});
