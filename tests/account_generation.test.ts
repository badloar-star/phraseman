import {
  __resetAccountGenerationForTests,
  captureAccountGeneration,
  ensureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
} from '../app/account_generation';

describe('account generation lifecycle', () => {
  beforeEach(() => __resetAccountGenerationForTests());

  it('activates once for repeated reads of the same stable id', () => {
    const first = ensureAccountGeneration('stable-a');
    const second = ensureAccountGeneration('stable-a');
    expect(second).toEqual(first);
    expect(isCurrentAccountGeneration(first, 'stable-a')).toBe(true);
  });

  it('increments when the active stable id changes', () => {
    const first = ensureAccountGeneration('stable-a');
    const second = ensureAccountGeneration('stable-b');
    expect(second.generation).toBe(first.generation + 1);
    expect(isCurrentAccountGeneration(first)).toBe(false);
    expect(isCurrentAccountGeneration(second, 'stable-b')).toBe(true);
  });

  it('invalidates immediately and reactivates from transitioning', () => {
    const first = ensureAccountGeneration('stable-a');
    const invalid = invalidateAccountGeneration();
    expect(invalid.phase).toBe('transitioning');
    expect(isCurrentAccountGeneration(first)).toBe(false);
    const next = ensureAccountGeneration('stable-a');
    expect(next.phase).toBe('active');
    expect(next.generation).toBe(invalid.generation + 1);
  });

  it('normalizes blank ids to the anonymous null identity', () => {
    const token = ensureAccountGeneration('   ');
    expect(token).toEqual({ generation: 1, stableId: null, phase: 'active' });
    expect(captureAccountGeneration()).toEqual(token);
  });
});
