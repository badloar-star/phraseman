import {
  normalizedComparisonWords,
  scorePronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_core';

describe('personal plan pronunciation compound numbers', () => {
  it('treats recognizer digits as the same spoken compound number', () => {
    expect(normalizedComparisonWords('78')).toEqual(['seventy', 'ate']);

    const result = scorePronunciationTranscript({
      targetText: 'My grandmother is seventy-eight years old.',
      transcript: 'My grandmother is 78 years old.',
    });

    expect(result.passed).toBe(true);
    expect(result.normalizedTranscript).toBe('my grandmother is seventy ate years old');
  });
});
