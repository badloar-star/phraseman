import { feedbackEntryDocId, sanitizeFeedbackRating, FEEDBACK_KINDS } from './feedback_entries';

describe('sanitizeFeedbackRating', () => {
  it('accepts 1-5', () => {
    expect(sanitizeFeedbackRating(1)).toBe(1);
    expect(sanitizeFeedbackRating(3)).toBe(3);
    expect(sanitizeFeedbackRating(5)).toBe(5);
  });

  it('rounds fractional values', () => {
    expect(sanitizeFeedbackRating(4.6)).toBe(5);
    expect(sanitizeFeedbackRating(3.2)).toBe(3);
  });

  it('rejects out-of-range and garbage as "no rating" (0)', () => {
    expect(sanitizeFeedbackRating(0)).toBe(0);
    expect(sanitizeFeedbackRating(6)).toBe(0);
    expect(sanitizeFeedbackRating(-1)).toBe(0);
    expect(sanitizeFeedbackRating('five')).toBe(0);
    expect(sanitizeFeedbackRating(null)).toBe(0);
    expect(sanitizeFeedbackRating(undefined)).toBe(0);
    expect(sanitizeFeedbackRating(NaN)).toBe(0);
  });
});

describe('feedbackEntryDocId', () => {
  it('is deterministic for the same uid+kind+entityId — one feedback per attempt', () => {
    const a = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    const b = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    expect(a).toBe(b);
  });

  it('differs across kinds for the same user+entity — sections never collide', () => {
    const lesson = feedbackEntryDocId('uid123', 'lesson', 'shared-id');
    const vocab = feedbackEntryDocId('uid123', 'vocab', 'shared-id');
    expect(lesson).not.toBe(vocab);
  });

  it('differs across entities of the same kind', () => {
    const a = feedbackEntryDocId('uid123', 'lesson', 'es:5');
    const b = feedbackEntryDocId('uid123', 'lesson', 'es:6');
    expect(a).not.toBe(b);
  });

  it('strips characters unsafe for a Firestore doc id', () => {
    const id = feedbackEntryDocId('uid/with:slash', 'dialogue', 'scenario/with:colon');
    expect(id).not.toMatch(/[/:]/);
  });
});

describe('FEEDBACK_KINDS', () => {
  it('covers every screen the owner asked for (lesson/vocab/dialogue/arena_blitz/arena_rating)', () => {
    expect([...FEEDBACK_KINDS].sort()).toEqual(
      ['arena_blitz', 'arena_rating', 'dialogue', 'lesson', 'vocab'].sort(),
    );
  });
});
