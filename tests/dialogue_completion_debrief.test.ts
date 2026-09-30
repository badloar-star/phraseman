import {
  buildDialogueCompletionFallback,
  dialogueCompletionFeedbackMode,
  isCompletionReviewUsable,
} from '../app/dialogue_completion_debrief';

describe('buildDialogueCompletionFallback', () => {
  it('always returns an honest completion debrief anchored to learner messages', () => {
    const debrief = buildDialogueCompletionFallback({
      lang: 'en',
      learnerTurns: [
        'Could we make it seven instead?',
        'Yes, that works for me.',
      ],
    });

    expect(debrief.fallback).toBe(true);
    expect(debrief.assessment).toContain('2 messages');
    expect(debrief.evidence.map((item) => item.learnerTurn)).toEqual([
      'Could we make it seven instead?',
      'Yes, that works for me.',
    ]);
    expect(debrief.praise).toContain('could not be generated');
    expect(debrief.tip).toContain('transcript');
  });

  it('accepts a generated assessment only when it carries at least one evidence item', () => {
    expect(isCompletionReviewUsable({ assessment: 'I understood you.', evidence: [] })).toBe(false);
    expect(isCompletionReviewUsable({ assessment: 'I understood you.' })).toBe(false);
    expect(isCompletionReviewUsable({
      assessment: 'I understood you.',
      evidence: [{ learnerTurn: 'Hello.', note: 'You greeted me.' }],
    })).toBe(true);
  });

  it('does not turn a zero-turn fallback into a positive language assessment', () => {
    const zeroTurnFallback = buildDialogueCompletionFallback({ lang: 'en', learnerTurns: [] });

    expect(dialogueCompletionFeedbackMode(zeroTurnFallback)).toBe('needs_learner_turn');
    expect(dialogueCompletionFeedbackMode({
      fallback: true,
      evidence: [{ learnerTurn: 'Hello.', note: 'A greeting.' }],
      corrections: [],
      phrases: [],
    })).toBe('review_unavailable');
  });
});
