import { acquireStageLease, canCommitStageLease } from './stage_lease';

describe('content stage generation lease', () => {
  it('acquires a fresh lease and increments the attempt', () => {
    expect(acquireStageLease({ state: 'queued', attempts: 0 }, { nowMs: 1000, leaseMs: 60000, leaseToken: 'token-1' })).toEqual({ action: 'run', attempt: 1, leaseToken: 'token-1', leaseExpiresAtMs: 61000 });
  });

  it('blocks a live lease and recovers an expired running lease', () => {
    expect(acquireStageLease({ state: 'running', attempts: 1, leaseToken: 'old', leaseExpiresAtMs: 2000 }, { nowMs: 1500, leaseMs: 60000, leaseToken: 'new' })).toEqual({ action: 'busy' });
    expect(acquireStageLease({ state: 'running', attempts: 1, leaseToken: 'old', leaseExpiresAtMs: 1000 }, { nowMs: 1500, leaseMs: 60000, leaseToken: 'new' })).toEqual({ action: 'run', attempt: 2, leaseToken: 'new', leaseExpiresAtMs: 61500 });
  });

  it('prevents late completion after pause, cancel or a newer attempt', () => {
    expect(canCommitStageLease({ state: 'paused', attempts: 1, leaseToken: 'token-1' }, { attempt: 1, leaseToken: 'token-1' })).toBe(false);
    expect(canCommitStageLease({ state: 'cancelled', attempts: 1, leaseToken: 'token-1' }, { attempt: 1, leaseToken: 'token-1' })).toBe(false);
    expect(canCommitStageLease({ state: 'running', attempts: 2, leaseToken: 'token-2' }, { attempt: 1, leaseToken: 'token-1' })).toBe(false);
    expect(canCommitStageLease({ state: 'running', attempts: 2, leaseToken: 'token-2' }, { attempt: 2, leaseToken: 'token-2' })).toBe(true);
  });
});
