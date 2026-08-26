import { makeFeedbackAttemptId } from '../app/feedback_attempt_identity';

describe('makeFeedbackAttemptId', () => {
  it('creates distinct attempt ids for separate attempts', () => {
    const first = makeFeedbackAttemptId({ now: () => 1_700_000_000_000, random: () => 0.111111 });
    const second = makeFeedbackAttemptId({ now: () => 1_700_000_000_000, random: () => 0.222222 });

    expect(first).not.toBe(second);
  });

  it('uses injected clock and randomness to make an attempt id deterministic', () => {
    expect(makeFeedbackAttemptId({ now: () => 42, random: () => 0.5 })).toBe('a16-500000');
  });
});
