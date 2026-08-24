import {
  allocateSemanticAttemptOrdinals,
  createReservedSemanticAttempt,
  resumeSemanticAttempt,
  transitionSemanticAttempt,
} from './tournament_semantic_attempt_store';

describe('tournament semantic attempt state machine', () => {
  it('allocates one globally monotonic job ordinal while retaining a per-pass spend count', () => {
    expect(allocateSemanticAttemptOrdinals({ globalOrdinal: 41, passOrdinal: 7 })).toEqual({
      ordinal: 42, passOrdinal: 8,
    });
    expect(allocateSemanticAttemptOrdinals({ globalOrdinal: 42, passOrdinal: 0 })).toEqual({
      ordinal: 43, passOrdinal: 1,
    });
  });

  it('fences calling, returned, and recorded transitions by lease token', () => {
    const reserved = createReservedSemanticAttempt({
      jobId: 'job-a', candidateId: 'candidate-a', pass: 'primary', ordinal: 1, passOrdinal: 1,
      leaseToken: 'lease-a', nowMs: 1,
    });
    const calling = transitionSemanticAttempt(reserved, {
      kind: 'calling', leaseToken: 'lease-a', nowMs: 2,
    });
    expect(() => transitionSemanticAttempt(calling, {
      kind: 'returned', leaseToken: 'stale', nowMs: 3,
      responseHash: 'a'.repeat(64), structuredResult: { verdict: 'PASS' }, inputTokens: 1, outputTokens: 1,
    })).toThrow('semantic_attempt_stale_lease');
    const returned = transitionSemanticAttempt(calling, {
      kind: 'returned', leaseToken: 'lease-a', nowMs: 3,
      responseHash: 'a'.repeat(64), structuredResult: { verdict: 'PASS' }, inputTokens: 1, outputTokens: 1,
    });
    expect(resumeSemanticAttempt(returned, 'lease-a')).toEqual({ action: 'reuse_returned', attempt: returned });
    const recorded = transitionSemanticAttempt(returned, {
      kind: 'recorded', leaseToken: 'lease-a', nowMs: 4,
    });
    expect(resumeSemanticAttempt(recorded, 'lease-a')).toEqual({ action: 'already_recorded', attempt: recorded });
  });

  it('never reuses an unknown calling outcome and counts it toward retries', () => {
    const calling = transitionSemanticAttempt(createReservedSemanticAttempt({
      jobId: 'job-a', candidateId: 'candidate-a', pass: 'adversarial', ordinal: 2, passOrdinal: 1,
      leaseToken: 'lease-a', nowMs: 1,
    }), { kind: 'calling', leaseToken: 'lease-a', nowMs: 2 });
    expect(resumeSemanticAttempt(calling, 'lease-b')).toEqual({
      action: 'allocate_new', consumedAttempts: 1, abandonAttemptId: calling.internalAttemptId,
    });
    expect(() => transitionSemanticAttempt(calling, {
      kind: 'calling', leaseToken: 'lease-a', nowMs: 3,
    })).toThrow('semantic_attempt_transition_invalid');
  });

  it('binds attempt identities to the job so UTC-day rollover cannot collide', () => {
    const first = createReservedSemanticAttempt({
      jobId: 'job-a', candidateId: 'candidate-a', pass: 'primary', ordinal: 1,
      passOrdinal: 1, leaseToken: 'lease-a', nowMs: 1,
    });
    const otherJob = createReservedSemanticAttempt({
      jobId: 'job-b', candidateId: 'candidate-a', pass: 'primary', ordinal: 1,
      passOrdinal: 1, leaseToken: 'lease-b', nowMs: 2,
    });
    expect(first.jobId).toBe('job-a');
    expect(otherJob.internalAttemptId).not.toBe(first.internalAttemptId);
  });
});
